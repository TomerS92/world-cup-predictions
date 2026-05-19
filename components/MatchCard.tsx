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
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  startTime: string;
  propQuestion: string;
  isLocked?: boolean;
}

export function MatchCard({ userId, matchId, homeTeam, homeLogo, awayTeam, awayLogo, startTime, propQuestion, isLocked = false }: MatchCardProps) {
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
    <Card className={`relative w-full max-w-md mx-auto rounded-[2rem] border shadow-2xl overflow-hidden transition-all duration-500 ${
      isLocked 
        ? "bg-[#151D30]/40 border-slate-800/80 opacity-80 saturate-[0.8]" 
        : "bg-gradient-to-b from-[#1A233A] to-[#0F1626] border-slate-800/60 hover:border-blue-500/30 shadow-slate-950/40"
    }`}>
      
      {/* תווית זמן עליונה - הפיכת רקע לכהה וטקסט ללבן ברור */}
      <CardHeader className="p-3 border-b border-slate-800/50 bg-black/40 flex flex-row justify-center items-center relative">
        <span className="text-xs font-extrabold text-slate-300 tracking-widest uppercase">{startTime}</span>
        {isLocked && (
          <span className="absolute right-4 text-[10px] font-black text-red-400 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-md tracking-wider uppercase animate-pulse">
            ננעל
          </span>
        )}
      </CardHeader>

      <CardContent className="pt-8 p-6 space-y-8">
        
        {/* אזור הקבוצות והניקוד */}
        <div className="flex justify-between items-center gap-2">
          
          {/* קבוצת בית */}
          <div className="flex flex-col items-center flex-1 space-y-3">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 p-3 flex items-center justify-center shadow-inner relative overflow-hidden group">
              {homeLogo ? (
                <img src={homeLogo} alt={homeTeam} className="w-full h-full object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-110" />
              ) : (
                <span className="text-2xl">🛡️</span>
              )}
            </div>
            <div className="text-center font-black text-sm text-slate-200 tracking-wide truncate w-full px-1">{homeTeam}</div>
          </div>
          
          {/* קוביות קלט - וידוא צבע טקסט לבן (text-white) ושינוי צבע פלייסנולדר */}
          <div className="flex items-center gap-2">
            <Input 
              type="number" 
              min="0"
              disabled={isLocked}
              className={`w-14 h-16 text-center text-2xl font-black rounded-2xl bg-[#070A12] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 shadow-inner transition-all ${isLocked ? "disabled:opacity-100 disabled:bg-[#0B0F19] disabled:text-slate-400" : ""}`}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
            />
            <div className="text-slate-500 font-black text-xl mb-1">:</div>
            <Input 
              type="number" 
              min="0"
              disabled={isLocked}
              className={`w-14 h-16 text-center text-2xl font-black rounded-2xl bg-[#070A12] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 shadow-inner transition-all ${isLocked ? "disabled:opacity-100 disabled:bg-[#0B0F19] disabled:text-slate-400" : ""}`}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
            />
          </div>

          {/* קבוצת חוץ */}
          <div className="flex flex-col items-center flex-1 space-y-3">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 p-3 flex items-center justify-center shadow-inner relative overflow-hidden group">
              {awayLogo ? (
                <img src={awayLogo} alt={awayTeam} className="w-full h-full object-contain drop-shadow-xl transition-transform duration-300 group-hover:scale-110" />
              ) : (
                <span className="text-2xl">🛡️</span>
              )}
            </div>
            <div className="text-center font-black text-sm text-slate-200 tracking-wide truncate w-full px-1">{awayTeam}</div>
          </div>
        </div>

        {/* שאלת בונוס */}
        <div className="bg-black/30 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50"></div>
          <div className="text-[10px] font-black text-blue-400 text-center tracking-widest uppercase">
            שאלת בונוס
          </div>
          <div className="text-sm font-bold text-slate-200 text-center pb-2 px-2 leading-relaxed">
            {propQuestion}
          </div>
          {/* תיקון כפתורי הבחירה - טקסט בהיר וברור גם כשהם לא לחוצים */}
          <div className="flex justify-center gap-3">
            <Button 
              variant={propAnswer === true ? "default" : "outline"} 
              disabled={isLocked}
              className={`flex-1 rounded-xl font-black h-11 tracking-wide border-2 transition-all ${
                propAnswer === true 
                  ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                  : "bg-[#070A12] text-slate-200 border-slate-800 hover:bg-slate-800 hover:text-white hover:border-slate-600"
              } ${isLocked && propAnswer === true ? "opacity-100 bg-blue-600/40 border-blue-500/30 text-white shadow-none" : ""}`}
              onClick={() => setPropAnswer(true)}
            >
              כן
            </Button>
            <Button 
              variant={propAnswer === false ? "default" : "outline"} 
              disabled={isLocked}
              className={`flex-1 rounded-xl font-black h-11 tracking-wide border-2 transition-all ${
                propAnswer === false 
                  ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                  : "bg-[#070A12] text-slate-200 border-slate-800 hover:bg-slate-800 hover:text-white hover:border-slate-600"
              } ${isLocked && propAnswer === false ? "opacity-100 bg-blue-600/40 border-blue-500/30 text-white shadow-none" : ""}`}
              onClick={() => setPropAnswer(false)}
            >
              לא
            </Button>
          </div>
        </div>

        {/* כפתור שמירה */}
        {!isLocked && (
          <Button 
            className="w-full rounded-2xl h-14 text-lg font-black bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white shadow-[0_5px_20px_rgba(37,99,235,0.2)] active:scale-[0.98] transition-all duration-300" 
            onClick={handleSavePrediction}
            disabled={isSaving}
          >
            {isSaving ? "שומר נתונים..." : hasExistingPrediction ? "עדכן ניחוש משחק" : "נעל ניחוש"}
          </Button>
        )}

        {/* באנר תוצאות נעולות */}
        {isLocked && hasExistingPrediction && (
          <div className={`mt-2 p-4 rounded-2xl text-center font-black text-sm border-2 shadow-inner tracking-wide ${
            pointsEarned === null ? "bg-[#070A12] text-slate-400 border-slate-800" :
            pointsEarned > 0 ? "bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]" :
            "bg-red-500/5 text-red-400/80 border-red-500/10"
          }`}>
            {pointsEarned === null ? "⏳ מחשב תוצאות..." : 
             pointsEarned > 0 ? `🏆 הוספת ${pointsEarned} נקודות למאזן!` : 
             "הניחוש לא צלח הפעם 😕"}
          </div>
        )}

      </CardContent>
    </Card>
  );
}