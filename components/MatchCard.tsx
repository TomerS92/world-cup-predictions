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
  matchDate: string; // חדש: תאריך המשחק נקי (לצורך הגבלת ג'וקר)
  propQuestion: string;
  isLocked?: boolean;
}

export function MatchCard({ userId, matchId, homeTeam, homeLogo, awayTeam, awayLogo, startTime, matchDate, propQuestion, isLocked = false }: MatchCardProps) {
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [propAnswer, setPropAnswer] = useState<boolean | null>(null);
  const [isJoker, setIsJoker] = useState(false);
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
          setIsJoker(data.isJoker || false);
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

  // פונקציה חדשה שמוודאת שלא משתמשים ביותר מג'וקר אחד ביום
  const handleJokerToggle = async () => {
    if (isLocked) return;
    
    // אם הג'וקר דלוק ואנחנו רוצים לכבות - זה תמיד מותר
    if (isJoker) {
      setIsJoker(false);
      return;
    }

    // אם אנחנו מנסים להדליק, צריך לוודא שאין משחק אחר היום עם ג'וקר
    try {
      const predictionsRef = collection(db, "Predictions");
      // סורקים את כל הניחושים של המשתמש הזה
      const q = query(predictionsRef, where("userId", "==", userId));
      const snapshot = await getDocs(q);
      
      let jokerAlreadyUsedToday = false;

      snapshot.forEach((doc) => {
        const data = doc.data();
        // אם הניחוש סומן כג'וקר, והוא באותו תאריך כמו המשחק הנוכחי, אבל מזהה המשחק שונה
        if (data.isJoker === true && data.matchDate === matchDate && data.matchId !== matchId) {
          jokerAlreadyUsedToday = true;
        }
      });

      if (jokerAlreadyUsedToday) {
        alert("❌ אופס! ניתן להפעיל קלף ג'וקר אחד בלבד בכל יום משחקים. כבר השתמשת בג'וקר על משחק אחר שמתקיים בתאריך הזה.");
        return;
      }

      // אם הכל תקין, מדליקים את הג'וקר
      setIsJoker(true);
    } catch (error) {
      console.error("Error checking joker availability:", error);
      alert("שגיאה בבדיקת הג'וקר, נסה שוב.");
    }
  };

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
        matchDate, // שמירת התאריך במסד הנתונים כדי שנוכל לבדוק אותו בהמשך
        predictedHomeScore: Number(homeScore),
        predictedAwayScore: Number(awayScore),
        propBetGuess: propAnswer,
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
        
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/95 border-2 border-slate-700/50 p-2 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)] relative overflow-hidden group">
              {homeLogo ? (
                <img src={homeLogo} alt={homeTeam} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110" />
              ) : (
                <span className="text-2xl">🛡️</span>
              )}
            </div>
            <div className="text-center font-black text-sm text-slate-200 tracking-wide w-full leading-tight">{homeTeam}</div>
          </div>
          
          <div className="flex items-center gap-2 pb-5">
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

          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/95 border-2 border-slate-700/50 p-2 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)] relative overflow-hidden group">
              {awayLogo ? (
                <img src={awayLogo} alt={awayTeam} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110" />
              ) : (
                <span className="text-2xl">🛡️</span>
              )}
            </div>
            <div className="text-center font-black text-sm text-slate-200 tracking-wide w-full leading-tight">{awayTeam}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="bg-black/30 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50"></div>
            <div className="text-[10px] font-black text-blue-400 text-center tracking-widest uppercase">שאלת בונוס</div>
            <div className="text-sm font-bold text-slate-200 text-center pb-2 px-2 leading-relaxed">{propQuestion}</div>
            <div className="flex justify-center gap-3">
              <Button 
                variant={propAnswer === true ? "default" : "outline"} disabled={isLocked}
                className={`flex-1 rounded-xl font-black h-11 tracking-wide border-2 transition-all ${propAnswer === true ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "bg-[#070A12] text-slate-200 border-slate-800 hover:bg-slate-800 hover:text-white hover:border-slate-600"} ${isLocked && propAnswer === true ? "opacity-100 bg-blue-600/40 border-blue-500/30 text-white shadow-none" : ""}`}
                onClick={() => setPropAnswer(true)}>כן</Button>
              <Button 
                variant={propAnswer === false ? "default" : "outline"} disabled={isLocked}
                className={`flex-1 rounded-xl font-black h-11 tracking-wide border-2 transition-all ${propAnswer === false ? "bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]" : "bg-[#070A12] text-slate-200 border-slate-800 hover:bg-slate-800 hover:text-white hover:border-slate-600"} ${isLocked && propAnswer === false ? "opacity-100 bg-blue-600/40 border-blue-500/30 text-white shadow-none" : ""}`}
                onClick={() => setPropAnswer(false)}>לא</Button>
            </div>
          </div>

          {/* הפעלת הג'וקר עם הפונקציה שבודקת כפילויות */}
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

        {isLocked && hasExistingPrediction && (
          <div className="pt-2">
            {pointsEarned === null ? (
              <div className="p-4 rounded-2xl text-center font-black text-sm border-2 bg-[#070A12] text-slate-400 border-slate-800 border-dashed">
                ⏳ {isJoker && "🃏"} מחשב תוצאות מהמגרש...
              </div>
            ) : pointsEarned > 0 ? (
              <div className={`relative p-4 rounded-2xl text-center font-black text-lg border-2 overflow-hidden ${isJoker ? "bg-gradient-to-b from-amber-500/20 to-amber-900/20 text-amber-400 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.2)]" : "bg-gradient-to-b from-green-500/20 to-green-900/20 text-green-400 border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.15)]"}`}>
                <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shimmer_3s_infinite]" />
                {isJoker ? "🃏 מכה כפולה! " : "🏆 הפצצת! "} <span className="text-white mx-1">{pointsEarned}</span> נקודות למאזן
              </div>
            ) : (
               <div className="p-4 rounded-2xl text-center font-black text-sm border-2 bg-slate-900/50 text-slate-500 border-slate-800">
                {isJoker && "🃏 "} הניחוש לא צלח הפעם 😕
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  );
}