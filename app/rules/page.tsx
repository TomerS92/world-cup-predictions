import Link from "next/link";

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-[#060A10] text-slate-100 selection:bg-emerald-500/20">
      <div className="fixed inset-0 pitch-grid pointer-events-none" aria-hidden />

      <div className="relative max-w-2xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-6" dir="rtl">

        {/* Header */}
        <header className="flex items-center justify-between bg-[#0E1520]/90 border border-white/6 rounded-2xl px-5 py-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
              <span className="text-base">📜</span>
            </div>
            <h1 className="text-base font-black text-white">תקנון ושיטת הניקוד</h1>
          </div>
          <Link href="/dashboard">
            <button className="text-xs font-bold text-slate-400 hover:text-white border border-white/6 bg-white/3 hover:bg-white/6 px-3 py-1.5 rounded-xl transition-all">
              חזור לזירה ⚽
            </button>
          </Link>
        </header>

        {/* How to play */}
        <div className="bg-[#0E1520]/80 border border-white/6 rounded-2xl p-6 shadow-lg space-y-6">
          <div>
            <h2 className="text-lg font-black text-emerald-400 mb-1">איך משחקים?</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              נחש את תוצאת כל משחק לפני שריקת הפתיחה, צבור נקודות, ועקוב אחרי הדירוג.
              ניחושים ננעלים אוטומטית כשהמשחק מתחיל ולא ניתן לשנותם.
            </p>
          </div>

          {/* Scoring tiers */}
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
              <span>🎯</span> שיטת הניקוד
            </h3>
            <div className="space-y-3">
              {[
                {
                  color: "emerald",
                  points: "5 נקודות",
                  title: "פגיעה בול",
                  desc: "ניחשתם את התוצאה המדויקת.",
                  example: "ניחשתם 2-1 ← נגמר 2-1",
                },
                {
                  color: "teal",
                  points: "3 נקודות",
                  title: "הפרש מדויק",
                  desc: "ניחשתם נכון את ההפרש ואת הכיוון.",
                  example: "ניחשתם 2-0 ← נגמר 3-1 (הפרש 2)",
                },
                {
                  color: "blue",
                  points: "1 נקודה",
                  title: "כיוון נכון בלבד",
                  desc: "ניחשתם נכון את הזוכה (בלי הפרש מדויק).",
                  example: "ניחשתם 1-0 ← נגמר 4-0",
                },
              ].map((tier) => (
                <div
                  key={tier.title}
                  className={`relative overflow-hidden bg-white/2 border border-${tier.color}-500/20 rounded-xl p-4`}
                >
                  <div className={`absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-${tier.color}-500 to-${tier.color}-500/0`} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className={`font-black text-${tier.color}-400 text-sm mb-0.5`}>{tier.title}</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">{tier.desc}</p>
                      <p className={`text-${tier.color}-600 text-[11px] font-mono mt-1`}>{tier.example}</p>
                    </div>
                    <span className={`shrink-0 font-black text-sm text-${tier.color}-400 bg-${tier.color}-500/10 border border-${tier.color}-500/20 px-2.5 py-1 rounded-lg whitespace-nowrap`}>
                      {tier.points}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bonus points */}
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
              <span>🎁</span> בונוסים מצטברים (לא פגיעה בול)
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  title: "פגיעה בקבוצה אחת",
                  desc: "ניחשתם נכון את מספר השערים של אחת הקבוצות.",
                  points: "+1",
                },
                {
                  title: "סך שערים מדויק",
                  desc: "סכום השערים שניחשתם זהה לסכום בפועל.",
                  points: "+1",
                },
              ].map((b) => (
                <div key={b.title} className="bg-white/2 border border-white/6 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-200 text-xs mb-1">{b.title}</h4>
                      <p className="text-slate-500 text-[11px] leading-relaxed">{b.desc}</p>
                    </div>
                    <span className="shrink-0 font-black text-blue-400 text-sm bg-blue-500/8 border border-blue-500/15 px-2 py-1 rounded-lg">{b.points}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Joker */}
          <div className="bg-gradient-to-l from-amber-500/10 to-amber-600/5 border border-amber-500/25 rounded-xl p-5">
            <h3 className="text-base font-black text-amber-400 flex items-center gap-2 mb-2">
              <span className="animate-pulse">🃏</span> קלף הג׳וקר — מכפיל x2
            </h3>
            <p className="text-amber-100/70 text-sm leading-relaxed">
              בטוחים בניחוש? סמנו כ״ג׳וקר״ לפני שריקת הפתיחה —
              כל הנקודות שתרוויחו במשחק זה יוכפלו פי 2.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-300">
              <span className="bg-amber-500/15 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                מקסימום: 10 נקודות למשחק (5 × 2 עם ג׳וקר)
              </span>
            </div>
            <p className="text-amber-600/80 text-xs mt-2">* ג׳וקר אחד בלבד לכל יום משחקים.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
