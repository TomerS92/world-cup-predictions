import { NextResponse } from "next/server";
import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, query, where, getDocs,
  doc, updateDoc, getDoc, increment, serverTimestamp, setDoc,
} from "firebase/firestore";
import { getEspnScoreboardUrl } from "@/lib/config";
import { getBonusQuestion, detectBonusAnswer, ESPNDetail } from "@/lib/bonusQuestions";
import { getRegulationScore } from "@/lib/espnUtils";

// ─── Firebase client init (server-side) ──────────────────────────────────────
function getDb() {
  const cfg = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app = getApps().find((a) => a.name === "sync") ?? initializeApp(cfg, "sync");
  return getFirestore(app);
}

const THROTTLE_MINUTES = 20;

export async function GET() {
  const db = getDb();

  // ── Throttle ────────────────────────────────────────────────────────────────
  const metaRef = doc(db, "_meta", "syncStatus");
  const metaSnap = await getDoc(metaRef);
  if (metaSnap.exists()) {
    const lastMs = metaSnap.data()?.lastSynced?.toMillis?.();
    if (lastMs && (Date.now() - lastMs) / 60000 < THROTTLE_MINUTES) {
      const mins = Math.round((Date.now() - lastMs) / 60000);
      return NextResponse.json({ skipped: true, message: `Last sync ${mins}m ago` });
    }
  }

  // ── Fetch ESPN scoreboard ────────────────────────────────────────────────────
  const espnRes = await fetch(getEspnScoreboardUrl(), { cache: "no-store" });
  if (!espnRes.ok) return NextResponse.json({ error: "ESPN error" }, { status: 502 });
  const data = await espnRes.json();
  if (!data?.events) return NextResponse.json({ error: "No events" }, { status: 502 });

  const completed = data.events.filter((e: any) => e.status?.type?.completed === true);
  let totalProcessed = 0;
  const processedUsers = new Set<string>(); // track who got scored this run

  for (const match of completed) {
    const matchId: string     = match.id;
    const comp                = match.competitions[0];
    const homeComp            = comp.competitors.find((c: any) => c.homeAway === "home");
    const awayComp            = comp.competitors.find((c: any) => c.homeAway === "away");
    const fullHome            = parseInt(homeComp.score, 10);
    const fullAway            = parseInt(awayComp.score, 10);
    const statusDesc          = match.status?.type?.description ?? "";
    const regResult           = await getRegulationScore(matchId, statusDesc, fullHome, fullAway);
    const realHome            = regResult.homeScore;
    const realAway            = regResult.awayScore;
    const details: ESPNDetail[] = comp.details ?? [];
    const homeTeamName: string = homeComp.team?.displayName ?? "";
    const awayTeamName: string = awayComp.team?.displayName ?? "";

    // Detect bonus question answer for this match
    const bonusQ      = getBonusQuestion(matchId, homeTeamName, awayTeamName);
    const bonusAnswer = detectBonusAnswer(bonusQ, realHome, realAway, details);

    // ── Score each prediction ─────────────────────────────────────────────────
    const predsSnap = await getDocs(
      query(collection(db, "Predictions"), where("matchId", "==", matchId))
    );

    for (const predDoc of predsSnap.docs) {
      const pred = predDoc.data();

      // Re-score if: match went to ET/penalties AND the stored score is the full score (not regulation)
      const needsRescoring =
        regResult.extraTime &&
        pred.pointsEarned !== undefined &&
        (pred.realHomeScore !== realHome || pred.realAwayScore !== realAway);

      // Skip already-scored predictions unless they need re-scoring for regulation
      if (!needsRescoring && pred.pointsEarned !== undefined && pred.bonusPointsEarned !== undefined) continue;

      let needsUpdate = false;
      const updates: Record<string, any> = {};

      // ── Main prediction scoring (fresh) or re-scoring (ET correction) ───────
      if (pred.pointsEarned === undefined || needsRescoring) {
        const g1 = pred.predictedHomeScore as number;
        const g2 = pred.predictedAwayScore as number;
        let base = 0, extra = 0;
        const parts: string[] = [];

        const isBull = g1 === realHome && g2 === realAway;
        const isDiff = g1 - g2 === realHome - realAway;
        const isDir  =
          (g1 > g2 && realHome > realAway) ||
          (g1 < g2 && realHome < realAway) ||
          (g1 === g2 && realHome === realAway);

        if (isBull)       { base = 6; parts.push("תוצאה מדויקת (6 נק׳)"); }
        else if (isDiff)  { base = 3; parts.push("הפרש מדויק (3 נק׳)"); }
        else if (isDir)   { base = 2; parts.push("ניחשת את המנצח (2 נק׳)"); }

        if (!isBull) {
          if (g1 === realHome || g2 === realAway) { extra += 1; parts.push("פגיעה בשערי קבוצה (+1)"); }
        }

        let total = base + extra;
        if (pred.isJoker) total *= 2;

        const breakdown = parts.join(" | ") + (pred.isJoker ? " × ג׳וקר" : "");
        updates.pointsEarned    = total;
        updates.pointsBreakdown = breakdown;
        updates.realHomeScore   = realHome;
        updates.realAwayScore   = realAway;
        if (regResult.extraTime) {
          updates.fullFinalHomeScore = regResult.fullHomeScore;
          updates.fullFinalAwayScore = regResult.fullAwayScore;
          updates.extraTime  = true;
          updates.penalties  = regResult.penalties;
        }
        needsUpdate = true;

        const userRef = doc(db, "Users", pred.userId);
        if (needsRescoring) {
          // Apply delta to avoid double-counting
          const delta = total - (pred.pointsEarned as number);
          if (delta !== 0) await updateDoc(userRef, { totalPoints: increment(delta) });
        } else {
          await updateDoc(userRef, { totalPoints: increment(total) });
        }
      }

      // ── Bonus question scoring ──────────────────────────────────────────────
      if (pred.bonusPointsEarned === undefined && pred.bonusAnswer !== undefined && pred.bonusAnswer !== null) {
        if (bonusAnswer !== null) {
          const correct = pred.bonusAnswer === bonusAnswer;
          const bonusPts = correct ? 1 : 0;
          updates.bonusPointsEarned  = bonusPts;
          updates.bonusCorrectAnswer = bonusAnswer;
          updates.bonusDetectionNote = "auto";
          needsUpdate = true;

          if (bonusPts > 0) {
            const userRef2 = doc(db, "Users", pred.userId);
            await updateDoc(userRef2, { totalPoints: increment(bonusPts) });
          }
        } else {
          // ESPN details unavailable — mark as undetectable, no points
          updates.bonusPointsEarned  = 0;
          updates.bonusCorrectAnswer = null;
          updates.bonusDetectionNote = "undetectable";
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await updateDoc(predDoc.ref, updates);
        processedUsers.add(pred.userId);
        totalProcessed++;
      }
    }
  }

  // ── Update streaks for all scored users ──────────────────────────────────
  for (const userId of processedUsers) {
    try {
      // Get all their predictions to find unique match dates
      const allPreds = await getDocs(
        query(collection(db, "Predictions"), where("userId", "==", userId))
      );
      // Unique dates sorted descending (YYYY-MM-DD sorts lexicographically)
      const dates = [...new Set<string>(
        allPreds.docs.map((d) => d.data().matchDate as string).filter(Boolean)
      )].sort().reverse();

      if (dates.length === 0) continue;

      // Count consecutive days from the most recent
      let streak = 1;
      for (let i = 0; i < dates.length - 1; i++) {
        const curr = new Date(dates[i]);
        const prev = new Date(dates[i + 1]);
        const diffDays = Math.round(
          (curr.getTime() - prev.getTime()) / 86400000
        );
        if (diffDays === 1) streak++;
        else break;
      }

      await updateDoc(doc(db, "Users", userId), {
        currentStreak: streak,
        lastPredictionDate: dates[0],
      });
    } catch { /* non-critical */ }
  }

  // ── Update sync timestamp ────────────────────────────────────────────────
  await setDoc(metaRef, { lastSynced: serverTimestamp() }, { merge: true });

  return NextResponse.json({ success: true, processed: totalProcessed });
}
