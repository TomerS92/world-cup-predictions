"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc, getDoc, collection, getDocs, query, orderBy, DocumentData,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MatchCard } from "@/components/MatchCard";
import { getEspnScoreboardUrl, activeConfig } from "@/lib/config";

interface RealMatch {
  id: string;
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  startTime: string;
  matchDate: string;
  isLocked: boolean;
}

async function triggerAutoSync() {
  try { await fetch("/api/sync-results"); } catch { /* silent */ }
}

type FilterKey = "all" | "today" | "open" | "locked";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",    label: "הכל" },
  { key: "today",  label: "היום" },
  { key: "open",   label: "פתוחים" },
  { key: "locked", label: "ננעלו" },
];

export default function Dashboard() {
  const [user, setUser] = useState<DocumentData | null>(null);
  const [leaderboard, setLeaderboard] = useState<DocumentData[]>([]);
  const [realMatches, setRealMatches] = useState<RealMatch[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [activeTab, setActiveTab] = useState<"matches" | "leaderboard">("matches");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { router.push("/"); return; }

      const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
      if (userDoc.exists()) setUser({ id: currentUser.uid, ...userDoc.data() });

      try {
        const q = query(collection(db, "Users"), orderBy("totalPoints", "desc"));
        const snap = await getDocs(q);
        setLeaderboard(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }

      setLoadingUser(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(getEspnScoreboardUrl());
        const data = await res.json();
        if (data?.events) {
          setRealMatches(
            data.events.map((event: any) => {
              const comp = event.competitions[0];
              const home = comp.competitors.find((c: any) => c.homeAway === "home");
              const away = comp.competitors.find((c: any) => c.homeAway === "away");
              const d = new Date(event.date);
              const pad = (n: number) => String(n).padStart(2, "0");
              return {
                id: event.id,
                homeTeam: home.team.displayName,
                homeLogo: home.team.logo ?? "",
                awayTeam: away.team.displayName,
                awayLogo: away.team.logo ?? "",
                startTime: d.toLocaleString("he-IL", {
                  weekday: "short", month: "numeric", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                }),
                matchDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
                isLocked: d < new Date(),
              };
            })
          );
        }
      } catch (e) { console.error(e); }
      finally { setLoadingMatches(false); }
    })();
    triggerAutoSync();
  }, []);

  const todayStr = (() => {
    const t = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  })();

  const filteredMatches = realMatches.filter((m) => {
    if (activeFilter === "open")   return !m.isLocked;
    if (activeFilter === "locked") return m.isLocked;
    if (activeFilter === "today")  return m.matchDate === todayStr;
    return true;
  });

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060A10]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-[3px] border-emerald-500/30 border-t-emerald-400 animate-spin" />
          <span className="text-xs font-bold text-slate-500 tracking-widest">טוען...</span>
        </div>
      </div>
    );
  }

  const openCount  = realMatches.filter((m) => !m.isLocked).length;
  const lockedCount = realMatches.filter((m) => m.isLocked).length;

  return (
    <div className="min-h-screen bg-[#060A10] text-slate-100 selection:bg-emerald-500/20">
      {/* Pitch texture backdrop */}
      <div className="fixed inset-0 pitch-grid pointer-events-none opacity-100" aria-hidden />

      <div className="relative max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-10 space-y-6">

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <header className="relative overflow-hidden bg-gradient-to-l from-[#0E1828] via-[#0D1520] to-[#0B1218] border border-white/6 rounded-2xl px-5 py-4 shadow-xl">
          {/* Green corner accent */}
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 via-emerald-500/50 to-transparent rounded-r-full" />

          <div className="flex items-center justify-between gap-4">
            {/* User info */}
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <Avatar className="h-11 w-11 border-2 border-emerald-500/30 ring-2 ring-emerald-500/10">
                  <AvatarImage src={user?.photoURL} alt={user?.displayName} />
                  <AvatarFallback className="bg-[#1A2640] text-white font-black text-base">
                    {user?.displayName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0D1520] rounded-full" />
              </div>
              <div>
                <p className="text-sm font-black text-white leading-tight">{user?.displayName}</p>
                <p className="text-xs text-emerald-400 font-bold mt-0.5">
                  🏆 {user?.totalPoints ?? 0} נקודות
                </p>
              </div>
            </div>

            {/* Right: competition badge + nav */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <span className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-500 border border-white/6 bg-white/3 px-3 py-1.5 rounded-full">
                {activeConfig.icon} {activeConfig.label}
              </span>
              <Link href="/rules">
                <button className="text-xs font-bold text-slate-400 hover:text-white border border-white/6 bg-white/3 hover:bg-white/6 px-3 py-1.5 rounded-xl transition-all">
                  חוקים 📖
                </button>
              </Link>
              <button
                className="text-xs font-bold text-slate-500 hover:text-white border border-white/5 bg-white/2 hover:bg-white/5 px-3 py-1.5 rounded-xl transition-all"
                onClick={() => signOut(auth)}
              >
                יציאה
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
            {[
              { label: "משחקים", value: realMatches.length, icon: "⚽" },
              { label: "פתוחים",  value: openCount,          icon: "🟢" },
              { label: "ננעלו",   value: lockedCount,         icon: "🔒" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-base font-black text-white">{s.icon} {s.value}</p>
                <p className="text-[10px] text-slate-600 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </header>

        {/* ── TAB NAV ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 bg-[#0E1520]/80 border border-white/5 rounded-xl p-1 gap-1">
          {(["matches", "leaderboard"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 rounded-lg text-sm font-black tracking-wide transition-all duration-200 ${
                activeTab === tab
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab === "matches" ? "⚽ זירת הניחושים" : "📊 דירוג החברה"}
            </button>
          ))}
        </div>

        {/* ── MATCHES TAB ────────────────────────────────────────────────────── */}
        {activeTab === "matches" && (
          <section className="space-y-5">
            {/* Subheader */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">משחקים קרובים</h2>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  {loadingMatches ? "טוען נתונים..." : `${filteredMatches.length} משחקים`}
                </p>
              </div>
              {loadingMatches && (
                <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  LIVE
                </div>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`shrink-0 text-xs font-black px-4 py-1.5 rounded-full border transition-all duration-200 ${
                    activeFilter === key
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-600/20"
                      : "bg-white/3 text-slate-500 border-white/6 hover:text-slate-200 hover:border-white/12"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Match grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!loadingMatches && filteredMatches.length === 0 && (
                <div className="col-span-full text-center py-16 text-slate-600 text-sm border border-white/4 rounded-2xl border-dashed">
                  אין משחקים בקטגוריה זו
                </div>
              )}
              {filteredMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  userId={user?.id}
                  matchId={match.id}
                  homeTeam={match.homeTeam}
                  homeLogo={match.homeLogo}
                  awayTeam={match.awayTeam}
                  awayLogo={match.awayLogo}
                  startTime={match.startTime}
                  matchDate={match.matchDate}
                  isLocked={match.isLocked}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── LEADERBOARD TAB ────────────────────────────────────────────────── */}
        {activeTab === "leaderboard" && (
          <section className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg font-black text-white">טבלת האליפות</h2>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">מתעדכן אוטומטית</p>
              </div>
              <Link href="/rules">
                <button className="text-xs font-bold text-slate-500 hover:text-white border border-white/6 bg-white/3 hover:bg-white/6 px-3 py-1.5 rounded-xl transition-all">
                  חוקים ⚖️
                </button>
              </Link>
            </div>

            {/* Top 3 podium */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-2">
                {[
                  { idx: 1, player: leaderboard[1] },
                  { idx: 0, player: leaderboard[0] },
                  { idx: 2, player: leaderboard[2] },
                ].map(({ idx, player }) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const heights = ["h-24", "h-32", "h-20"];
                  const glows = [
                    "shadow-yellow-500/10",
                    "shadow-amber-400/20 border-amber-500/30",
                    "shadow-orange-500/10",
                  ];
                  const isMe = player?.id === user?.id;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <Avatar className={`border-2 ${isMe ? "border-blue-500/50" : "border-white/10"} ${idx === 0 ? "h-14 w-14" : "h-11 w-11"}`}>
                        <AvatarImage src={player?.photoURL} />
                        <AvatarFallback className="bg-[#1A2640] text-white font-bold text-sm">
                          {player?.displayName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-[11px] font-black text-slate-300 text-center leading-tight max-w-[80px] truncate">
                        {player?.displayName}
                      </p>
                      <div className={`w-full ${heights[idx === 0 ? 1 : idx === 1 ? 0 : 2]} bg-gradient-to-t from-[#0E1520] to-[#131E30] border ${glows[idx === 0 ? 1 : idx === 1 ? 0 : 2]} border-white/6 rounded-t-xl flex flex-col items-center justify-center gap-1 shadow-lg`}>
                        <span className="text-2xl">{medals[idx]}</span>
                        <span className="text-xs font-black text-white">{player?.totalPoints ?? 0}</span>
                        <span className="text-[9px] text-slate-600">נק׳</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full list */}
            <div className="space-y-1.5">
              {leaderboard.map((player, index) => {
                const isMe = player.id === user?.id;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      isMe
                        ? "bg-blue-600/8 border-blue-500/25"
                        : "bg-white/2 border-white/4 hover:bg-white/4 hover:border-white/8"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 shrink-0 text-center">
                        {index < 3
                          ? <span className="text-base">{medals[index]}</span>
                          : <span className="text-[11px] font-black text-slate-600">#{index + 1}</span>
                        }
                      </div>
                      <Avatar className={`h-9 w-9 border ${isMe ? "border-blue-400/40" : "border-white/8"}`}>
                        <AvatarImage src={player.photoURL} />
                        <AvatarFallback className="bg-[#1A2640] text-white text-xs font-bold">
                          {player.displayName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-bold ${isMe ? "text-blue-300" : "text-slate-200"}`}>
                            {player.displayName}
                          </span>
                          {isMe && (
                            <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black">
                              אתה
                            </span>
                          )}
                        </div>
                        {(player.currentStreak ?? 0) >= 3 && (
                          <span className="text-[10px] text-orange-400 font-bold">
                            🔥 רצף {player.currentStreak}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`text-sm font-black px-3 py-1 rounded-lg border tabular-nums ${
                      isMe ? "bg-blue-600/10 border-blue-500/20 text-blue-300" : "bg-white/4 border-white/5 text-slate-300"
                    }`}>
                      {player.totalPoints ?? 0}
                      <span className="text-[10px] opacity-50 font-medium ml-0.5">נק׳</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
