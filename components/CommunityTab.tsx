"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, DocumentData } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface CompletedMatch {
  id: string;
  homeTeam: string; homeLogo: string;
  awayTeam: string; awayLogo: string;
  finalHomeScore: number; finalAwayScore: number;
  startTime: string;
}

interface MatchPrediction {
  userId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  isJoker: boolean;
  bonusAnswer: boolean | null;
  bonusCorrectAnswer: boolean | null;
  bonusPointsEarned: number | null | undefined;
  pointsEarned: number | undefined;
  pointsBreakdown: string | undefined;
}

function teamAbbr(name: string): string {
  // Last word, max 6 chars — "United States" → "States", "Brazil" → "Brazil"
  return name.split(" ").slice(-1)[0].slice(0, 6);
}

export function CommunityTab({
  currentUserId,
  completedMatches,
  leaderboard,
}: {
  currentUserId: string;
  completedMatches: CompletedMatch[];
  leaderboard: DocumentData[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<MatchPrediction[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-select first completed match
  useEffect(() => {
    if (completedMatches.length > 0 && !selectedId) {
      setSelectedId(completedMatches[0].id);
    }
  }, [completedMatches, selectedId]);

  // Fetch predictions whenever selected match changes
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setPredictions([]);
    getDocs(query(collection(db, "Predictions"), where("matchId", "==", selectedId)))
      .then((snap) => {
        const preds = snap.docs.map((d) => d.data() as MatchPrediction);
        // Sort by total points desc; unscored last
        preds.sort((a, b) => {
          const totalA = (a.pointsEarned ?? 0) + (a.bonusPointsEarned ?? 0);
          const totalB = (b.pointsEarned ?? 0) + (b.bonusPointsEarned ?? 0);
          return totalB - totalA;
        });
        setPredictions(preds);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedId]);

  const selectedMatch = completedMatches.find((m) => m.id === selectedId);
  const getUser = (uid: string) => leaderboard.find((u) => u.id === uid);

  if (completedMatches.length === 0) {
    return (
      <div className="text-center text-slate-700 py-16 text-sm border border-white/4 border-dashed rounded-2xl">
        אין משחקים שהסתיימו עדיין
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Match selector (horizontal scroll) ──────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {completedMatches.map((m) => {
          const active = m.id === selectedId;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={`shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border text-[11px] font-black transition-all min-w-[72px] ${
                active
                  ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/20"
                  : "bg-white/3 border-white/8 text-slate-500 hover:text-slate-300 hover:border-white/16"
              }`}
            >
              <span className="leading-none">{teamAbbr(m.homeTeam)}</span>
              <span className={`text-sm font-black tabular-nums ${active ? "text-white" : "text-slate-400"}`}>
                {m.finalHomeScore}–{m.finalAwayScore}
              </span>
              <span className="leading-none">{teamAbbr(m.awayTeam)}</span>
            </button>
          );
        })}
      </div>

      {/* ── Selected match header ────────────────────────────────────────── */}
      {selectedMatch && (
        <div className="bg-[#0A1422]/80 border border-white/8 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            {/* Home */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedMatch.homeLogo && (
                <img src={selectedMatch.homeLogo} className="w-8 h-8 object-contain shrink-0" alt="" />
              )}
              <span className="text-sm font-black text-white truncate">{selectedMatch.homeTeam}</span>
            </div>

            {/* Score */}
            <div className="flex flex-col items-center shrink-0 px-2">
              <span className="text-2xl font-black text-white tabular-nums tracking-tight">
                {selectedMatch.finalHomeScore} – {selectedMatch.finalAwayScore}
              </span>
              <span className="text-[10px] text-slate-600 font-bold">תוצאה סופית</span>
            </div>

            {/* Away */}
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <span className="text-sm font-black text-white truncate text-right">{selectedMatch.awayTeam}</span>
              {selectedMatch.awayLogo && (
                <img src={selectedMatch.awayLogo} className="w-8 h-8 object-contain shrink-0" alt="" />
              )}
            </div>
          </div>
          <p className="text-center text-[10px] text-slate-700 mt-2">{selectedMatch.startTime}</p>
        </div>
      )}

      {/* ── Count ───────────────────────────────────────────────────────── */}
      {!loading && predictions.length > 0 && (
        <p className="text-[11px] font-bold text-slate-700 text-right">
          {predictions.length} ניחושים
        </p>
      )}

      {/* ── Predictions list ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-slate-600 text-sm">
          <span className="w-4 h-4 border-2 border-slate-600/40 border-t-slate-400 rounded-full animate-spin" />
          טוען ניחושים...
        </div>
      ) : predictions.length === 0 ? (
        <div className="text-center text-slate-700 py-12 text-sm border border-white/4 border-dashed rounded-2xl">
          אין ניחושים למשחק זה
        </div>
      ) : (
        <div className="space-y-2">
          {predictions.map((pred, i) => {
            const userData = getUser(pred.userId);
            const isMe = pred.userId === currentUserId;
            const isScored = pred.pointsEarned !== undefined;
            const mainPts = pred.pointsEarned ?? 0;
            const bonusPts = pred.bonusPointsEarned ?? 0;
            const totalPts = mainPts + bonusPts;

            const ptColor = !isScored
              ? "bg-white/3 border-white/6 text-slate-600"
              : totalPts >= 8
              ? "bg-amber-500/15 border-amber-500/25 text-amber-300"
              : totalPts >= 6
              ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
              : totalPts >= 3
              ? "bg-teal-500/15 border-teal-500/20 text-teal-400"
              : totalPts >= 1
              ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
              : "bg-white/4 border-white/6 text-slate-500";

            return (
              <div
                key={pred.userId}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  isMe
                    ? "bg-amber-500/8 border-amber-500/20"
                    : "bg-white/2 border-white/6"
                }`}
              >
                {/* Rank */}
                <span className="text-[11px] font-black text-slate-600 w-5 text-center shrink-0">
                  {isScored ? `#${i + 1}` : "–"}
                </span>

                {/* Avatar */}
                <Avatar className={`h-8 w-8 border shrink-0 ${isMe ? "border-amber-400/40" : "border-white/10"}`}>
                  <AvatarImage src={userData?.photoURL} />
                  <AvatarFallback className="bg-[#0A1628] text-white text-xs font-black">
                    {userData?.displayName?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>

                {/* Name + breakdown */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm font-bold truncate ${isMe ? "text-amber-300" : "text-slate-200"}`}>
                      {userData?.displayName ?? "–"}
                    </span>
                    {isMe && (
                      <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-black shrink-0">אתה</span>
                    )}
                  </div>
                  {isScored && pred.pointsBreakdown && (
                    <p className="text-[10px] text-slate-700 truncate mt-0.5">{pred.pointsBreakdown}</p>
                  )}
                </div>

                {/* Predicted score */}
                <div className="text-center shrink-0">
                  <span className="text-lg font-black text-white tabular-nums">
                    {pred.predictedHomeScore}–{pred.predictedAwayScore}
                  </span>
                  {pred.isJoker && (
                    <span className="block text-[10px] text-amber-400 font-black leading-none">🃏</span>
                  )}
                </div>

                {/* Bonus pill */}
                {isScored && pred.bonusPointsEarned !== null && pred.bonusPointsEarned !== undefined && (
                  <span className={`text-[10px] font-black px-1.5 py-1 rounded-lg shrink-0 border ${
                    pred.bonusPointsEarned > 0
                      ? "bg-blue-500/15 text-blue-300 border-blue-500/20"
                      : "bg-white/4 text-slate-600 border-white/6"
                  }`}>
                    {pred.bonusPointsEarned > 0 ? "B✓" : "B✗"}
                  </span>
                )}

                {/* Total points badge */}
                <div className={`shrink-0 text-sm font-black px-2.5 py-1.5 rounded-xl border tabular-nums min-w-[44px] text-center ${ptColor}`}>
                  {isScored ? totalPts : "?"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
