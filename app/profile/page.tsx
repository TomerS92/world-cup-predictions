"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, collection, query, where, orderBy, onSnapshot, DocumentData } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Prediction {
  id: string;
  matchDate: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  realHomeScore?: number;
  realAwayScore?: number;
  pointsEarned?: number;
  bonusPointsEarned?: number;
  isJoker?: boolean;
}

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-white/3 border border-white/6 rounded-2xl p-4">
      <span className={`text-2xl font-black tabular-nums ${color}`}>{value}</span>
      <span className="text-[11px] text-slate-600 font-bold">{label}</span>
    </div>
  );
}

export default function ProfilePage() {
  const [user, setUser]   = useState<DocumentData | null>(null);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Auth + live user data
  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    let unsubPreds: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (cu) => {
      if (!cu) { router.push("/"); return; }

      unsubUser = onSnapshot(doc(db, "Users", cu.uid), (snap) => {
        if (snap.exists()) setUser({ id: cu.uid, ...snap.data() });
        setLoading(false);
      });

      // Last 20 predictions
      const q = query(
        collection(db, "Predictions"),
        where("userId", "==", cu.uid),
        orderBy("matchDate", "desc")
      );
      unsubPreds = onSnapshot(q, (snap) => {
        setPreds(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Prediction)));
      });
    });

    return () => { unsubAuth(); unsubUser?.(); unsubPreds?.(); };
  }, [router]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#070E1A]">
      <div className="w-8 h-8 rounded-full border-[3px] border-emerald-500/20 border-t-emerald-400 animate-spin" />
    </div>
  );

  // ── Stats ──────────────────────────────────────────────────────────────────
  const scored   = preds.filter((p) => p.pointsEarned !== undefined);
  const totalPts = scored.reduce((s, p) => s + (p.pointsEarned ?? 0) + (p.bonusPointsEarned ?? 0), 0);
  const correct  = scored.filter((p) => (p.pointsEarned ?? 0) >= 1).length;
  const bullseyes = scored.filter(
    (p) => p.realHomeScore !== undefined &&
           p.predictedHomeScore === p.realHomeScore &&
           p.predictedAwayScore === p.realAwayScore
  ).length;
  const avgPts   = scored.length > 0 ? (totalPts / scored.length).toFixed(1) : "–";
  const pct      = scored.length > 0 ? `${Math.round((correct / scored.length) * 100)}%` : "–";
  const streak   = user?.currentStreak ?? 0;

  return (
    <div className="min-h-screen bg-[#070E1A] text-slate-100" dir="rtl">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden
        style={{ backgroundImage: "repeating-linear-gradient(180deg, rgba(16,185,129,0.025) 0px, rgba(16,185,129,0.025) 60px, transparent 60px, transparent 120px)" }}
      />
      <div className="fixed top-0 inset-x-0 h-64 bg-gradient-to-b from-emerald-900/8 to-transparent pointer-events-none" />

      <div className="relative max-w-xl mx-auto px-4 py-8 space-y-5">

        {/* ── Back + Sign out ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard">
            <button className="text-xs font-bold text-slate-500 hover:text-white border border-white/6 bg-white/3 hover:bg-white/6 px-3 py-1.5 rounded-xl transition-all">
              ← חזור לזירה
            </button>
          </Link>
          <button
            onClick={() => signOut(auth)}
            className="text-xs font-bold text-slate-600 hover:text-white border border-white/5 bg-white/2 hover:bg-white/5 px-3 py-1.5 rounded-xl transition-all"
          >
            יציאה
          </button>
        </div>

        {/* ── Profile card ─────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/6 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A1628] to-[#050D18]" />
          <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-amber-500 via-amber-400/40 to-transparent" />

          <div className="relative p-6 flex items-center gap-5">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-amber-500/30 ring-2 ring-amber-500/10 shadow-xl">
                <AvatarImage src={user?.photoURL} />
                <AvatarFallback className="bg-[#0A1628] text-white font-black text-3xl">
                  {user?.displayName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {streak >= 3 && (
                <span className="absolute -bottom-1 -right-1 bg-orange-500 border-2 border-[#050D18] rounded-full px-1.5 py-0.5 text-[9px] font-black text-white">
                  🔥{streak}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-white truncate">{user?.displayName}</h1>
              <p className="text-xs text-slate-600 mt-0.5 truncate">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-black text-amber-400">🏆 {user?.totalPoints ?? 0} נקודות</span>
                {streak >= 1 && (
                  <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg">
                    🔥 רצף {streak} {streak === 1 ? "יום" : "ימים"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats grid ───────────────────────────────────────────────────── */}
        {scored.length > 0 && (
          <div>
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">סטטיסטיקות</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <StatPill label="סה״כ נקודות"   value={totalPts}   color="text-amber-400" />
              <StatPill label="ממוצע למשחק"   value={avgPts}     color="text-emerald-400" />
              <StatPill label="% כיוון נכון"  value={pct}        color="text-blue-400" />
              <StatPill label="פגיעות בול 🎯" value={bullseyes}  color="text-purple-400" />
            </div>
          </div>
        )}

        {/* ── Recent predictions ───────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">ניחושים אחרונים</h2>

          {preds.length === 0 ? (
            <div className="text-center py-12 border border-white/4 border-dashed rounded-2xl text-slate-700 text-sm">
              עוד לא ניחשת אף משחק
            </div>
          ) : (
            <div className="space-y-2">
              {preds.slice(0, 10).map((p) => {
                const isScored = p.pointsEarned !== undefined;
                const pts = (p.pointsEarned ?? 0) + (p.bonusPointsEarned ?? 0);
                const isBull = isScored && p.realHomeScore !== undefined &&
                  p.predictedHomeScore === p.realHomeScore &&
                  p.predictedAwayScore === p.realAwayScore;

                return (
                  <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                    isBull ? "bg-emerald-500/5 border-emerald-500/20" :
                    isScored && pts > 0 ? "bg-white/3 border-white/6" :
                    "bg-white/2 border-white/4"
                  }`}>
                    <span className="shrink-0 text-[10px] text-slate-700 font-bold w-12">
                      {p.matchDate?.slice(5).replace("-", "/")}
                    </span>
                    <div className="flex-1 flex items-center gap-2 min-w-0 flex-wrap">
                      <span className="text-sm font-black text-slate-300 tabular-nums">
                        {p.predictedHomeScore}–{p.predictedAwayScore}
                      </span>
                      {isScored && p.realHomeScore !== undefined && (
                        <>
                          <span className="text-slate-700 text-xs">←</span>
                          <span className={`text-sm font-black tabular-nums ${isBull ? "text-emerald-400" : "text-slate-500"}`}>
                            {p.realHomeScore}–{p.realAwayScore}
                          </span>
                        </>
                      )}
                      {isBull && <span className="text-[10px] text-emerald-400 font-black">בול! 🎯</span>}
                      {p.isJoker && <span className="text-[10px]">🃏</span>}
                      {!isScored && (
                        <span className="text-[10px] text-slate-700">ממתין</span>
                      )}
                    </div>
                    <div className="shrink-0">
                      {isScored ? (
                        <span className={`text-sm font-black tabular-nums ${pts > 0 ? "text-amber-400" : "text-slate-700"}`}>
                          {pts > 0 ? `+${pts}` : "0"}
                        </span>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Join date ────────────────────────────────────────────────────── */}
        {user?.joinedAt && (
          <p className="text-center text-[11px] text-slate-800 font-bold">
            חבר מאז {new Date(user.joinedAt?.toDate?.() ?? user.joinedAt).toLocaleDateString("he-IL")}
          </p>
        )}
      </div>
    </div>
  );
}
