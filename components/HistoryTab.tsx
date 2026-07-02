"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";

interface ScoredPrediction {
  id: string;
  matchId: string;
  matchDate: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  realHomeScore?: number;
  realAwayScore?: number;
  fullFinalHomeScore?: number;
  fullFinalAwayScore?: number;
  extraTime?: boolean;
  penalties?: boolean;
  pointsEarned?: number;
  pointsBreakdown?: string;
  bonusAnswer?: boolean | null;
  bonusPointsEarned?: number;
  bonusCorrectAnswer?: boolean | null;
  isJoker?: boolean;
}

interface StatsCardProps { label: string; value: string | number; sub?: string; color?: string }
function StatsCard({ label, value, sub, color = "text-white" }: StatsCardProps) {
  return (
    <div className="bg-white/3 border border-white/6 rounded-xl p-4 text-center">
      <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-600 font-bold mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-700 mt-0.5">{sub}</p>}
    </div>
  );
}

export function HistoryTab({ userId }: { userId: string }) {
  const [preds, setPreds] = useState<ScoredPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "Predictions"),
      where("userId", "==", userId),
      orderBy("matchDate", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setPreds(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ScoredPrediction)));
      setLoading(false);
    });
    return () => unsub();
  }, [userId]);

  const scored = preds.filter((p) => p.pointsEarned !== undefined);
  const totalMain = scored.reduce((sum, p) => sum + (p.pointsEarned ?? 0), 0);
  const totalBonus = scored.reduce((sum, p) => sum + (p.bonusPointsEarned ?? 0), 0);
  const bullseyes = scored.filter((p) => p.realHomeScore !== undefined && p.predictedHomeScore === p.realHomeScore && p.predictedAwayScore === p.realAwayScore).length;
  const correct = scored.filter((p) => (p.pointsEarned ?? 0) >= 1).length;
  const avgPts = scored.length > 0 ? ((totalMain + totalBonus) / scored.length).toFixed(1) : "–";
  const pctCorrect = scored.length > 0 ? Math.round((correct / scored.length) * 100) : 0;

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
    </div>
  );

  return (
    <section className="space-y-5" dir="rtl">
      <div>
        <h2 className="text-lg font-black text-white">היסטוריית ניחושים</h2>
        <p className="text-xs text-slate-700 font-medium mt-0.5">{preds.length} ניחושים סה״כ · {scored.length} נוקדו</p>
      </div>

      {/* Stats grid */}
      {scored.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatsCard label="סה״כ נקודות" value={totalMain + totalBonus} color="text-amber-400" />
          <StatsCard label="ממוצע למשחק" value={avgPts} sub="נקודות" color="text-emerald-400" />
          <StatsCard label="% כיוון נכון" value={`${pctCorrect}%`} sub={`${correct}/${scored.length}`} color="text-blue-400" />
          <StatsCard label="פגיעות בול 🎯" value={bullseyes} color="text-purple-400" />
        </div>
      )}

      {/* Prediction list */}
      {preds.length === 0 ? (
        <div className="text-center py-16 border border-white/4 border-dashed rounded-2xl text-slate-700 text-sm">
          עוד לא ניחשת אף משחק
        </div>
      ) : (
        <div className="space-y-2">
          {preds.map((p) => {
            const isScored = p.pointsEarned !== undefined;
            const pts = (p.pointsEarned ?? 0) + (p.bonusPointsEarned ?? 0);
            const isBull = isScored && p.predictedHomeScore === p.realHomeScore && p.predictedAwayScore === p.realAwayScore;
            const isCorrectDir = isScored && (p.pointsEarned ?? 0) >= 1;
            const colorClass = !isScored ? "border-white/5" : pts >= 6 ? "border-emerald-500/25 bg-emerald-500/5" : pts >= 3 ? "border-teal-500/20 bg-teal-500/4" : pts >= 1 ? "border-blue-500/20 bg-blue-500/4" : "border-white/5";

            return (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${colorClass} bg-white/2`}>
                {/* Left: date */}
                <div className="shrink-0 text-center w-10">
                  <p className="text-[10px] text-slate-700 font-bold leading-tight">
                    {p.matchDate?.slice(5).replace("-", "/")}
                  </p>
                  {p.isJoker && <span className="text-[9px]">🃏</span>}
                </div>

                {/* Center: scores */}
                <div className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
                  {/* Prediction */}
                  <span className="text-sm font-black text-slate-300 tabular-nums">
                    {p.predictedHomeScore} – {p.predictedAwayScore}
                  </span>
                  {isScored && p.realHomeScore !== undefined && (
                    <>
                      <span className="text-slate-700 text-xs">←</span>
                      <span className={`text-sm font-black tabular-nums ${isBull ? "text-emerald-400" : "text-slate-500"}`}>
                        {p.realHomeScore} – {p.realAwayScore}
                      </span>
                      {p.extraTime && (
                        <span className="text-[9px] font-bold text-slate-600 border border-white/8 px-1 py-0.5 rounded leading-none">
                          {p.penalties ? "פנד׳" : "אח״מ"}
                          {p.fullFinalHomeScore !== undefined && p.fullFinalHomeScore !== p.realHomeScore &&
                            ` (${p.fullFinalHomeScore}-${p.fullFinalAwayScore})`}
                        </span>
                      )}
                    </>
                  )}
                  {isBull && <span className="text-[10px] font-black text-emerald-400">בול! 🎯</span>}
                  {!isScored && (
                    <span className="text-[10px] text-slate-700 bg-white/3 border border-white/6 px-1.5 py-0.5 rounded">
                      ממתין לתוצאה
                    </span>
                  )}
                </div>

                {/* Right: points */}
                <div className="shrink-0 text-right">
                  {isScored ? (
                    <div className="flex flex-col items-end">
                      <span className={`text-base font-black tabular-nums ${pts > 0 ? "text-amber-400" : "text-slate-700"}`}>
                        {pts > 0 ? `+${pts}` : "0"}
                      </span>
                      {(p.bonusPointsEarned ?? 0) > 0 && (
                        <span className="text-[9px] text-blue-400 font-bold">+{p.bonusPointsEarned} בונוס</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-700 text-xs">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
