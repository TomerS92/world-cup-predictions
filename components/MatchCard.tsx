"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  doc, setDoc, collection, query, where, getDocs, serverTimestamp, updateDoc, onSnapshot,
} from "firebase/firestore";
import { getBonusQuestion } from "@/lib/bonusQuestions";

const LOCK_BEFORE_MS = 15 * 60 * 1000; // 15 minutes

function computeIsLocked(rawStartTime: string): boolean {
  return new Date(rawStartTime).getTime() - Date.now() <= LOCK_BEFORE_MS;
}

interface MatchCardProps {
  userId: string;
  matchId: string;
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  startTime: string;
  matchDate: string;
  rawStartTime: string;
}

type MsgType = "success" | "error" | "warning";
type InlineMsg = { type: MsgType; text: string } | null;

export function MatchCard({
  userId, matchId, homeTeam, homeLogo, awayTeam, awayLogo,
  startTime, matchDate, rawStartTime,
}: MatchCardProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [isLocked, setIsLocked] = useState(() => computeIsLocked(rawStartTime));
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [isJoker, setIsJoker]     = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [hasPrediction, setHasPrediction] = useState(false);
  const [msg, setMsg] = useState<InlineMsg>(null);

  // Scored results
  const [pointsEarned, setPointsEarned]       = useState<number | null>(null);
  const [pointsBreakdown, setPointsBreakdown] = useState<string | null>(null);
  const [realHomeScore, setRealHomeScore]     = useState<number | null>(null);
  const [realAwayScore, setRealAwayScore]     = useState<number | null>(null);

  // Bonus question — pass teams so player_scores questions use the right player
  const bonusQ = getBonusQuestion(matchId, homeTeam, awayTeam);
  const [bonusAnswer, setBonusAnswer]           = useState<boolean | null>(null);
  const [bonusPointsEarned, setBonusPointsEarned] = useState<number | null>(null);
  const [bonusCorrectAnswer, setBonusCorrectAnswer] = useState<boolean | null>(null);
  const [isSavingBonus, setIsSavingBonus]       = useState(false);

  // Dynamic lock: re-check every 30 s so the card locks automatically at T-15 min
  useEffect(() => {
    if (isLocked) return; // already locked, no need to poll
    const id = setInterval(() => {
      if (computeIsLocked(rawStartTime)) setIsLocked(true);
    }, 30_000);
    return () => clearInterval(id);
  }, [isLocked, rawStartTime]);

  // Auto-dismiss messages
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  // Load + live-update prediction via real-time listener
  useEffect(() => {
    if (!userId || !matchId) return;
    const unsub = onSnapshot(
      doc(db, "Predictions", `${userId}_${matchId}`),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        setHomeScore(d.predictedHomeScore?.toString() ?? "");
        setAwayScore(d.predictedAwayScore?.toString() ?? "");
        setIsJoker(d.isJoker ?? false);
        setHasPrediction(true);
        if (d.pointsEarned !== undefined)    setPointsEarned(d.pointsEarned);
        if (d.pointsBreakdown !== undefined) setPointsBreakdown(d.pointsBreakdown);
        if (d.realHomeScore !== undefined)   setRealHomeScore(d.realHomeScore);
        if (d.realAwayScore !== undefined)   setRealAwayScore(d.realAwayScore);
        if (d.bonusAnswer !== undefined)     setBonusAnswer(d.bonusAnswer);
        if (d.bonusPointsEarned !== undefined) setBonusPointsEarned(d.bonusPointsEarned);
        if (d.bonusCorrectAnswer !== undefined) setBonusCorrectAnswer(d.bonusCorrectAnswer);
      },
      (e) => console.error("Prediction listener error:", e)
    );
    return () => unsub();
  }, [userId, matchId]);

  // ── Joker toggle ────────────────────────────────────────────────────────────
  const handleJokerToggle = async () => {
    if (isLocked) return;
    if (isJoker) { setIsJoker(false); return; }
    try {
      const snap = await getDocs(
        query(collection(db, "Predictions"), where("userId", "==", userId))
      );
      const alreadyUsed = snap.docs.some(
        (d) => d.data().isJoker === true
          && d.data().matchDate === matchDate
          && d.data().matchId !== matchId
      );
      if (alreadyUsed) {
        setMsg({ type: "warning", text: "כבר השתמשת בג׳וקר על משחק אחר היום." });
        return;
      }
      setIsJoker(true);
    } catch {
      setMsg({ type: "error", text: "שגיאה בבדיקת הג׳וקר, נסה שוב." });
    }
  };

  // ── Save prediction ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (isLocked) return;
    if (homeScore === "" || awayScore === "") {
      setMsg({ type: "error", text: "חובה למלא את שתי התוצאות." });
      return;
    }
    const h = Number(homeScore), a = Number(awayScore);

    // Optimistic: update UI immediately before Firestore round-trip
    const prevHasPrediction = hasPrediction;
    setHasPrediction(true);
    setMsg({ type: "success", text: "הניחוש נשמר! 🏆" });

    setIsSaving(true);
    try {
      await setDoc(doc(db, "Predictions", `${userId}_${matchId}`), {
        userId, matchId, matchDate,
        predictedHomeScore: h,
        predictedAwayScore: a,
        isJoker,
        bonusAnswer: bonusAnswer ?? null,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      // Revert optimistic update on failure
      setHasPrediction(prevHasPrediction);
      setMsg({ type: "error", text: `שגיאה: ${e.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save bonus answer ──────────────────────────────────────────────────────
  const handleBonusAnswer = async (answer: boolean) => {
    if (isLocked) return;
    setBonusAnswer(answer);
    if (!hasPrediction) return; // will be saved with the main prediction
    setIsSavingBonus(true);
    try {
      await updateDoc(doc(db, "Predictions", `${userId}_${matchId}`), {
        bonusAnswer: answer,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error saving bonus:", e);
    } finally {
      setIsSavingBonus(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const jokerOn = isJoker && !isLocked;
  const matchStatus: "upcoming" | "locked_no_result" | "scored" =
    !isLocked ? "upcoming"
    : pointsEarned === null ? "locked_no_result"
    : "scored";

  return (
    <article className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 ${
      jokerOn
        ? "bg-gradient-to-b from-[#1C1400] to-[#0E0A00] border-amber-500/50 shadow-[0_0_28px_rgba(245,158,11,0.15)]"
        : isLocked
        ? "bg-[#0C1420] border-white/10"
        : "bg-gradient-to-b from-[#101E35] to-[#0A1525] border-white/12 hover:border-emerald-500/30 shadow-lg shadow-black/30"
    }`}>

      {/* Status bar */}
      <MatchStatusBar
        startTime={startTime}
        isLocked={isLocked}
        jokerOn={jokerOn}
        matchStatus={matchStatus}
      />

      <div className="p-5 space-y-4">
        {/* Real result banner */}
        {isLocked && realHomeScore !== null && (
          <FinalScoreBanner home={realHomeScore} away={realAwayScore!} />
        )}

        {/* Teams + score inputs */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <TeamCol name={homeTeam} logo={homeLogo} />
          <ScoreArea
            homeVal={homeScore}
            awayVal={awayScore}
            isLocked={isLocked}
            onHomeChange={(v) => setHomeScore(v)}
            onAwayChange={(v) => setAwayScore(v)}
          />
          <TeamCol name={awayTeam} logo={awayLogo} align="right" />
        </div>

        {/* Bonus question */}
        <BonusQuestionRow
          question={bonusQ}
          answer={bonusAnswer}
          isLocked={isLocked}
          pointsEarned={bonusPointsEarned}
          correctAnswer={bonusCorrectAnswer}
          isSaving={isSavingBonus}
          onAnswer={handleBonusAnswer}
        />

        {/* Actions */}
        {!isLocked && (
          <div className="space-y-2 pt-1">
            <button
              onClick={handleJokerToggle}
              className={`w-full h-10 rounded-xl text-xs font-black border transition-all duration-200 ${
                jokerOn
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-white/3 text-slate-500 border-white/6 hover:text-amber-400 hover:border-amber-500/25 hover:bg-amber-500/5"
              }`}
            >
              🃏 {jokerOn ? "ג׳וקר פעיל — נקודות כפולות!" : "הפעל ג׳וקר (×2 נקודות)"}
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-11 rounded-xl text-sm font-black bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-md shadow-emerald-600/20 transition-all duration-150 disabled:opacity-50 disabled:cursor-wait"
            >
              {isSaving ? "שומר..." : hasPrediction ? "עדכן ניחוש" : "נעל ניחוש ✓"}
            </button>
          </div>
        )}

        {/* Inline message */}
        {msg && (
          <p className={`text-xs font-bold text-center py-2 px-3 rounded-xl border ${
            msg.type === "success" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : msg.type === "warning" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
            : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            {msg.text}
          </p>
        )}

        {/* Points result */}
        {matchStatus !== "upcoming" && hasPrediction && (
          <PointsResultBanner
            pointsEarned={pointsEarned}
            breakdown={pointsBreakdown}
            bonusPointsEarned={bonusPointsEarned}
            bonusCorrectAnswer={bonusCorrectAnswer}
            isJoker={isJoker}
          />
        )}
      </div>
    </article>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MatchStatusBar({
  startTime, isLocked, jokerOn, matchStatus,
}: {
  startTime: string;
  isLocked: boolean;
  jokerOn: boolean;
  matchStatus: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-black/20 border-b border-white/8">
      <span className="text-[11px] font-bold text-slate-400">{startTime}</span>
      <div className="flex items-center gap-2">
        {jokerOn && (
          <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
            🃏 ג׳וקר
          </span>
        )}
        {isLocked && matchStatus === "locked_no_result" && (
          <span className="text-[10px] font-black text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
            🔒 ממתין לתוצאה
          </span>
        )}
        {isLocked && matchStatus === "scored" && (
          <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
            ✓ נוקד
          </span>
        )}
        {!isLocked && (
          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            פתוח לניחוש
          </span>
        )}
      </div>
    </div>
  );
}

function FinalScoreBanner({ home, away }: { home: number; away: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-l from-emerald-900/40 to-teal-900/20 px-4 py-3">
      {/* Subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent pointer-events-none" />
      <div className="relative flex items-center justify-center gap-3">
        <span className="text-[11px] font-black text-emerald-400/80 tracking-widest uppercase">
          תוצאה רשמית
        </span>
        <span className="w-px h-4 bg-emerald-500/30" />
        <span className="text-3xl font-black text-white tabular-nums tracking-tight drop-shadow-sm">
          {home} – {away}
        </span>
      </div>
    </div>
  );
}

function TeamCol({ name, logo, align = "left" }: { name: string; logo: string; align?: "left" | "right" }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${align === "right" ? "items-center" : "items-center"}`}>
      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center overflow-hidden">
        {logo
          ? <img src={logo} alt={name} className="w-9 h-9 object-contain" />
          : <span className="text-2xl">⚽</span>}
      </div>
      <span className="text-[11px] font-bold text-slate-300 text-center leading-tight max-w-[70px]">{name}</span>
    </div>
  );
}

function ScoreBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      min={0}
      max={20}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "–"}
      className="w-12 h-12 rounded-xl bg-white/6 border border-white/12 text-center text-xl font-black text-white focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

function ScoreArea({
  homeVal, awayVal, isLocked, onHomeChange, onAwayChange,
}: {
  homeVal: string; awayVal: string; isLocked: boolean;
  onHomeChange: (v: string) => void; onAwayChange: (v: string) => void;
}) {
  if (isLocked) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-12 h-12 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center">
          <span className="text-xl font-black text-slate-400">{homeVal !== "" ? homeVal : "–"}</span>
        </div>
        <span className="text-slate-600 font-black text-lg">:</span>
        <div className="w-12 h-12 rounded-xl bg-white/4 border border-white/8 flex items-center justify-center">
          <span className="text-xl font-black text-slate-400">{awayVal !== "" ? awayVal : "–"}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <ScoreBox value={homeVal} onChange={onHomeChange} />
      <span className="text-slate-600 font-black text-lg">:</span>
      <ScoreBox value={awayVal} onChange={onAwayChange} />
    </div>
  );
}

function BonusQuestionRow({
  question, answer, isLocked, pointsEarned, correctAnswer, isSaving, onAnswer,
}: {
  question: { text: string; tag: string; points: number };
  answer: boolean | null;
  isLocked: boolean;
  pointsEarned: number | null;
  correctAnswer: boolean | null;
  isSaving: boolean;
  onAnswer: (v: boolean) => void;
}) {
  const answered = answer !== null;
  const scored   = pointsEarned !== null;

  return (
    <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-base">{question.tag}</span>
        <span className="text-[11px] font-bold text-blue-300/80 leading-snug flex-1">{question.text}</span>
        {isSaving && <span className="text-[10px] text-slate-600">שומר...</span>}
      </div>

      {/* Answered + scored */}
      {scored ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
            answer ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                   : "bg-red-500/10 text-red-400 border-red-500/20"
          }`}>
            ענית: {answer ? "כן" : "לא"}
          </span>
          {correctAnswer !== null && (
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
              correctAnswer ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}>
              תשובה: {correctAnswer ? "כן" : "לא"}
            </span>
          )}
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
            pointsEarned > 0 ? "bg-blue-500/15 text-blue-300 border-blue-500/20"
                             : "bg-white/4 text-slate-600 border-white/8"
          }`}>
            {pointsEarned > 0 ? `+${pointsEarned} נק׳ ✓` : "0 נק׳"}
          </span>
        </div>
      ) : isLocked ? (
        /* Locked but not yet scored */
        <div className="flex gap-2">
          {[true, false].map((v) => (
            <span key={String(v)} className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${
              answer === v
                ? "bg-blue-500/15 text-blue-300 border-blue-500/25"
                : "bg-white/3 text-slate-600 border-white/6"
            }`}>
              {v ? "כן" : "לא"}
            </span>
          ))}
        </div>
      ) : (
        /* Open — interactive buttons */
        <div className="flex gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              onClick={() => onAnswer(v)}
              className={`text-[11px] font-black px-3 py-1.5 rounded-lg border transition-all duration-150 ${
                answer === v
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-sm"
                  : "bg-white/3 text-slate-500 border-white/8 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/20"
              }`}
            >
              {v ? "✓ כן" : "✗ לא"}
            </button>
          ))}
          {answered && (
            <span className="self-center text-[10px] text-slate-600">נבחר {answer ? "כן" : "לא"}</span>
          )}
        </div>
      )}
    </div>
  );
}

function useCountUp(target: number | null, duration = 800) {
  const [display, setDisplay] = useState(0);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;
    if (target === prev.current) return; // no change
    prev.current = target;

    if (target === 0) { setDisplay(0); return; }

    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return display;
}

function PointsResultBanner({
  pointsEarned, breakdown, bonusPointsEarned, bonusCorrectAnswer, isJoker,
}: {
  pointsEarned: number | null;
  breakdown: string | null;
  bonusPointsEarned: number | null;
  bonusCorrectAnswer: boolean | null;
  isJoker: boolean;
}) {
  const totalPts = (pointsEarned ?? 0) + (bonusPointsEarned ?? 0);
  const animated = useCountUp(pointsEarned !== null ? totalPts : null);

  if (pointsEarned === null) {
    return (
      <div className="text-center py-3 text-[11px] text-slate-500 font-bold">
        ממתין לתוצאה רשמית...
      </div>
    );
  }

  const color = totalPts >= 7 ? "emerald" : totalPts >= 5 ? "emerald" : totalPts >= 3 ? "teal" : totalPts >= 1 ? "blue" : "slate";

  // Derive label from the breakdown text so it's always accurate
  const label = (() => {
    if (totalPts === 0) return "ללא נקודות";
    if (breakdown?.includes("תוצאה מדויקת")) return "בול! 🎯";
    if (breakdown?.includes("הפרש מדויק")) return "הפרש מדויק!";
    if (breakdown?.includes("ניחשת את המנצח")) return "ניחשת כיוון!";
    if (pointsEarned > 0) return "פגיעה חלקית!";
    return "בונוס בלבד 🎁";
  })();

  return (
    <div className={`rounded-xl border px-4 py-3 space-y-2 ${
      totalPts > 0
        ? `bg-${color}-500/8 border-${color}-500/25`
        : "bg-white/3 border-white/8"
    }`}>
      <div className="flex items-center justify-center gap-2 animate-count-up">
        <span className={`text-3xl font-black tabular-nums ${
          totalPts > 0 ? `text-${color}-400` : "text-slate-500"
        }`}>
          {animated}
        </span>
        <div className="flex flex-col items-start">
          <span className={`text-sm font-black leading-tight ${
            totalPts > 0 ? `text-${color}-400` : "text-slate-500"
          }`}>
            {"נקודות"}
            {isJoker && totalPts > 0 && (
              <span className="text-amber-400"> {"🃏"}</span>
            )}
          </span>
          {totalPts > 0 && (
            <span className={`text-[10px] font-black text-${color}-500/70`}>
              {label}
            </span>
          )}
        </div>
      </div>

      {/* Breakdown rows */}
      {(breakdown || bonusPointsEarned !== null) && (
        <div className="border-t border-white/8 pt-2 space-y-1">
          {breakdown && breakdown !== "אין נקודות" && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-medium">
                {breakdown}
              </span>
              <span className="text-[11px] font-black text-slate-300 tabular-nums">
                +{pointsEarned}
              </span>
            </div>
          )}
          {bonusPointsEarned !== null && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-medium">
                {"שאלת בונוס — "}
                {bonusCorrectAnswer !== null
                  ? bonusCorrectAnswer ? "כן" : "לא"
                  : "?"}
              </span>
              <span className={`text-[11px] font-black tabular-nums ${
                bonusPointsEarned > 0 ? "text-blue-400" : "text-slate-600"
              }`}>
                {bonusPointsEarned > 0 ? `+${bonusPointsEarned}` : "0"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
