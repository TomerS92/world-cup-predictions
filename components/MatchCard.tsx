"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";

interface MatchCardProps {
  userId: string;
  matchId: string;
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  startTime: string;
  matchDate: string;
  isLocked?: boolean;
}

export function MatchCard({ userId, matchId, homeTeam, homeLogo, awayTeam, awayLogo, startTime, matchDate, isLocked = false }: MatchCardProps) {
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [isJoker, setIsJoker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingPrediction, setHasExistingPrediction] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [pointsBreakdown, setPointsBreakdown] = useState<string | null>(null); // שדה חדש לפירוט
  const [realHomeScore, setRealHomeScore] = useState<number | null>(null); // שדה חדש לתוצאת אמת
  const [realAwayScore, setRealAwayScore] = useState<number | null>(null); // שדה חדש לתוצאת אמת

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
          setIsJoker(data.isJoker || false);
          setHasExistingPrediction(true);
          
          if (data.pointsEarned !== undefined) {
            setPointsEarned(data.pointsEarned);
          }
          if (data.pointsBreakdown !== undefined) {
            setPointsBreakdown(data.pointsBreakdown);
          }
          if (data.realHomeScore !== undefined) {
            setRealHomeScore(data.realHomeScore);
            setRealAwayScore(data.realAwayScore);
          }
        }
      } catch (error) {
        console.error("Error fetching prediction:", error);
      }
    };

    fetchExistingPrediction();
  }, [userId, matchId]);

  const handleJokerToggle = async () => {
    if (isLocked) return;
    if (isJoker) {
      setIsJoker(false);
      return;
    }
    try {
      const predictionsRef = collection(db, "Predictions");
      const q = query(predictionsRef, where("userId", "==", userId));
      const snapshot = await getDocs(q);
      
      let jokerAlreadyUsedToday = false;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isJoker === true && data.matchDate === matchDate && data.matchId !== matchId) {
          jokerAlreadyUsedToday = true;
        }
      });

      if (jokerAlreadyUsedToday) {
        alert("❌ אופס! ניתן להפעיל קלף ג'וקר אחד בלבד בכל יום משחקים. כבר השתמשת בג'וקר על משחק אחר שמתקיים בתאריך הזה.");
        return;
      }
      setIsJoker(true);
    } catch (error) {
      console.error("Error checking joker availability:", error);
      alert("שגיאה בבדיקת הג'וקר, נסה שוב.");
    }
  };

  const handleSavePrediction = async () => {
    if (isLocked) return; 

    if (homeScore === "" || awayScore === "") {
      alert("שימו לב: חובה למלא את שתי התוצאות כדי לשמור!");
      return;
    }
    
    const homeNum = Number(homeScore);
    const awayNum = Number(awayScore);
    const goalDiff = Math.abs(homeNum - awayNum);
    const totalGoals = homeNum + awayNum;

    if (goalDiff >= 4 || totalGoals >= 7) {
      const isSane = window.confirm(
        "⚠️ [LINT WARNING] UVM_FATAL: Unrealistic scenario detected!\n\nהסימולציה מזהה תוצאה קיצונית (הפרש של 4+ שערים או 7+ שערים בסך הכל).\nהאם אתה בטוח שאתה רוצה לדחוף (Commit) את הרגרסיה הזאת למערכת?"
      );
      if (!isSane) return;
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
        matchDate,
        predictedHomeScore: homeNum,
        predictedAwayScore: awayNum,
        isJoker: isJoker,
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
        ? "bg-[#151D30]/40 border-slate-800/80 opacity-90" 
        : isJoker 
          ? "bg-gradient-to-b from-[#1A1810] to-[#1F1608] border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]"
          : "bg-gradient-to-b from-[#1A233A] to-[#0F1626] border-slate-800/60 hover:border-blue-500/30 shadow-slate-950/40"
    }`}>
      
      <CardHeader className="p-3 border-b border-slate-800/50 bg-black/40 flex flex-row justify-center items-center relative">
        <span className="text-xs font-extrabold text-slate-300 tracking-widest uppercase">{startTime}</span>
        {isJoker && !isLocked && (
           <span className="absolute left-4 text-[10px] font-black text-amber-400 tracking-widest uppercase flex items-center gap-1">
             🃏 ג'וקר פעיל
           </span>
        )}
        {isLocked && (
          <span className="absolute right-4 text-[10px] font-black text-red-400 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-md tracking-wider uppercase">
            🔒 ננעל
          </span>
        )}
      </CardHeader>

      <CardContent className="pt-8 p-6 space-y-7">
        
        {/* תצוגת תוצאת האמת מעל הניחוש אם המשחק הסתיים */}
        {isLocked && realHomeScore !== null && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5 text-center flex flex-col items-center gap-0.5 shadow-inner">
            <span className="text-[10px] font-black text-blue-400 tracking-wider uppercase">תוצאת סיום רשמית</span>
            <span className="text-xl font-black text-white tracking-widest">{realHomeScore} : {realAwayScore}</span>
          </div>
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/95 border-2 border-slate-700/50 p-2 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)] relative overflow-hidden group">
              {homeLogo ? (
                <img src={homeLogo} alt={homeTeam} className="w-full h-full object-contain" />
              ) : (
                <span className="text-2xl">🛡️</span>
              )}
            </div>
            <div className="text-center font-black text-sm text-slate-200 tracking-wide w-full leading-tight">{homeTeam}</div>
          </div>
          
          <div className="flex flex-col items-center gap-1 pb-5">
            <span className="text-[9px] font-black text-slate-500 tracking-wider uppercase">הניחוש שלך</span>
            <div className="flex items-center gap-2">
              <Input 
                type="number" min="0" disabled={isLocked}
                className={`w-14 h-16 text-center text-2xl font-black rounded-2xl bg-[#070A12] border-slate-800 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 shadow-inner transition-all ${isLocked ? "disabled:opacity-100 disabled:bg-[#0B0F19] disabled:text-slate-400" : ""}`}
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
              />
              <div className="text-slate-500 font-black text-xl mb-1">:</div>
              <Input 
                type="number" min="0" disabled={isLocked}
                className={`w-14 h-16 text-center text-2xl font-black rounded-2xl bg-[#070A12] border-slate-800 text-white placeholder-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 shadow-inner transition-all ${isLocked ? "disabled:opacity-100 disabled:bg-[#0B0F19] disabled:text-slate-400" : ""}`}
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/95 border-2 border-slate-700/50 p-2 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)] relative overflow-hidden group">
              {awayLogo ? (
                <img src={awayLogo} alt={awayTeam} className="w-full h-full object-contain" />
              ) : (
                <span className="text-2xl">🛡️</span>
              )}
            </div>
            <div className="text-center font-black text-sm text-slate-200 tracking-wide w-full leading-tight">{awayTeam}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {!isLocked && (
            <Button 
              variant="outline"
              className={`w-full rounded-2xl h-12 font-black border-2 transition-all duration-300 ${isJoker ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]" : "bg-[#070A12] text-slate-400 border-slate-800 hover:bg-amber-900/20 hover:border-amber-700/50 hover:text-amber-500"}`}
              onClick={handleJokerToggle} 
            >
              🃏 {isJoker ? "הג'וקר הופעל! (כפול נקודות)" : "הפעל ג'וקר למשחק זה"}
            </Button>
          )}
        </div>

        {!isLocked && (
          <Button 
            className="w-full rounded-2xl h-14 text-lg font-black bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white shadow-[0_5px_20px_rgba(37,99,235,0.2)] active:scale-[0.98] transition-all duration-300" 
            onClick={handleSavePrediction}
            disabled={isSaving}
          >
            {isSaving ? "שומר נתונים..." : hasExistingPrediction ? "עדכן ניחוש משחק" : "נעל ניחוש"}
          </Button>
        )}

        {/* באנר נקודות מעודכן עם פירוט מלא ותוצאת אמת */}
        {isLocked && hasExistingPrediction && (
          <div className="pt-2">
            {pointsEarned === null ? (
              <div className="p-4 rounded-2xl text-center font-black text-sm border-2 bg-[#070A12] text-slate-400 border-slate-800 border-dashed">
                ⏳ {isJoker && "🃏"} מחשב תוצאות מהמגרש...
              </div>
            ) : (
              <div className={`relative p-4 rounded-2xl border-2 overflow-hidden flex flex-col gap-1 text-center ${
                pointsEarned > 0 
                  ? isJoker 
                    ? "bg-gradient-to-b from-amber-500/20 to-amber-900/20 text-amber-400 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]" 
                    : "bg-gradient-to-b from-green-500/20 to-green-900/20 text-green-400 border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                  : "bg-slate-900/50 text-slate-500 border-slate-800"
              }`}>
                <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shimmer_3s_infinite]" />
                
                <div className="font-black text-md">
                  {pointsEarned > 0 ? isJoker ? "🃏 מכה כפולה! " : "🏆 הפצצת! " : ""} 
                  זכית ב-<span className={pointsEarned > 0 ? "text-white mx-0.5" : ""}>{pointsEarned}</span> נקודות
                </div>
                
                {/* הצגת ה-Breakdown הגולמי שהתקבל מהשרת */}
                {pointsBreakdown && (
                  <div className={`text-[10px] font-bold tracking-wide mt-0.5 leading-normal ${pointsEarned > 0 ? "text-slate-300" : "text-slate-600"}`}>
                    {pointsBreakdown}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}