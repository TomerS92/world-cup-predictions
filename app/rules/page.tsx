import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans selection:bg-blue-500/30 p-4 md:p-8" dir="rtl">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-blue-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-3xl mx-auto space-y-8">
        
        <header className="flex items-center justify-between bg-[#151D30]/80 backdrop-blur-xl p-4 rounded-3xl border border-slate-700/40 shadow-2xl">
          <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent px-2">
            תקנון המשחק ושיטת הניקוד 📜
          </h1>
          <Link href="/dashboard">
            <Button 
              variant="outline" 
              className="rounded-xl font-bold border-slate-700/50 bg-[#0B0F19] text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            >
              חזור לזירה
            </Button>
          </Link>
        </header>

        <Card className="bg-[#151D30]/60 border-slate-700/50 shadow-2xl rounded-3xl backdrop-blur-md overflow-hidden">
          <CardHeader className="bg-black/20 border-b border-slate-800/50 pb-6">
            <CardTitle className="text-2xl font-black text-blue-400">איך משחקים?</CardTitle>
            <p className="text-slate-300 mt-2 font-medium leading-relaxed">
              המטרה היא לצבור כמה שיותר נקודות. הניחושים ננעלים אוטומטית עם שריקת הפתיחה (מסונכרן לשרתי זמן אמת), ולא ניתן לשנותם לאחר מכן.
            </p>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            
            <div className="space-y-4">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span className="text-2xl">🎯</span> מדרגות הניקוד הבסיסיות
              </h3>
              
              <div className="grid gap-4">
                <div className="bg-[#0B0F19]/80 border border-green-500/30 p-5 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-green-500"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-lg text-green-400 mb-1">פגיעה בול (תוצאה מדויקת)</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        ניחשתם בדיוק את תוצאת הסיום. <br/><span className="text-slate-500 text-xs">(לדוגמה: ניחשתם 2-1, והסתיים 2-1).</span>
                      </p>
                    </div>
                    <span className="bg-green-500/10 text-green-400 font-black px-3 py-1.5 rounded-xl border border-green-500/20">
                      5 נקודות
                    </span>
                  </div>
                </div>

                <div className="bg-[#0B0F19]/80 border border-teal-500/30 p-5 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-teal-500"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-lg text-teal-400 mb-1">הפרש מדויק (מגמה + שערים)</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        צדקתם במנצחת (או בתיקו) ובנוסף פגעתם בהפרש השערים המדויק. <br/><span className="text-slate-500 text-xs">(לדוגמה: ניחשתם 2-0 לברזיל, בפועל נגמר 3-1 לברזיל. ההפרש הוא 2).</span>
                      </p>
                    </div>
                    <span className="bg-teal-500/10 text-teal-400 font-black px-3 py-1.5 rounded-xl border border-teal-500/20">
                      3 נקודות
                    </span>
                  </div>
                </div>

                <div className="bg-[#0B0F19]/80 border border-blue-500/30 p-5 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-lg text-blue-400 mb-1">כיוון נכון בלבד</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        צדקתם בזהות המנצחת, אך ללא הפרש מדויק. <br/><span className="text-slate-500 text-xs">(לדוגמה: ניחשתם 1-0, נגמר 4-0).</span>
                      </p>
                    </div>
                    <span className="bg-blue-500/10 text-blue-400 font-black px-3 py-1.5 rounded-xl border border-blue-500/20">
                      1 נקודה
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span className="text-2xl">🎁</span> פרסי ניחומים (מצטברים)
              </h3>
              <p className="text-sm text-slate-400 mb-2">לא פגעתם "בול"? אל דאגה, עדיין אפשר לגרד נקודות חשובות מהמשחק:</p>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
                  <h4 className="font-bold text-slate-200 mb-1">פגיעה בקבוצה אחת</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    אם ניחשתם נכונה את כמות השערים של אחת הקבוצות. (למשל: ניחשתם 2-0 לבית, ובפועל נגמר 2-2. פגעתם בשני השערים של הבית).
                  </p>
                  <div className="mt-2 text-blue-400 font-black text-sm">+1 נקודה</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
                  <h4 className="font-bold text-slate-200 mb-1">סך הכל שערים</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    אם סך כל השערים שניחשתם זהה לסך השערים במשחק. (למשל: ניחשתם 3-1 [סך 4] ונגמר 2-2 [סך 4]).
                  </p>
                  <div className="mt-2 text-blue-400 font-black text-sm">+1 נקודה</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/10 border border-amber-500/40 p-6 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <h3 className="text-xl font-black text-amber-400 flex items-center gap-2 mb-2">
                <span className="text-2xl animate-pulse">🃏</span> קלף הג'וקר (מכפיל נקודות)
              </h3>
              <p className="text-amber-100/80 text-sm font-medium leading-relaxed">
                בטוחים בניחוש שלכם? סמנו את המשחק כ"ג'וקר" לפני שריקת הפתיחה. 
                <br />
                הג'וקר <span className="font-black text-amber-400 underline decoration-amber-500/50 underline-offset-4">מכפיל פי 2</span> את כל הנקודות שתצברו באותו משחק. 
                <br />
                <span className="text-amber-300 text-xs font-bold mt-2 inline-block">* מקסימום נקודות אפשרי ממשחק בודד (פגיעה בול + ג'וקר) = 10 נקודות!</span>
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}