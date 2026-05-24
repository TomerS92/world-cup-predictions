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
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
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
        setError("הייתה שגיאה בהתחברות. נסה שוב.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[#060A10] overflow-hidden">
      {/* ── Background: pitch texture + glows ─────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
        {/* Subtle grass grid */}
        <div className="absolute inset-0 pitch-grid opacity-100" />

        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full border border-white/3" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[6px] h-[6px] rounded-full bg-white/8" />

        {/* Glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-600/6 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-600/8 rounded-full blur-[100px]" />

        {/* Goal lines */}
        <div className="absolute top-0 inset-x-0 h-px bg-white/4" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-white/4" />
      </div>

      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[380px] mx-auto px-4" dir="rtl">

        {/* Hero */}
        <div className="text-center mb-8">
          {/* Ball icon with glow */}
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute w-28 h-28 bg-amber-500/15 rounded-full blur-2xl" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#1A1F2E] to-[#0D1117] border border-white/8 flex items-center justify-center shadow-2xl">
              <span className="text-5xl select-none" role="img" aria-label="trophy">🏆</span>
            </div>
          </div>

          <h1 className="text-4xl font-black text-white tracking-tight leading-none">
            ניחושי<br />
            <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-emerald-500 bg-clip-text text-transparent">
              המונדיאל
            </span>
          </h1>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed font-medium">
            נחש תוצאות, צבור נקודות,<br />
            תוכיח שאתה גאון הכדורגל של החברה.
          </p>
        </div>

        {/* Sign-in card */}
        <div className="bg-[#0E1520]/90 border border-white/8 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">

          {/* Feature pills */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { icon: "🎯", label: "5 נק׳", sub: "תוצאה בול" },
              { icon: "🃏", label: "×2", sub: "ג׳וקר" },
              { icon: "🔥", label: "רצף", sub: "ניצחונות" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex flex-col items-center gap-1 bg-white/3 border border-white/6 rounded-xl py-3 px-2"
              >
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm font-black text-white leading-none">{f.label}</span>
                <span className="text-[10px] text-slate-500 font-medium">{f.sub}</span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/6" />
            <span className="text-xs text-slate-600 font-bold">התחבר כדי להתחיל</span>
            <div className="flex-1 h-px bg-white/6" />
          </div>

          {/* Google button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 font-black text-sm rounded-xl h-12 shadow-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-wait"
          >
            {loading ? (
              <span className="flex items-center gap-2 text-slate-600">
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

          {/* Error */}
          {error && (
            <p className="mt-3 text-center text-xs text-red-400 font-bold bg-red-500/8 border border-red-500/15 rounded-xl py-2">
              {error}
            </p>
          )}

          <p className="mt-4 text-center text-[11px] text-slate-600">
            ✦ כניסה ראשונה תיצור לך פרופיל אוטומטית ✦
          </p>
        </div>

        {/* Footer tagline */}
        <p className="text-center text-[11px] text-slate-700 mt-5 font-medium tracking-wide">
          FIFA WORLD CUP 2026 · MEXICO · CANADA · USA
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.657 14.233 17.64 11.925 17.64 9.2Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}
