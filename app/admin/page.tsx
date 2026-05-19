"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, increment } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AdminPage() {
  const [matchId, setMatchId] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [propAnswer, setPropAnswer] = useState<boolean | null>(null);
  const [isProcessingManual, setIsProcessingManual] = useState(false);
  const [isProcessingAuto, setIsProcessingAuto] = useState(false);

  // פונקציה לסנכרון אוטומטי מול ה-API של ESPN
  const handleAutoSync = async () => {
    setIsProcessingAuto(true);
    try {
      // 1. משיכת הנתונים מ-ESPN
      const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard");
      const data = await response.json();

      if (!data || !data.events) {
        throw new Error("לא התקבלו נתונים מה-API");
      }

      // 2. סינון רק למשחקים שהסתיימו
      const completedMatches = data.events.filter((event: any) => 
        event.status.type.name === "STATUS_FINAL" || event.status.type.completed === true
      );

      if (completedMatches.length === 0) {
        alert("אין משחקים שהסתיימו כרגע בלוח התוצאות של ESPN.");
        setIsProcessingAuto(false);
        return;
      }

      let totalProcessedPredictions = 0;

      // 3. מעבר על כל משחק שהסתיים
      for (const match of completedMatches) {
        const competition = match.competitions[0];
        const homeTeamData = competition.competitors.find((c: any) => c.homeAway === 'home');
        const awayTeamData = competition.competitors.find((c: any) => c.homeAway === 'away');
        
        const realHomeScore = Number(homeTeamData.score);
        const realAwayScore = Number(awayTeamData.score);
        const currentMatchId = match.id;

        // שליפת הניחושים עבור המשחק הזה
        const predictionsRef = collection(db, "Predictions");
        const q = query(predictionsRef, where("matchId", "==", currentMatchId));
        const querySnapshot = await getDocs(q);

        for (const predictionDoc of querySnapshot.docs()) {
          const predictionData = predictionDoc.data();
          
          // הגנה קריטית: בודקים אם כבר חילקנו נקודות על הניחוש הזה כדי לא לחלק כפול!
          if (predictionData.pointsEarned !== undefined) {
            continue; 
          }

          let pointsEarned = 0;
          const guessedHome = predictionData.predictedHomeScore;
          const guessedAway = predictionData.predictedAwayScore;

          // חישוב נקודות
          if (guessedHome === realHomeScore && guessedAway === realAwayScore) {
            pointsEarned += 3;
          } else if (
            (guessedHome > guessedAway && realHomeScore > realAwayScore) ||
            (guessedHome < guessedAway && realHomeScore < realAwayScore) ||
            (guessedHome === guessedAway && realHomeScore === realAwayScore)
          ) {
            pointsEarned += 1;
          }

          // עדכון הניחוש עם הנקודות שהושגו
          await updateDoc(predictionDoc.ref, {
            pointsEarned: pointsEarned
          });

          // עדכון סך הנקודות של המשתמש בפרופיל שלו (רק אם זכה)
          if (pointsEarned > 0) {
            const userRef = doc(db, "Users", predictionData.userId);
            await updateDoc(userRef, {
              totalPoints: increment(pointsEarned)
            });
          }

          totalProcessedPredictions++;
        }
      }

      alert(`סנכרון אוטומטי הושלם! עודכנו ${totalProcessedPredictions} ניחושים חדשים.`);

    } catch (error: any) {
      console.error("שגיאה בסנכרון אוטומטי:", error);
      alert("תקלה בסנכרון: " + error.message);
    } finally {
      setIsProcessingAuto(false);
    }
  };

  // הפונקציה הידנית
  const handleProcessManualResults = async () => {
    if (homeScore === "" || awayScore === "" || propAnswer === null || matchId === "") {
      alert("יש להזין מזהה משחק, תוצאה מלאה ושאלת בונוס.");
      return;
    }

    setIsProcessingManual(true);
    try {
      const predictionsRef = collection(db, "Predictions");
      const q = query(predictionsRef, where("matchId", "==", matchId));
      const querySnapshot = await getDocs(q);

      const realHome = Number(homeScore);
      const realAway = Number(awayScore);

      let processedCount = 0;

      for (const predictionDoc of querySnapshot.docs()) {
        const data = predictionDoc.data();
        
        if (data.pointsEarned !== undefined) {
          continue;
        }

        let pointsEarned = 0;
        const guessedHome = data.predictedHomeScore;
        const guessedAway = data.predictedAwayScore;

        if (guessedHome === realHome && guessedAway === realAway) {
          pointsEarned += 3;
        }
        else if (
          (guessedHome > guessedAway && realHome > realAway) ||
          (guessedHome < guessedAway && realHome < realAway) ||
          (guessedHome === guessedAway && realHome === realAway)
        ) {
          pointsEarned += 1;
        }

        if (data.propBetGuess === propAnswer) {
          pointsEarned += 1;
        }

        await updateDoc(predictionDoc.ref, {
          pointsEarned: pointsEarned
        });

        if (pointsEarned > 0) {
          const userRef = doc(db, "Users", data.userId);
          await updateDoc(userRef, {
            totalPoints: increment(pointsEarned)
          });
        }

        processedCount++;
      }

      alert(`העיבוד הידני הושלם! נבדקו ועודכנו ${processedCount} ניחושים.`);
    } catch (error: any) {
      console.error("שגיאה בעיבוד תוצאות:", error);
      alert("תקלה: " + error.message);
    } finally {
      setIsProcessingManual(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 flex flex-col items-center justify-center gap-8" dir="rtl">
      
      {/* כרטיסיית אוטומציה */}
      <Card className="w-full max-w-lg shadow-2xl border-0 bg-blue-900/40 text-white border-blue-800">
        <CardHeader className="border-b border-blue-800/50 pb-6">
          <CardTitle className="text-2xl font-black text-center text-blue-300">
            סנכרון אוטומטי (ESPN API) ⚡
          </CardTitle>
          <CardDescription className="text-center text-blue-200 mt-2">
            סורק משחקים שהסתיימו, מחלץ תוצאות ומעדכן את כל הניחושים בלחיצת כפתור.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Button 
            className="w-full rounded-xl h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg" 
            onClick={handleAutoSync}
            disabled={isProcessingAuto}
          >
            {isProcessingAuto ? "סורק שרתים ומעדכן..." : "סנכרן תוצאות כעת"}
          </Button>
        </CardContent>
      </Card>

      {/* כרטיסיית הזנה ידנית */}
      <Card className="w-full max-w-lg shadow-2xl border-0 bg-slate-800 text-white">
        <CardHeader className="border-b border-slate-700 pb-6">
          <CardTitle className="text-xl font-bold text-center text-slate-300">
            הזנה ידנית (גיבוי ותיקונים)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300">מזהה משחק</label>
            <Input 
              className="bg-slate-900 border-slate-700 text-white placeholder-slate-600"
              placeholder="העתק לכאן את מזהה המשחק..."
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 text-center block">תוצאת הסיום</label>
            <div className="flex justify-center items-center gap-6">
              <Input 
                type="number" min="0" placeholder="בית"
                className="w-20 h-16 text-center text-2xl font-black bg-slate-900 border-slate-700 text-white"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
              />
              <div className="text-slate-500 font-bold">-</div>
              <Input 
                type="number" min="0" placeholder="חוץ"
                className="w-20 h-16 text-center text-2xl font-black bg-slate-900 border-slate-700 text-white"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl space-y-3 border border-slate-700">
            <div className="text-sm font-bold text-slate-300 text-center">
              התשובה לשאלת הבונוס
            </div>
            <div className="flex justify-center gap-2">
              <Button 
                variant={propAnswer === true ? "default" : "outline"} 
                className={`flex-1 rounded-lg ${propAnswer === true ? "bg-slate-600 hover:bg-slate-700 border-slate-500" : "text-slate-400 border-slate-700 hover:bg-slate-800"}`}
                onClick={() => setPropAnswer(true)}
              >
                כן
              </Button>
              <Button 
                variant={propAnswer === false ? "default" : "outline"} 
                className={`flex-1 rounded-lg ${propAnswer === false ? "bg-slate-600 hover:bg-slate-700 border-slate-500" : "text-slate-400 border-slate-700 hover:bg-slate-800"}`}
                onClick={() => setPropAnswer(false)}
              >
                לא
              </Button>
            </div>
          </div>

          <Button 
            className="w-full rounded-xl h-12 text-md font-bold bg-slate-700 hover:bg-slate-600 text-white mt-4" 
            onClick={handleProcessManualResults}
            disabled={isProcessingManual}
          >
            {isProcessingManual ? "מעבד נתונים..." : "הזן ידנית"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}