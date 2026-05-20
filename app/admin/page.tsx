"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, increment, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AdminPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setSyncLogs(prev => [msg, ...prev]);
  };

  const handleAutoSyncAll = async () => {
    setIsSyncing(true);
    setSyncLogs([]);
    addLog("מתחבר לשרתי ESPN למשיכת נתונים בזמן אמת...");

    try {
      const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20260519-20260620");
      const data = await response.json();

      if (!data || !data.events) {
        addLog("❌ לא נמצאו נתונים בשרת.");
        setIsSyncing(false);
        return;
      }

      const completedMatches = data.events.filter((event: any) => event.status.type.completed === true);
      addLog(`נמצאו ${completedMatches.length} משחקים שהסתיימו. מתחיל חישוב...`);

      let totalPredictionsProcessed = 0;

      for (const match of completedMatches) {
        const matchId = match.id;
        const competition = match.competitions[0];
        const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
        const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');
        
        const realHomeScore = parseInt(homeTeam.score);
        const realAwayScore = parseInt(awayTeam.score);

        const predictionsRef = collection(db, "Predictions");
        const q = query(predictionsRef, where("matchId", "==", matchId));
        const querySnapshot = await getDocs(q);

        for (const predictionDoc of querySnapshot.docs()) {
          const predData = predictionDoc.data();
          
          if (predData.pointsEarned !== undefined) {
            continue; 
          }

          let basePoints = 0;
          let extraPoints = 0;
          
          const guessedHome = predData.predictedHomeScore;
          const guessedAway = predData.predictedAwayScore;

          const isBullseye = (guessedHome === realHomeScore && guessedAway === realAwayScore);
          const isDiffMatch = (guessedHome - guessedAway === realHomeScore - realAwayScore);
          const isDirectionMatch = (
            (guessedHome > guessedAway && realHomeScore > realAwayScore) ||
            (guessedHome < guessedAway && realHomeScore < realAwayScore) ||
            (guessedHome === guessedAway && realHomeScore === realAwayScore)
          );

          if (isBullseye) {
            basePoints = 5;
          } else {
            if (isDiffMatch) basePoints = 3;
            else if (isDirectionMatch) basePoints = 1;

            if (guessedHome === realHomeScore || guessedAway === realAwayScore) extraPoints += 1;
            if (guessedHome + guessedAway === realHomeScore + realAwayScore) extraPoints += 1;
          }

          let totalEarned = basePoints + extraPoints;
          if (predData.isJoker) totalEarned *= 2;

          await updateDoc(predictionDoc.ref, {
            pointsEarned: totalEarned
          });

          const userRef = doc(db, "Users", predData.userId);
          const userSnap = await getDoc(userRef);
          
          let currentStreak = userSnap.exists() ? (userSnap.data().currentStreak || 0) : 0;
          if (basePoints > 0) currentStreak += 1;
          else currentStreak = 0;

          await updateDoc(userRef, {
            totalPoints: increment(totalEarned),
            currentStreak: currentStreak
          });

          totalPredictionsProcessed++;
        }
      }

      addLog(`✅ סנכרון הושלם! ${totalPredictionsProcessed} ניחושים עודכנו בהצלחה.`);
      
    } catch (error: any) {
      console.error("Auto Sync Error:", error);
      addLog(`❌ שגיאה: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 flex flex-col items-center justify-center gap-8" dir="rtl">
      
      <Card className="w-full max-w-xl shadow-2xl border-0 bg-slate-800 text-white border-t-4 border-t-blue-500">
        <CardHeader className="border-b border-slate-700 pb-6">
          <CardTitle className="text-3xl font-black text-center text-blue-400">
            מרכז הבקרה האוטומטי 🤖
          </CardTitle>
          <CardDescription className="text-center text-slate-300 mt-3 text-base">
            לחיצה אחת תמשוך את כל תוצאות הסיום משרתי הספורט, ותחשב ניקוד בסיס, הפרשים, בונוסי שערים וג'וקרים בצורה אוטומטית לחלוטין.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 flex flex-col items-center gap-6">
          
          <Button 
            className="w-full md:w-3/4 rounded-3xl h-20 text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.5)] active:scale-95 transition-all" 
            onClick={handleAutoSyncAll}
            disabled={isSyncing}
          >
            {isSyncing ? "סורק, מחשב ומעדכן נתונים..." : "הפעל סנכרון תוצאות אוטומטי"}
          </Button>

          <div className="w-full bg-[#0B0F19] rounded-xl p-4 min-h-[150px] border border-slate-700 font-mono text-sm space-y-2 overflow-y-auto max-h-[300px]">
            {syncLogs.length === 0 ? (
              <div className="text-slate-600 text-center mt-10">ממתין לפקודת סנכרון...</div>
            ) : (
              syncLogs.map((log, i) => (
                <div key={i} className={`${log.includes('✅') ? 'text-green-400' : log.includes('❌') ? 'text-red-400' : 'text-slate-300'}`}>
                  {'>'} {log}
                </div>
              ))
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}