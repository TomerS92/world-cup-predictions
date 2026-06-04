"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, query, where, getDocs, doc, updateDoc, increment, getDoc,
  deleteDoc, writeBatch,
} from "firebase/firestore";
import { getEspnScoreboardUrl, activeConfig } from "@/lib/config";

export default function AdminPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const addLog = (msg: string) => setSyncLogs((prev) => [msg, ...prev]);

  const handleReset = async () => {
    if (!resetConfirm) { setResetConfirm(true); return; }
    setResetConfirm(false);
    setIsResetting(true);
    setSyncLogs([]);
    addLog("מוחק את כל הניחושים...");
    try {
      const predsSnap = await getDocs(collection(db, "Predictions"));
      let batch = writeBatch(db);
      let count = 0;
      for (const d of predsSnap.docs) {
        batch.delete(d.ref);
        count++;
        if (count % 500 === 0) { await batch.commit(); batch = writeBatch(db); }
      }
      if (count % 500 !== 0) await batch.commit();
      addLog(`נמחקו ${count} ניחושים.`);

      addLog("מאפס נקודות ורצפים לכל המשתמשים...");
      const usersSnap = await getDocs(collection(db, "Users"));
      let batch2 = writeBatch(db);
      let ucount = 0;
      for (const u of usersSnap.docs) {
        batch2.update(u.ref, { totalPoints: 0, currentStreak: 0, lastPredictionDate: null });
        ucount++;
        if (ucount % 500 === 0) { await batch2.commit(); batch2 = writeBatch(db); }
      }
      if (ucount % 500 !== 0) await batch2.commit();
      addLog(`אופסו ${ucount} משתמשים.`);

      const metaRef = doc(db, "_meta", "syncStatus");
      await deleteDoc(metaRef).catch(() => null);
      addLog("✅ איפוס הושלם! כל הנתונים נמחקו.");
    } catch (err: any) {
      addLog(`❌ שגיאה: ${err.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setDone(false);
    setSyncLogs([]);
    addLog(`מתחבר לשרתי ESPN — ${activeConfig.label}...`);

    try {
      const response = await fetch(getEspnScoreboardUrl(), { cache: "no-store" });
      const data = await response.json();

      if (!data?.events) { addLog("❌ לא נמצאו נתונים בשרת."); return; }

      const completed = data.events.filter((e: any) => e.status?.type?.completed === true);
      addLog(`נמצאו ${completed.length} משחקים שהסתיימו.`);

      let totalProcessed = 0;

      for (const match of completed) {
        const matchId = match.id;
        const comp = match.competitions[0];
        const home = comp.competitors.find((c: any) => c.homeAway === "home");
        const away = comp.competitors.find((c: any) => c.homeAway === "away");
        const realHomeScore = parseInt(home.score, 10);
        const realAwayScore = parseInt(away.score, 10);

        const predictionsSnap = await getDocs(
          query(collection(db, "Predictions"), where("matchId", "==", matchId))
        );

        for (const predictionDoc of predictionsSnap.docs) {
          const d = predictionDoc.data();
          if (d.pointsEarned !== undefined) continue;

          const guessedHome = d.predictedHomeScore;
          const guessedAway = d.predictedAwayScore;
          let basePoints = 0, extraPoints = 0;
          const parts: string[] = [];

          const isBullseye = guessedHome === realHomeScore && guessedAway === realAwayScore;
          const isDiff = guessedHome - guessedAway === realHomeScore - realAwayScore;
          const isDir = (guessedHome > guessedAway && realHomeScore > realAwayScore) ||
            (guessedHome < guessedAway && realHomeScore < realAwayScore) ||
            (guessedHome === guessedAway && realHomeScore === realAwayScore);

          if (isBullseye) { basePoints = 5; parts.push("תוצאה מדויקת (5 נק׳)"); }
          else if (isDiff) { basePoints = 3; parts.push("הפרש מדויק (3 נק׳)"); }
          else if (isDir)  { basePoints = 1; parts.push("כיוון נכון (1 נק׳)"); }

          if (!isBullseye) {
            if (guessedHome === realHomeScore || guessedAway === realAwayScore) {
              extraPoints += 1; parts.push("פגיעה בשערי קבוצה (+1)");
            }
            if (guessedHome + guessedAway === realHomeScore + realAwayScore) {
              extraPoints += 1; parts.push("סך שערים מדויק (+1)");
            }
          }

          let totalEarned = basePoints + extraPoints;
          let breakdown = parts.length > 0 ? parts.join(" + ") : "אין נקודות";

          if (d.isJoker) {
            totalEarned *= 2;
            breakdown = `🃏 ג'וקר: (${breakdown}) x2`;
          }

          await updateDoc(predictionDoc.ref, {
            pointsEarned: totalEarned, pointsBreakdown: breakdown,
            realHomeScore, realAwayScore,
          });

          const userRef = doc(db, "Users", d.userId);
          const userSnap = await getDoc(userRef);
          let streak = userSnap.exists() ? (userSnap.data().currentStreak ?? 0) : 0;
          if (basePoints > 0) streak += 1; else streak = 0;

          await updateDoc(userRef, { totalPoints: increment(totalEarned), currentStreak: streak });
          totalProcessed++;
        }
      }

      addLog(`✅ הסתיים! ${totalProcessed} ניחושים עודכנו.`);
      setDone(true);
    } catch (err: any) {
      addLog(`❌ שגיאה: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060A10] text-slate-100 flex items-center justify-center p-4" dir="rtl">
      <div className="fixed inset-0 pitch-grid pointer-events-none opacity-60" aria-hidden />

      <div className="relative w-full max-w-lg space-y-4">
        {/* Header card */}
        <div className="bg-[#0E1520]/90 border border-white/6 rounded-2xl p-6 shadow-xl text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/20 mb-4">
            <span className="text-2xl">🤖</span>
          </div>
          <h1 className="text-xl font-black text-white mb-1">מרכז הבקרה</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            משיכת תוצאות, חישוב ניקוד ועדכון ניחושי כל השחקנים — בלחיצה אחת.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 px-3 py-1.5 rounded-full">
            {activeConfig.icon} {activeConfig.label} — סנכרון ידני
          </div>
        </div>

        {/* Sync button + logs */}
        <div className="bg-[#0E1520]/90 border border-white/6 rounded-2xl p-5 shadow-xl space-y-4">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`w-full h-14 rounded-xl text-base font-black transition-all duration-200 ${
              isSyncing
                ? "bg-blue-600/40 text-blue-300 cursor-wait"
                : done
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            }`}
          >
            {isSyncing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-blue-300/40 border-t-blue-300 rounded-full animate-spin" />
                סורק ומחשב נתונים...
              </span>
            ) : done ? "✅ סנכרון הושלם! לחץ שוב לבדיקה" : "הפעל סנכרון תוצאות"}
          </button>

          {/* Log console */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-4 min-h-[140px] max-h-[280px] overflow-y-auto font-mono text-xs space-y-1.5">
            {syncLogs.length === 0 ? (
              <p className="text-slate-700 text-center mt-8">ממתין לפקודת סנכרון...</p>
            ) : (
              syncLogs.map((log, i) => (
                <p
                  key={i}
                  className={`${
                    log.includes("✅") ? "text-emerald-400" :
                    log.includes("❌") ? "text-red-400" :
                    "text-slate-400"
                  }`}
                >
                  {">"} {log}
                </p>
              ))
            )}
          </div>
        </div>

        {/* Reset data */}
        <div className="bg-[#0E1520]/90 border border-red-500/15 rounded-2xl p-5 shadow-xl space-y-3">
          <p className="text-xs font-bold text-red-400/80 text-center">
            ⚠️ איפוס נתונים — מוחק את כל הניחושים ומאפס נקודות לכולם
          </p>
          <button
            onClick={handleReset}
            disabled={isResetting}
            className={`w-full h-12 rounded-xl text-sm font-black transition-all duration-200 ${
              isResetting
                ? "bg-red-700/30 text-red-400 cursor-wait"
                : resetConfirm
                ? "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 animate-pulse"
                : "bg-red-900/40 hover:bg-red-800/50 text-red-400 border border-red-500/20"
            }`}
          >
            {isResetting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" />
                מוחק נתונים...
              </span>
            ) : resetConfirm ? "⚠️ לחץ שוב לאישור סופי — פעולה בלתי הפיכה!" : "מחק את כל הנתונים"}
          </button>
        </div>

        {/* Info note */}
        <p className="text-center text-xs text-slate-700 px-4">
          💡 הסנכרון האוטומטי מופעל גם ברקע כשמשתמשים פותחים את האפליקציה
        </p>
      </div>
    </div>
  );
}
