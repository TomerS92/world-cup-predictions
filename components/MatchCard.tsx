"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);

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
    <Card className={`relative w-full max-w-md mx-auto rounded-3xl border shadow-xl overflow-hidden transition-all duration-300 ${
      isLocked 
        ? "bg-[#151D30]/20 border-slate-800/80 opacity-75" 
        : "bg-gradient-to-b from-[#151D30]/80 to-[#111827]/90 border-slate-800/60 hover:border-slate-700/80 shadow-slate-950/40"
    }`}>
      
      {/* תווית סטטוס עליונה */}
      <CardHeader className="p-4 border-b border-slate-800/50 bg-slate-900/30 flex flex-row justify-between items-center">
        <span className="text-xs font-black text-slate-400 tracking-wider uppercase">{startTime}</span>
        {isLocked && (
          <span className="text-[10px] font-black text-red-400 px-2.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded-md tracking-wider uppercase">
            🔒 ננעל
          </span>
        )}
      </CardHeader>

      <CardContent className="pt-6 p-5 space-y-6">
        
        {/* אזור הזנת התוצאות בעיצוב משחקי */}
        <div className="flex justify-between items-center gap-4 px-2">
          {/* קבוצת בית */}
          <div className="flex-1 text-center font-black text-md text-slate-100 truncate">{homeTeam}</div>
          
          {/* קוביות קלט */}
          <div className="flex items-center gap-3">
            <Input 
              type="number" 
              min="0"
              disabled={isLocked}
              className="w-14 h-14 text-center text-xl font-black rounded-xl bg-[#0B0F19] border-slate-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-100 disabled:bg-[#182235] disabled:border-slate-800 shadow-inner transition-all"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
            />
            <div className="text-slate-600 font-bold text-lg">:</div>
            <Input 
              type="number" 
              min="0"
              disabled={isLocked}
              className="w-14 h-14 text-center text-xl font-black rounded-xl bg-[#0B0F19] border-slate-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 disabled:opacity-100 disabled:bg-[#182235] disabled:border-slate-800 shadow-inner transition-all"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
            />
          </div>

          {/* קבוצת חוץ */}
          <div className="flex-1 text-center font-black text-md text-slate-100 truncate">{awayTeam}</div>
        </div>

        {/* שאלת בונוס מודרנית */}
        <div className="bg-[#0B0F19]/60 border border-slate-800/80 p-4 rounded-2xl space-y-3 shadow-inner">
          <div className="text-xs font-black text-blue-400 text-center tracking-wider uppercase">
            🌟 שאלת בונוס
          </div>
          <div className="text-sm font-bold text-slate-300 text-center pb-1">
            {propQuestion}
          </div>
          <div className="flex justify-center gap-2">
            <Button 
              variant={propAnswer === true ? "default" : "outline"} 
              disabled={isLocked}
              className={`flex-1 rounded-xl font-black h-10 tracking-wide border transition-all ${
                propAnswer === true 
                  ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-600/10" 
                  : "bg-transparent text-slate-400 border-slate-800 hover:bg-slate-800/50"
              } ${isLocked && propAnswer === true ? "opacity-100 bg-blue-600/40 border-blue-500/30 text-white" : ""}`}
              onClick={() => setPropAnswer(true)}
            >
              כן
            </Button>
            <Button 
              variant={propAnswer === false ? "default" : "outline"} 
              disabled={isLocked}
              className={`flex-1 rounded-xl font-black h-10 tracking-wide border transition-all ${
                propAnswer === false 
                  ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-600/10" 
                  : "bg-transparent text-slate-400 border-slate-800 hover:bg-slate-800/50"
              } ${isLocked && propAnswer === false ? "opacity-100 bg-blue-600/40 border-blue-500/30 text-white" : ""}`}
              onClick={() => setPropAnswer(false)}
            >
              לא
            </Button>
          </div>
        </div>

        {/* כפתור פעולה ראשי */}
        {!isLocked && (
          <Button 
            className="w-full rounded-xl h-12 text-md font-black bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all" 
            onClick={handleSavePrediction}
            disabled={isSaving}
          >
            {isSaving ? "שומר..." : hasExistingPrediction ? "עדכן ניחוש משחק" : "שמור ניחוש משחק"}
          </Button>
        )}

        {/* באנר תוצאות ונקודות משחק נעול */}
        {isLocked && hasExistingPrediction && (
          <div className={`mt-2 p-3.5 rounded-xl text-center font-black text-sm border shadow-inner tracking-wide ${
            pointsEarned === null ? "bg-amber-500/5 text-amber-400 border-amber-500/20" :
            pointsEarned > 0 ? "bg-green-500/10 text-green-400 border-green-500/20" :
            "bg-slate-800/30 text-slate-500 border-slate-800"
          }`}>
            {pointsEarned === null ? "⏳ הנתונים בעיבוד, ממתין לשריקה..." : 
             pointsEarned > 0 ? `🏆 זכית ב-${pointsEarned} נקודות במשחק זה!` : 
             "0 נקודות הפעם 😕"}
          </div>
        )}

      </CardContent>
    </Card>
  );
}