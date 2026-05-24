import { NextResponse } from "next/server";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore, collection, query, where, getDocs,
  doc, updateDoc, getDoc, increment, serverTimestamp, setDoc,
} from "firebase/firestore";
import { getEspnScoreboardUrl } from "@/lib/config";

// ─── Firebase client init (server-side) ──────────────────────────────────────
function getDb() {
  const firebaseConfig = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app = getApps().find((a) => a.name === "sync") ?? initializeApp(firebaseConfig, "sync");
  return getFirestore(app);
}

// ─── Throttle: max once every 20 minutes ─────────────────────────────────────
const THROTTLE_MINUTES = 20;

export async function GET() {
  const db = getDb();

  // Check throttle
  const metaRef = doc(db, "_meta", "syncStatus");
  const metaSnap = await getDoc(metaRef);
  if (metaSnap.exists()) {
    const lastSynced = metaSnap.data()?.lastSynced?.toMillis?.();
    if (lastSynced) {
      const minutesSince = (Date.now() - lastSynced) / 1000 / 60;
      if (minutesSince < THROTTLE_MINUTES) {
        return NextResponse.json({
          skipped: true,
          message: `Last sync ${Math.round(minutesSince)}m ago — next in ${Math.round(THROTTLE_MINUTES - minutesSince)}m`,
        });
      }
    }
  }

  // Fetch ESPN data
  const espnRes = await fetch(getEspnScoreboardUrl(), { cache: "no-store" });
  if (!espnRes.ok) {
    return NextResponse.json({ error: "ESPN API error" }, { status: 502 });
  }
  const data = await espnRes.json();
  if (!data?.events) {
    return NextResponse.json({ error: "No events" }, { status: 502 });
  }

  const completedMatches = data.events.filter(
    (e: any) => e.status?.type?.completed === true
  );

  let totalProcessed = 0;

  for (const match of completedMatches) {
    const matchId: string = match.id;
    const comp = match.competitions[0];
    const homeTeam = comp.competitors.find((c: any) => c.homeAway === "home");
    const awayTeam = comp.competitors.find((c: any) => c.homeAway === "away");
    const realHomeScore = parseInt(homeTeam.score, 10);
    const realAwayScore = parseInt(awayTeam.score, 10);

    const predictionsSnap = await getDocs(
      query(collection(db, "Predictions"), where("matchId", "==", matchId))
    );

    for (const predDoc of predictionsSnap.docs) {
      const pred = predDoc.data();
      if (pred.pointsEarned !== undefined) continue;

      const g1 = pred.predictedHomeScore;
      const g2 = pred.predictedAwayScore;
      let base = 0, extra = 0;
      const parts: string[] = [];

      const isBull = g1 === realHomeScore && g2 === realAwayScore;
      const isDiff = g1 - g2 === realHomeScore - realAwayScore;
      const isDir  = (g1 > g2 && realHomeScore > realAwayScore) ||
                     (g1 < g2 && realHomeScore < realAwayScore) ||
                     (g1 === g2 && realHomeScore === realAwayScore);

      if (isBull) { base = 5; parts.push("תוצאה מדויקת (5 נק׳)"); }
      else if (isDiff) { base = 3; parts.push("הפרש מדויק (3 נק׳)"); }
      else if (isDir)  { base = 1; parts.push("כיוון נכון (1 נק׳)"); }

      if (!isBull) {
        if (g1 === realHomeScore || g2 === realAwayScore) { extra += 1; parts.push("פגיעה בשערי קבוצה (+1)"); }
        if (g1 + g2 === realHomeScore + realAwayScore)    { extra += 1; parts.push("סך שערים (+1)"); }
      }

      let total = base + extra;
      let breakdown = parts.length ? parts.join(" + ") : "אין נקודות";
      if (pred.isJoker) { total *= 2; breakdown = `🃏 ג'וקר: (${breakdown}) ×2`; }

      await updateDoc(predDoc.ref, {
        pointsEarned: total, pointsBreakdown: breakdown,
        realHomeScore, realAwayScore,
      });

      const userRef = doc(db, "Users", pred.userId);
      const userSnap = await getDoc(userRef);
      let streak = userSnap.exists() ? (userSnap.data()?.currentStreak ?? 0) : 0;
      if (base > 0) streak += 1; else streak = 0;
      await updateDoc(userRef, { totalPoints: increment(total), currentStreak: streak });
      totalProcessed++;
    }
  }

  // Update last-sync timestamp
  await setDoc(metaRef, { lastSynced: serverTimestamp() }, { merge: true });

  return NextResponse.json({
    success: true,
    completedMatches: completedMatches.length,
    predictionsProcessed: totalProcessed,
  });
}
