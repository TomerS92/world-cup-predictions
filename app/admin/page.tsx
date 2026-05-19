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
        
        // הגנה מפני עדכון כפול של אותו ניחוש
        if (data.pointsEarned !== undefined) {
          continue;
        }

        let basePoints = 0;
        let extraPoints = 0;
        
        const guessedHome = data.predictedHomeScore;
        const guessedAway = data.predictedAwayScore;

        const isBullseye = (guessedHome === realHome && guessedAway === realAway);
        const isDiffMatch = (guessedHome - guessedAway === realHome - realAway);
        const isDirectionMatch = (
          (guessedHome > guessedAway && realHome > realAway) ||
          (guessedHome < guessedAway && realHome < realAway) ||
          (guessedHome === guessedAway && realHome === realAway)
        );

        // 1. חישוב נקודות בסיס
        if (isBullseye) {
          basePoints = 5;
        } else {
          if (isDiffMatch) {
            basePoints = 3;
          } else if (isDirectionMatch) {
            basePoints = 1;
          }

          // 2. חישוב בונוסים מבוססי תוצאה (רק אם אין פגיעה בול)
          // בונוס פגיעה בתוצאה של קבוצה אחת בדיוק
          if (guessedHome === realHome || guessedAway === realAway) {
            extraPoints += 1;
          }
          // בונוס סך שערים מדויק במשחק
          if (guessedHome + guessedAway === realHome + realAway) {
            extraPoints += 1;
          }
        }

        // 3. חישוב שאלת הבונוס הרשמית
        let propPoints = 0;
        if (data.propBetGuess === propAnswer) {
          propPoints = 2;
        }

        // סך הכל לפני ג'וקר
        let totalEarned = basePoints + extraPoints + propPoints;

        // 4. הפעלת מכפיל ג'וקר (אם המשתמש סימן)
        if (data.isJoker) {
          totalEarned *= 2;
        }

        // עדכון הניחוש במסד הנתונים
        await updateDoc(predictionDoc.ref, {
          pointsEarned: totalEarned
        });

        // עדכון סך הנקודות של המשתמש בפרופיל (רק אם זכה במשהו)
        if (totalEarned > 0) {
          const userRef = doc(db, "Users", data.userId);
          await updateDoc(userRef, {
            totalPoints: increment(totalEarned)
          });
        }

        processedCount++;
      }

      alert(`העיבוד הידני הושלם בהצלחה! חושבו הבונוסים, הופעלו הג'וקרים, ועודכנו ${processedCount} ניחושים.`);
    } catch (error: any) {
      console.error("שגיאה בעיבוד תוצאות:", error);
      alert("תקלה: " + error.message);
    } finally {
      setIsProcessingManual(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-8 flex flex-col items-center justify-center gap-8" dir="rtl">
      
      {/* כרטיסיית הזנה ידנית (הדרך המומלצת למערכת משולבת בונוסים) */}
      <Card className="w-full max-w-lg shadow-2xl border-0 bg-slate-800 text-white border-t-4 border-t-purple-500">
        <CardHeader className="border-b border-slate-700 pb-6">
          <CardTitle className="text-2xl font-black text-center text-slate-100">
            הזנת תוצאות וחישוב ניקוד 🧮
          </CardTitle>
          <CardDescription className="text-center text-slate-400 mt-2">
            הזן את נתוני הסיום כדי שמנוע הלוגיקה יחשב בול פגיעה, הפרשים, בונוסי שערים וג'וקרים במקביל.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300">מזהה משחק (Match ID)</label>
            <Input 
              className="bg-slate-900 border-slate-700 text-white placeholder-slate-600 h-12"
              placeholder="העתק לכאן את מזהה המשחק..."
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 text-center block">תוצאת הסיום האמיתית</label>
            <div className="flex justify-center items-center gap-6">
              <Input 
                type="number" min="0" placeholder="בית"
                className="w-24 h-20 text-center text-3xl font-black bg-slate-900 border-slate-700 text-white"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
              />
              <div className="text-slate-500 font-bold text-2xl">-</div>
              <Input 
                type="number" min="0" placeholder="חוץ"
                className="w-24 h-20 text-center text-3xl font-black bg-slate-900 border-slate-700 text-white"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-slate-900/50 p-5 rounded-2xl space-y-4 border border-slate-700">
            <div className="text-sm font-black text-purple-400 text-center uppercase tracking-widest">
              התשובה לשאלת הבונוס
            </div>
            <div className="flex justify-center gap-3">
              <Button 
                variant={propAnswer === true ? "default" : "outline"} 
                className={`flex-1 rounded-xl h-12 font-black border-2 ${propAnswer === true ? "bg-purple-600 hover:bg-purple-500 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-transparent text-slate-400 border-slate-700 hover:bg-slate-800"}`}
                onClick={() => setPropAnswer(true)}
              >
                כן
              </Button>
              <Button 
                variant={propAnswer === false ? "default" : "outline"} 
                className={`flex-1 rounded-xl h-12 font-black border-2 ${propAnswer === false ? "bg-purple-600 hover:bg-purple-500 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]" : "bg-transparent text-slate-400 border-slate-700 hover:bg-slate-800"}`}
                onClick={() => setPropAnswer(false)}
              >
                לא
              </Button>
            </div>
          </div>

          <Button 
            className="w-full rounded-2xl h-14 text-lg font-black bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white mt-4 shadow-xl active:scale-[0.98] transition-all" 
            onClick={handleProcessManualResults}
            disabled={isProcessingManual}
          >
            {isProcessingManual ? "מעבד ומחשב ניקוד..." : "שגר חישובים ועדכן טבלה"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}