import Link from "next/link";

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-[#070E1A] text-slate-100">
      <div className="fixed inset-0 pointer-events-none" aria-hidden
        style={{ backgroundImage:"repeating-linear-gradient(180deg, rgba(16,185,129,0.025) 0px, rgba(16,185,129,0.025) 60px, transparent 60px, transparent 120px)" }}
      />

      <div className="relative max-w-2xl mx-auto px-4 py-8 md:px-6 space-y-5" dir="rtl">

        {/* Header */}
        <header className="flex items-center justify-between bg-[#0A1422]/90 border border-white/6 rounded-2xl px-5 py-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-xl">📜</div>
            <h1 className="font-black text-white text-base">תקנון ושיטת הניקוד</h1>
          </div>
          <Link href="/dashboard">
            <button className="text-xs font-bold text-slate-500 hover:text-white border border-white/6 bg-white/3 hover:bg-white/6 px-3 py-1.5 rounded-xl transition-all">
              ⚽ חזור לזירה
            </button>
          </Link>
        </header>

        {/* How to play */}
        <div className="bg-[#0A1422]/80 border border-white/6 rounded-2xl p-6 shadow-xl space-y-6">

          <div className="border-b border-white/5 pb-5">
            <h2 className="font-black text-emerald-400 mb-2 flex items-center gap-2">
              <span>⚽</span> איך משחקים?
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              נחש את תוצאת כל משחק לפני שריקת הפתיחה. ניחושים ננעלים אוטומטית כשהמשחק מתחיל.
              בנוסף, כל משחק מגיע עם <span className="text-white font-bold">שאלת בונוס</span> — שאלת כן/לא שמוסיפה עוד נקודות.
            </p>
          </div>

          {/* Main scoring */}
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">🎯 ניקוד בסיסי</h3>
            <div className="space-y-2.5">
              {[
                { color:"emerald", pts:"6", title:"פגיעה בול", desc:"תוצאה מדויקת לחלוטין — מספר השערים של כל קבוצה.", ex:"ניחשת 2-1 ← נגמר 2-1" },
                { color:"teal",    pts:"3", title:"הפרש מדויק", desc:"ניחשת נכון מי ניצח ובכמה שערי הפרש (לא בול).", ex:"ניחשת 2-0 ← נגמר 3-1 (הפרש 2)" },
                { color:"blue",    pts:"2", title:"ניחשת את המנצח", desc:"ניחשת נכון מי ניצח (או תיקו) — אבל לא ההפרש.", ex:"ניחשת 1-0 ← נגמר 4-1" },
              ].map((t) => (
                <div key={t.title} className={`relative bg-white/2 border border-${t.color}-500/20 rounded-xl p-4 overflow-hidden`}>
                  <div className={`absolute right-0 inset-y-0 w-1 bg-${t.color}-500 rounded-r-xl`} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className={`font-black text-${t.color}-400 text-sm`}>{t.title}</h4>
                      <p className="text-slate-500 text-xs mt-0.5">{t.desc}</p>
                      <p className={`text-${t.color}-700 text-[11px] font-mono mt-1`}>{t.ex}</p>
                    </div>
                    <span className={`shrink-0 font-black text-sm text-${t.color}-400 bg-${t.color}-500/10 border border-${t.color}-500/20 px-2.5 py-1 rounded-lg`}>
                      {t.pts} נק׳
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bonus points */}
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">🎁 בונוסים מצטברים</h3>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {[
                { title:"פגיעה בקבוצה אחת", desc:"ניחשת נכון את מספר השערים של אחת הקבוצות.", pts:"+1" },
              ].map((b) => (
                <div key={b.title} className="bg-white/2 border border-white/6 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-300 text-xs">{b.title}</h4>
                      <p className="text-slate-600 text-[11px] mt-0.5">{b.desc}</p>
                    </div>
                    <span className="text-blue-400 font-black text-sm bg-blue-500/8 border border-blue-500/15 px-2 py-0.5 rounded-lg shrink-0">{b.pts}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bonus question */}
          <div className="bg-gradient-to-l from-blue-600/10 to-blue-700/5 border border-blue-500/20 rounded-2xl p-5">
            <h3 className="text-base font-black text-blue-300 flex items-center gap-2 mb-2">
              <span>❓</span> שאלת בונוס למשחק
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              כל משחק מגיע עם שאלת <span className="font-bold text-white">כן/לא</span> אחת — למשל: "האם יהיה כרטיס אדום?", "האם יהיה שער מפנדל?", "האם יהיה שחקן שיגורש?" וכדומה.
              <br /><br />
              התשובה מזוהה <span className="font-bold text-white">אוטומטית</span> מנתוני ESPN לאחר המשחק ומנוקדת בלי שצריך לעשות כלום.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 text-xs font-black text-blue-300 bg-blue-500/12 border border-blue-500/20 px-3 py-1.5 rounded-lg">
              תשובה נכונה: +1 נקודה
            </div>
          </div>

          {/* Joker */}
          <div className="bg-gradient-to-l from-amber-500/10 to-amber-600/5 border border-amber-500/25 rounded-2xl p-5">
            <h3 className="text-base font-black text-amber-400 flex items-center gap-2 mb-2">
              <span className="animate-pulse">🃏</span> קלף הג׳וקר — ×2
            </h3>
            <p className="text-amber-200/60 text-sm leading-relaxed">
              סמן משחק כ"ג׳וקר" לפני הפתיחה — כל הנקודות מהניחוש יוכפלו פי 2.
            </p>
            <div className="mt-3 text-xs font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
              <span>🃏</span> שימוש חד-פעמי ליום · ניתן לביטול לפני הקיקאוף
            </div>
          </div>

          {/* Max points */}
          <div className="bg-gradient-to-l from-emerald-600/10 to-emerald-700/5 border border-emerald-500/20 rounded-2xl p-5">
            <h3 className="text-base font-black text-emerald-400 flex items-center gap-2 mb-3">
              <span>🏅</span> מקסימום נקודות למשחק
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "פגיעה בול", pts: "6", color: "emerald" },
                { label: "קבוצה אחת", pts: "+1", color: "blue" },
                { label: "שאלת בונוס", pts: "+1", color: "blue" },
                { label: "ג׳וקר ×2", pts: "×2", color: "amber" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between bg-white/3 border border-white/6 rounded-xl px-3 py-2">
                  <span className="text-slate-400 text-xs">{r.label}</span>
                  <span className={`font-black text-${r.color}-400 text-sm`}>{r.pts}</span>
                </div>
              ))}
              <div className="col-span-2 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2">
                <span className="font-black text-emerald-300 text-sm">13 נק׳</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
