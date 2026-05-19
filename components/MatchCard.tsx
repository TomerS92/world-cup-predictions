"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

interface MatchCardProps {
  userId: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  propQuestion: string;
  isLocked?: boolean;
}

export function MatchCard({ userId, matchId, homeTeam, awayTeam, startTime, propQuestion, isLocked = false }: MatchCardProps) {
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [propAnswer, setPropAnswer] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingPrediction, setHasExistingPrediction] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null); // הוספנו סטייט לנקודות

  useEffect(() => {
    const fetchExistingPrediction = async () => {
      if (!userId || !matchId) return;

      try {
        const predictionId = `${userId}_${matchId}`;
        const predictionRef = doc(db, "Predictions", predictionId);
        const docSnap = await getDoc(predictionRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setHomeScore(data.predictedHomeScore.toString());
          setAwayScore(data.predictedAwayScore.toString());
          setPropAnswer(data.propBetGuess);
          setHasExistingPrediction(true);
          
          // אם מנוע הניקוד כבר רץ על המשחק הזה, שדה הנקודות יהיה קיים
          if (data.pointsEarned !== undefined) {
            setPointsEarned(data.pointsEarned);
          }
        }
      } catch (error) {
        console.error("Error fetching prediction:", error);
      }
    };

    fetchExistingPrediction();
  }, [userId, matchId]);

  const handleSavePrediction = async () => {
    if (isLocked) return; 

    if (homeScore === "" || awayScore === "" || propAnswer === null) {
      alert("שימו לב: חובה למלא את שתי התוצאות ולבחור תשובה לשאלת הבונוס כדי לשמור!");
      return;
    }
    
    if (!userId) {
      alert("שגיאה: המערכת לא מזהה שאתה מחובר. נסה לרענן את העמוד.");
      return;
    }
    
    setIsSaving(true);
    try {
      const predictionId = `${userId}_${matchId}`;
      const predictionRef = doc(db, "Predictions", predictionId);

      await setDoc(predictionRef, {
        userId,
        matchId,
        predictedHomeScore: Number(homeScore),
        predictedAwayScore: Number(awayScore),
        propBetGuess: propAnswer,
        updatedAt: serverTimestamp(),
      });

      setHasExistingPrediction(true);
      alert("הניחוש נשמר בהצלחה! 🏆");
    } catch (error: any) {
      console.error("שגיאה בשמירה:", error);
      alert(`קרתה תקלה בשמירת הניחוש: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={`w-full max-w-md mx-auto mb-4 border-2 shadow-sm rounded-2xl overflow-hidden transition-all ${isLocked ? "border-slate-200 bg-slate-50 opacity-90" : "border-slate-100"}`}>
      <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
        <div className="flex justify-between items-center text-sm font-medium text-slate-500 mb-2">
          <span>{startTime}</span>
          {isLocked && <span className="text-red-500 font-bold px-2 py-0.5 bg-red-50 rounded-md shadow-sm">🔒 ננעל</span>}
        </div>
        <CardTitle className="flex justify-between items-center text-xl font-bold">
          <div className="flex-1 text-center">{homeTeam}</div>
          <div className="px-4 text-slate-300">VS</div>
          <div className="flex-1 text-center">{awayTeam}</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        
        <div className="flex justify-center items-center gap-6">
          <Input 
            type="number" 
            min="0"
            disabled={isLocked}
            className="w-16 h-16 text-center text-2xl font-black rounded-xl bg-slate-50 disabled:opacity-100 disabled:bg-slate-200"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
          />
          <div className="text-slate-400 font-bold">-</div>
          <Input 
            type="number" 
            min="0"
            disabled={isLocked}
            className="w-16 h-16 text-center text-2xl font-black rounded-xl bg-slate-50 disabled:opacity-100 disabled:bg-slate-200"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
          />
        </div>

        <div className="bg-blue-50/50 p-4 rounded-xl space-y-3">
          <div className="text-sm font-bold text-blue-900 text-center">
            🌟 שאלת בונוס: {propQuestion}
          </div>
          <div className="flex justify-center gap-2">
            <Button 
              variant={propAnswer === true ? "default" : "outline"} 
              disabled={isLocked}
              className={`flex-1 rounded-lg ${isLocked && propAnswer === true ? "opacity-100" : ""}`}
              onClick={() => setPropAnswer(true)}
            >
              כן
            </Button>
            <Button 
              variant={propAnswer === false ? "default" : "outline"} 
              disabled={isLocked}
              className={`flex-1 rounded-lg ${isLocked && propAnswer === false ? "opacity-100" : ""}`}
              onClick={() => setPropAnswer(false)}
            >
              לא
            </Button>
          </div>
        </div>

        {/* אם המשחק לא ננעל - מציג את כפתור השמירה */}
        {!isLocked && (
          <Button 
            className="w-full rounded-xl h-12 text-md font-bold" 
            onClick={handleSavePrediction}
            disabled={isSaving}
          >
            {isSaving ? "שומר..." : hasExistingPrediction ? "עדכן ניחוש" : "שמור ניחוש"}
          </Button>
        )}

        {/* אם המשחק נעול והמשתמש שם ניחוש בעבר - מציג את אזור התוצאות */}
        {isLocked && hasExistingPrediction && (
          <div className={`mt-2 p-4 rounded-xl text-center font-bold text-lg border ${
            pointsEarned === null ? "bg-amber-50 text-amber-600 border-amber-200" :
            pointsEarned > 0 ? "bg-green-50 text-green-700 border-green-200" :
            "bg-slate-100 text-slate-500 border-slate-200"
          }`}>
            {pointsEarned === null ? "⏳ ממתין לעדכון תוצאת אמת..." : 
             pointsEarned > 0 ? `🏆 זכית ב-${pointsEarned} נקודות!` : 
             "0 נקודות הפעם 😕"}
          </div>
        )}

      </CardContent>
    </Card>
  );
}