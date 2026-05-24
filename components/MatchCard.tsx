"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp,
} from "firebase/firestore";

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

type InlineMsg = { type: "success" | "error" | "warning"; text: string } | null;

export function MatchCard({
  userId, matchId, homeTeam, homeLogo, awayTeam, awayLogo,
  startTime, matchDate, isLocked = false,
}: MatchCardProps) {
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [isJoker, setIsJoker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExistingPrediction, setHasExistingPrediction] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [pointsBreakdown, setPointsBreakdown] = useState<string | null>(null);
  const [realHomeScore, setRealHomeScore] = useState<number | null>(null);
  const [realAwayScore, setRealAwayScore] = useState<number | null>(null);
  const [msg, setMsg] = useState<InlineMsg>(null);
  const [extremeWarning, setExtremeWarning] = useState(false);

  // Clear message after 3 s
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  // Load existing prediction
  useEffect(() => {
    const fetchExistingPrediction = async () => {
      if (!userId || !matchId) return;
      try {
        const predictionRef = doc(db, "Predictions", `${userId}_${matchId}`);
        const docSnap = await getDoc(predictionRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setHomeScore(data.predictedHomeScore.toString());
          setAwayScore(data.predictedAwayScore.toString());
          setIsJoker(data.isJoker ?? false);
          setHasExistingPrediction(true);
          if (data.pointsEarned !== undefined) setPointsEarned(data.pointsEarned);
          if (data.pointsBreakdown !== undefined) setPointsBreakdown(data.pointsBreakdown);
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
    if (isJoker) { setIsJoker(false); return; }
    try {
      const snapshot = await getDocs(
        query(collection(db, "Predictions"), where("userId", "==", userId))
      );
      let jokerUsed = false;
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.isJoker === true && data.matchDate === matchDate && data.matchId !== matchId) {
          jokerUsed = true;
        }
      });
      if (jokerUsed) {
        setMsg({ type: "warning", text: "כבר השתמשת בג׳וקר על משחק אחר היום." });
        return;
      }
      setIsJoker(true);
    } catch {
      setMsg({ type: "error", text: "שגיאה בבדיקת הג׳וקר, נסה שוב." });
    }
  };

  const handleSavePrediction = async () => {
    if (isLocked) return;

    if (homeScore === "" || awayScore === "") {
      setMsg({ type: "error", text: "חובה למלא את שתי התוצאות." });
      return;
    }

    const homeNum = Number(homeScore);
    const awayNum = Number(awayScore);

    // Extreme score warning (inline, not alert)
    if ((Math.abs(homeNum - awayNum) >= 4 || homeNum + awayNum >= 7) && !extremeWarning) {
      setExtremeWarning(true);
      setMsg({ type: "warning", text: "תוצאה קיצונית — לחץ שוב לאישור." });
      return;
    }
    setExtremeWarning(false);

    if (!userId) {
      setMsg({ type: "error", text: "לא מחובר. רענן את הדף." });
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(doc(db, "Predictions", `${userId}_${matchId}`), {
        userId, matchId, matchDate,
        predictedHomeScore: homeNum,
        predictedAwayScore: awayNum,
        isJoker,
        updatedAt: serverTimestamp(),
      });
      setHasExistingPrediction(true);
      setMsg({ type: "success", text: "הניחוש נשמר! 🏆" });
    } catch (error: any) {
      setMsg({ type: "error", text: `שגיאה בשמירה: ${error.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Derived state ───────────────────────────────────────────────────────────
  const jokerActive = isJoker && !isLocked;
  const cardBg = isLocked
    ? "bg-[#0D1220]"
    : jokerActive
    ? "bg-gradient-to-b from-[#1C1608] to-[#110E02]"
    : "bg-[#0D1624]";

  const cardBorder = isLocked
    ? "border-white/4"
    : jokerActive
    ? "border-amber-500/30"
    : "border-white/6 hover:border-blue-500/20";

  return (
    <div className={`relative rounded-2xl border overflow-hidden shadow-lg transition-all duration-300 ${cardBg} ${cardBorder}`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/30 border-b border-white/5">
        <span className="text-xs font-bold text-slate-400">{startTime}</span>
        <div className="flex items-center gap-2">
          {jokerActive && (
            <span className="text-[10px] font-black text-amber-400 tracking-wider">🃏 ג׳וקר פעיל</span>
          )}
          {isLocked && (
            <span className="text-[10px] font-black text-slate-500 bg-white/5 border border-white/8 px-2 py-0.5 rounded-md tracking-wider">
              🔒 ננעל
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Real result badge */}
        {isLocked && realHomeScore !== null && (
          <div className="flex items-center justify-center gap-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl py-2">
            <span className="text-[10px] font-black text-emerald-400 tracking-wider uppercase">תוצאה רשמית</span>
            <span className="text-lg font-black text-white tabular-nums">
              {realHomeScore} – {realAwayScore}
            </span>
          </div>
        )}

        {/* Teams + score inputs */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Home */}
          <TeamDisplay name={homeTeam} logo={homeLogo} />

          {/* Score inputs */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-black text-slate-600 tracking-wider uppercase">ניחוש</span>
            <div className="flex items-center gap-2">
              <ScoreInput
                value={homeScore}
                disabled={isLocked}
                onChange={setHomeScore}
                onReset={() => setExtremeWarning(false)}
              />
              <span className="text-slate-500 font-black text-lg">–</span>
              <ScoreInput
                value={awayScore}
                disabled={isLocked}
                onChange={setAwayScore}
                onReset={() => setExtremeWarning(false)}
              />
            </div>
          </div>

          {/* Away */}
          <TeamDisplay name={awayTeam} logo={awayLogo} align="right" />
        </div>

        {/* Actions (only when unlocked) */}
        {!isLocked && (
          <div className="space-y-2">
            {/* Joker toggle */}
            <button
              onClick={handleJokerToggle}
              className={`w-full rounded-xl h-10 text-sm font-black border transition-all duration-200 ${
                jokerActive
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  : "bg-white/3 text-slate-500 border-white/6 hover:text-amber-400 hover:border-amber-500/20 hover:bg-amber-500/5"
              }`}
            >
              🃏 {jokerActive ? "ג׳וקר פעיל — נקודות כפולות!" : "הפעל ג׳וקר"}
            </button>

            {/* Save button */}
            <button
              onClick={handleSavePrediction}
              disabled={isSaving}
              className="w-full rounded-xl h-11 text-sm font-black bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all duration-150 disabled:opacity-60 disabled:cursor-wait"
            >
              {isSaving ? "שומר..." : hasExistingPrediction ? "עדכן ניחוש" : "נעל ניחוש"}
            </button>
          </div>
        )}

        {/* Inline message */}
        {msg && (
          <div className={`text-xs font-bold text-center py-2 rounded-xl border ${
            msg.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : msg.type === "warning"
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            {msg.text}
          </div>
        )}

        {/* Points result (locked + has prediction) */}
        {isLocked && hasExistingPrediction && (
          <PointsResult
            pointsEarned={pointsEarned}
            pointsBreakdown={pointsBreakdown}
            isJoker={isJoker}
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TeamDisplay({ name, logo, align = "left" }: { name: string; logo: string; align?: "left" | "right" }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className="w-14 h-14 rounded-2xl bg-white/90 p-2 flex items-center justify-center shadow-sm">
        {logo ? (
          <img src={logo} alt={name} className="w-full h-full object-contain" />
        ) : (
          <span className="text-2xl">🛡️</span>
        )}
      </div>
      <span className="text-[11px] font-black text-slate-300 text-center leading-tight w-full">{name}</span>
    </div>
  );
}

function ScoreInput({
  value, disabled, onChange, onReset,
}: {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  onReset: () => void;
}) {
  return (
    <input
      type="number"
      min="0"
      disabled={disabled}
      value={value}
      onChange={(e) => { onReset(); onChange(e.target.value); }}
      className="w-12 h-14 text-center text-xl font-black rounded-xl bg-black/40 border border-white/8 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 transition-all disabled:opacity-60 disabled:cursor-default [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

function PointsResult({
  pointsEarned, pointsBreakdown, isJoker,
}: {
  pointsEarned: number | null;
  pointsBreakdown: string | null;
  isJoker: boolean;
}) {
  if (pointsEarned === null) {
    return (
      <div className="text-center text-xs font-bold text-slate-600 border border-white/5 rounded-xl py-3 bg-white/2">
        ⏳ ממתין לחישוב תוצאות...
      </div>
    );
  }

  const isWin = pointsEarned > 0;
  const isJokerWin = isWin && isJoker;

  return (
    <div className={`rounded-xl px-4 py-3 text-center border ${
      isJokerWin
        ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
        : isWin
        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
        : "bg-white/3 border-white/6 text-slate-500"
    }`}>
      <p className="font-black text-sm">
        {isJokerWin ? "🃏 מכה כפולה! " : isWin ? "🏆 " : ""}
        {pointsEarned} נקודות
      </p>
      {pointsBreakdown && (
        <p className="text-[10px] font-medium mt-1 opacity-70 leading-relaxed">{pointsBreakdown}</p>
      )}
    </div>
  );
}
