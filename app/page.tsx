"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, "Users", result.user.uid);
      if (!(await getDoc(userRef)).exists()) {
        await setDoc(userRef, {
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          email: result.user.email,
          totalPoints: 0,
          streakCount: 0,
          joinedAt: new Date(),
        });
      }
      router.push("/dashboard");
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        setError("שגיאה בהתחברות — נסה שוב.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#04080F]">

      {/* ── Layered background ─────────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
        {/* Green pitch stripes */}
        <div className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(180deg, rgba(16,185,129,0.04) 0px, rgba(16,185,129,0.04) 60px, transparent 60px, transparent 120px)",
          }}
        />
        {/* Spotlight from top */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[600px] bg-gradient-radial from-emerald-600/12 to-transparent rounded-full blur-[80px]" />
        {/* Host-nation colour strips at bottom */}
        <div className="absolute bottom-0 inset-x-0 h-1.5 flex">
          <div className="flex-1 bg-red-600" />
          <div className="flex-1 bg-white/30" />
          <div className="flex-1 bg-blue-600" />   {/* USA */}
          <div className="flex-1 bg-red-600" />
          <div className="flex-1 bg-white/30" />   {/* Canada */}
          <div className="flex-1 bg-emerald-600" />
          <div className="flex-1 bg-white/30" />
          <div className="flex-1 bg-red-600" />    {/* Mexico */}
        </div>
        {/* Center circle */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full border border-white/3 translate-y-1/2" />
      </div>

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[360px] mx-auto px-5" dir="rtl">

        {/* Eyebrow */}
        <p className="text-center text-[11px] font-black text-emerald-500/70 tracking-[0.3em] uppercase mb-6">
          FIFA World Cup 2026
        </p>

        {/* Trophy */}
        <div className="flex justify-center mb-5">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-2xl scale-150" />
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#1A1400] to-[#0A0800] border border-amber-500/20 flex items-center justify-center shadow-2xl shadow-amber-900/30">
              <span className="text-6xl select-none">🏆</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-5xl font-black leading-none tracking-tight">
            <span className="text-white">ניחושי</span>
            <br />
            <span className="bg-gradient-to-l from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              המונדיאל
            </span>
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            נחש · צבור נקודות · נצח את החברים
          </p>
        </div>

        {/* Sign-in card */}
        <div className="bg-[#0C1422]/95 border border-white/8 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">

          {/* Score pills */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { top: "5 נק׳", bot: "תוצאה בול", color: "text-emerald-400" },
              { top: "×2", bot: "ג׳וקר", color: "text-amber-400" },
              { top: "2 נק׳", bot: "בונוס", color: "text-blue-400" },
            ].map((s) => (
              <div key={s.bot} className="flex flex-col items-center gap-0.5 bg-white/4 border border-white/6 rounded-2xl py-3">
                <span className={`text-lg font-black ${s.color}`}>{s.top}</span>
                <span className="text-[10px] text-slate-600 font-bold">{s.bot}</span>
              </div>
            ))}
          </div>

          {/* Google button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 h-12 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 font-black text-sm shadow-xl transition-all duration-150 disabled:opacity-60 disabled:cursor-wait"
          >
            {loading ? (
              <span className="flex items-center gap-2 text-slate-500">
                <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                מתחבר...
              </span>
            ) : (
              <>
                <GoogleIcon />
                התחבר עם Google
              </>
            )}
          </button>

          {error && (
            <p className="mt-3 text-xs font-bold text-red-400 text-center bg-red-500/8 border border-red-500/15 rounded-xl py-2">
              {error}
            </p>
          )}

          <p className="mt-4 text-[11px] text-slate-700 text-center">
            כניסה ראשונה תיצור פרופיל אוטומטית ✦
          </p>
        </div>

        {/* Hosts */}
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <span title="USA">🇺🇸</span>
          <span className="w-px h-3 bg-white/10" />
          <span title="Mexico">🇲🇽</span>
          <span className="w-px h-3 bg-white/10" />
          <span title="Canada">🇨🇦</span>
          <span className="text-[11px] text-slate-700 font-bold mr-1">יוני–יולי 2026</span>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.657 14.233 17.64 11.925 17.64 9.2Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.865 10.529A5.002 5.002 0 0 1 3.75 9c0-.53.075-1.043.212-1.529L1.052 5.21A8.979 8.979 0 0 0 0 9c0 1.453.349 2.827.957 4.042l2.908-2.513Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958l2.91 2.262C4.67 5.164 6.655 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}
