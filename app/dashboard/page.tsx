"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc, collection, query, orderBy, onSnapshot, DocumentData,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MatchCard } from "@/components/MatchCard";
import { MatchCardSkeleton } from "@/components/MatchCardSkeleton";
import { HistoryTab } from "@/components/HistoryTab";
import { getEspnScoreboardUrl, activeConfig } from "@/lib/config";

interface RealMatch {
  id: string;
  homeTeam: string; homeLogo: string;
  awayTeam: string; awayLogo: string;
  startTime: string; matchDate: string;
  isLocked: boolean;
}

async function triggerAutoSync() {
  try { await fetch("/api/sync-results"); } catch { /* silent */ }
}

type FilterKey = "all" | "today" | "open" | "locked";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "today", label: "היום" },
  { key: "open", label: "פתוחים" },
  { key: "locked", label: "ננעלו" },
];

function todayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`;
}

export default function Dashboard() {
  const [user, setUser]           = useState<DocumentData | null>(null);
  const [leaderboard, setLeaderboard] = useState<DocumentData[]>([]);
  const [matches, setMatches]     = useState<RealMatch[]>([]);
  const [loadingUser, setLoadingUser]   = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [filter, setFilter]       = useState<FilterKey>("all");
  const [tab, setTab]             = useState<"matches" | "leaderboard" | "history">("matches");
  const router = useRouter();

  // Auth + real-time user data + real-time leaderboard
  useEffect(() => {
    let unsubUser: (() => void) | null = null;
    let unsubBoard: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (cu) => {
      if (!cu) { router.push("/"); return; }

      // Live user document
      unsubUser = onSnapshot(doc(db, "Users", cu.uid), (snap) => {
        if (snap.exists()) setUser({ id: cu.uid, ...snap.data() });
        setLoadingUser(false);
      });

      // Live leaderboard
      try {
        const q = query(collection(db, "Users"), orderBy("totalPoints", "desc"));
        unsubBoard = onSnapshot(q, (snap) => {
          setLeaderboard(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
      } catch {}
    });

    return () => {
      unsubAuth();
      unsubUser?.();
      unsubBoard?.();
    };
  }, [router]);

  // Matches + background sync
  useEffect(() => {
    (async () => {
      try {
        const data = await (await fetch(getEspnScoreboardUrl())).json();
        if (data?.events) {
          const pad = (n: number) => String(n).padStart(2, "0");
          setMatches(data.events.map((e: any) => {
            const comp = e.competitions[0];
            const home = comp.competitors.find((c: any) => c.homeAway === "home");
            const away = comp.competitors.find((c: any) => c.homeAway === "away");
            const d = new Date(e.date);
            return {
              id: e.id,
              homeTeam: home.team.displayName, homeLogo: home.team.logo ?? "",
              awayTeam: away.team.displayName, awayLogo: away.team.logo ?? "",
              startTime: d.toLocaleString("he-IL", { weekday:"short", month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit" }),
              matchDate: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
              isLocked: d < new Date(),
            };
          }));
        }
      } catch {}
      setLoadingMatches(false);
    })();
    triggerAutoSync();
  }, []);

  const today = todayStr();
  const filtered = matches.filter((m) => {
    if (filter === "open")   return !m.isLocked;
    if (filter === "locked") return m.isLocked;
    if (filter === "today")  return m.matchDate === today;
    return true;
  });

  if (loadingUser) return (
    <div className="flex min-h-screen items-center justify-center bg-[#04080F]">
      <div className="w-8 h-8 rounded-full border-[3px] border-emerald-500/20 border-t-emerald-400 animate-spin" />
    </div>
  );

  const openCount   = matches.filter(m => !m.isLocked).length;
  const lockedCount = matches.filter(m => m.isLocked).length;

  return (
    <div className="min-h-screen bg-[#04080F] text-slate-100">

      {/* ── Pitch-stripe background ──────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(16,185,129,0.03) 0px, rgba(16,185,129,0.03) 60px, transparent 60px, transparent 120px)",
        }}
      />
      {/* Top glow */}
      <div className="fixed top-0 inset-x-0 h-64 bg-gradient-to-b from-emerald-900/10 to-transparent pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-10 space-y-5">

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <header className="relative overflow-hidden rounded-2xl border border-white/6 shadow-2xl">
          {/* Background: stadium night gradient */}
          <div className="absolute inset-0 bg-gradient-to-l from-[#0A1628] via-[#071220] to-[#050D18]" />
          {/* Accent line */}
          <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-amber-500 via-amber-400/60 to-transparent" />

          <div className="relative px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              {/* User */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-amber-500/30 ring-2 ring-amber-500/10 shadow-lg">
                    <AvatarImage src={user?.photoURL} />
                    <AvatarFallback className="bg-[#0A1628] text-white font-black text-lg">
                      {user?.displayName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#071220] rounded-full" />
                </div>
                <div>
                  <p className="font-black text-white text-sm leading-tight">{user?.displayName}</p>
                  <p className="text-xs font-bold text-amber-400 mt-0.5">
                    🏆 {user?.totalPoints ?? 0} נקודות
                  </p>
                </div>
              </div>

              {/* Nav */}
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 border border-white/5 bg-white/2 px-2.5 py-1 rounded-full">
                  {activeConfig.icon} {activeConfig.label}
                </span>
                <Link href="/profile">
                  <button className="text-xs font-bold text-slate-500 hover:text-white border border-white/6 bg-white/3 hover:bg-white/6 px-3 py-1.5 rounded-xl transition-all">
                    פרופיל 👤
                  </button>
                </Link>
                <Link href="/rules">
                  <button className="text-xs font-bold text-slate-500 hover:text-white border border-white/6 bg-white/3 hover:bg-white/6 px-3 py-1.5 rounded-xl transition-all">
                    חוקים 📖
                  </button>
                </Link>
                <button
                  onClick={() => signOut(auth)}
                  className="text-xs font-bold text-slate-600 hover:text-white border border-white/5 bg-white/2 hover:bg-white/5 px-3 py-1.5 rounded-xl transition-all"
                >
                  יציאה
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/5">
              {[
                { label: "משחקים", val: matches.length, icon: "⚽" },
                { label: "פתוחים", val: openCount, icon: "🟢" },
                { label: "ננעלו",  val: lockedCount, icon: "🔒" },
                { label: "רצף",    val: (user?.currentStreak ?? 0) >= 1 ? `🔥${user?.currentStreak}` : "–", icon: "" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-sm font-black text-white">{s.icon}{s.val}</p>
                  <p className="text-[10px] text-slate-700 font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* ══ TAB SWITCHER ════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-3 bg-[#0A1020]/90 border border-white/6 rounded-2xl p-1 gap-1">
          {([
            { key: "matches",     label: "⚽ ניחושים",  active: "bg-emerald-600 shadow-emerald-600/25" },
            { key: "leaderboard", label: "🏆 דירוג",    active: "bg-amber-500 shadow-amber-500/25" },
            { key: "history",     label: "📋 היסטוריה", active: "bg-blue-600 shadow-blue-600/25" },
          ] as const).map(({ key, label, active }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`py-2.5 rounded-xl text-xs font-black tracking-wide transition-all duration-200 ${
                tab === key
                  ? `${active} text-white shadow-md`
                  : "text-slate-600 hover:text-slate-300"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ══ MATCHES ═════════════════════════════════════════════════════════ */}
        {tab === "matches" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">משחקים קרובים</h2>
                <p className="text-xs text-slate-700 font-medium mt-0.5">
                  {loadingMatches ? "טוען..." : `${filtered.length} משחקים`}
                </p>
              </div>
              {loadingMatches && (
                <div className="flex items-center gap-1.5 text-[11px] font-black text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />LIVE
                </div>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {FILTERS.map(({key, label}) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`shrink-0 text-xs font-black px-4 py-1.5 rounded-full border transition-all ${
                    filter === key
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-600/20"
                      : "bg-white/3 text-slate-600 border-white/6 hover:text-slate-300 hover:border-white/12"
                  }`}>{label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loadingMatches && Array.from({ length: 4 }).map((_, i) => (
                <MatchCardSkeleton key={i} />
              ))}
              {!loadingMatches && filtered.length === 0 && (
                <div className="col-span-full text-center text-slate-700 py-16 border border-white/4 border-dashed rounded-2xl text-sm">
                  אין משחקים בקטגוריה זו
                </div>
              )}
              {filtered.map((m) => (
                <MatchCard key={m.id} userId={user?.id} matchId={m.id}
                  homeTeam={m.homeTeam} homeLogo={m.homeLogo}
                  awayTeam={m.awayTeam} awayLogo={m.awayLogo}
                  startTime={m.startTime} matchDate={m.matchDate}
                  isLocked={m.isLocked}
                />
              ))}
            </div>
          </section>
        )}

        {/* ══ HISTORY ═════════════════════════════════════════════════════════ */}
        {tab === "history" && user?.id && (
          <HistoryTab userId={user.id} />
        )}

        {/* ══ LEADERBOARD ═════════════════════════════════════════════════════ */}
        {tab === "leaderboard" && (
          <section className="space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-lg font-black text-white">טבלת האליפות</h2>
                <p className="text-xs text-slate-700 font-medium mt-0.5">מתעדכן אוטומטית</p>
              </div>
              <Link href="/rules">
                <button className="text-xs font-bold text-slate-600 hover:text-white border border-white/5 bg-white/2 hover:bg-white/5 px-3 py-1.5 rounded-xl transition-all">
                  חוקים ⚖️
                </button>
              </Link>
            </div>

            {/* Podium (top 3) */}
            {leaderboard.length >= 3 && (
              <Podium top3={leaderboard.slice(0, 3)} currentUserId={user?.id} />
            )}

            {/* Full rankings */}
            <div className="space-y-1.5">
              {leaderboard.map((player, i) => {
                const isMe = player.id === user?.id;
                const medals = ["🥇","🥈","🥉"];
                return (
                  <div key={player.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      isMe
                        ? "bg-amber-500/8 border-amber-500/20"
                        : "bg-white/2 border-white/4 hover:bg-white/4 hover:border-white/8"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center shrink-0">
                        {i < 3
                          ? <span className="text-base">{medals[i]}</span>
                          : <span className="text-[11px] font-black text-slate-700">#{i+1}</span>
                        }
                      </div>
                      <Avatar className={`h-9 w-9 border ${isMe ? "border-amber-400/40" : "border-white/8"}`}>
                        <AvatarImage src={player.photoURL} />
                        <AvatarFallback className="bg-[#0A1628] text-white text-xs font-bold">
                          {player.displayName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-bold ${isMe ? "text-amber-300" : "text-slate-200"}`}>
                            {player.displayName}
                          </span>
                          {isMe && (
                            <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-black">אתה</span>
                          )}
                        </div>
                        {(player.currentStreak ?? 0) >= 3 && (
                          <p className="text-[10px] text-orange-400 font-bold">🔥 רצף {player.currentStreak}</p>
                        )}
                      </div>
                    </div>
                    <div className={`text-sm font-black px-3 py-1.5 rounded-xl border tabular-nums ${
                      isMe ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-white/4 border-white/5 text-slate-300"
                    }`}>
                      {player.totalPoints ?? 0}
                      <span className="text-[10px] opacity-40 font-medium ml-0.5">נק׳</span>
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

// ─── Podium component ────────────────────────────────────────────────────────

function Podium({ top3, currentUserId }: { top3: DocumentData[]; currentUserId?: string }) {
  const positions = [
    { data: top3[0], place: 1, height: "h-32",
      medal: "🥇", color: "from-amber-600/25 to-amber-700/10",
      border: "border-amber-500/40" },
    { data: top3[2], place: 3, height: "h-20",
      medal: "🥉", color: "from-orange-700/25 to-orange-800/10",
      border: "border-orange-500/25" },
  ];

  return (
    <div className="flex items-end justify-center gap-3 px-4 pt-2 pb-0">
      {positions.map(({ data, place, height, medal, color, border }) => {
        const isMe = data?.id === currentUserId;
        return (
          <div key={place} className="flex flex-col items-center gap-2 flex-1 max-w-[110px]">
            <Avatar className={`border-2 shadow-lg ${
              isMe
                ? "border-amber-400/60 h-14 w-14"
                : `${border} ${place === 1 ? "h-14 w-14" : "h-11 w-11"}`
            }`}>
              <AvatarImage src={data?.photoURL} />
              <AvatarFallback className="bg-[#0A1628] text-white font-black text-sm">
                {data?.displayName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="text-[11px] font-black text-slate-400 text-center leading-tight max-w-full truncate px-1">
              {data?.displayName}
            </p>
            <div className={`w-full ${height} rounded-t-xl bg-gradient-to-t ${color} border-t border-x ${border} flex flex-col items-center justify-center gap-1`}>
              <span className="text-2xl">{medal}</span>
              <span className="text-xs font-black text-white tabular-nums">
                {data?.totalPoints ?? 0}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
