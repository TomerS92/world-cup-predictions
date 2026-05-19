import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans selection:bg-blue-500/30 p-4 md:p-8" dir="rtl">
      {/* רקע אמביינט */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-blue-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* הדר ניווט חזרה */}
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

        {/* תוכן החוקים */}
        <Card className="bg-[#151D30]/60 border-slate-700/50 shadow-2xl rounded-3xl backdrop-blur-md overflow-hidden">
          <CardHeader className="bg-black/20 border-b border-slate-800/50 pb-6">
            <CardTitle className="text-2xl font-black text-blue-400">איך משחקים?</CardTitle>
            <p className="text-slate-300 mt-2 font-medium leading-relaxed">
              המטרה היא לצבור כמה שיותר נקודות על ידי חיזוי מדויק של תוצאות משחקי המונדיאל. 
              הניחושים שלכם ננעלים אוטומטית ברגע שריקת הפתיחה של כל משחק, ולא ניתן לשנות אותם לאחר מכן.
            </p>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
            
            <div className="space-y-4">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span className="text-2xl">🎯</span> חלוקת הנקודות
              </h3>
              
              <div className="grid gap-4">
                {/* קוביית פגיעה בול */}
                <div className="bg-[#0B0F19]/80 border border-green-500/30 p-5 rounded-2xl relative overflow-hidden group hover:border-green-500/50 transition-colors">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-green-500"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-lg text-green-400 mb-1">פגיעה מדויקת (בול)</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        ניחשתם בדיוק את תוצאת הסיום של המשחק. 
                        <br/><span className="text-slate-500 text-xs">(לדוגמה: ניחשתם 2-1 לארגנטינה, והמשחק הסתיים ב-2-1 לארגנטינה).</span>
                      </p>
                    </div>
                    <span className="bg-green-500/10 text-green-400 font-black px-3 py-1.5 rounded-xl border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                      3 נקודות
                    </span>
                  </div>
                </div>

                {/* קוביית כיוון נכון */}
                <div className="bg-[#0B0F19]/80 border border-blue-500/30 p-5 rounded-2xl relative overflow-hidden hover:border-blue-500/50 transition-colors">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-blue-500"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-lg text-blue-400 mb-1">כיוון נכון (מנצחת/תיקו)</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        לא פגעתם בתוצאה המדויקת, אבל צדקתם בזהות המנצחת או שניחשתם תיקו והיה תיקו.
                        <br/><span className="text-slate-500 text-xs">(לדוגמה: ניחשתם 3-0 לברזיל, בפועל נגמר 1-0 לברזיל).</span>
                      </p>
                    </div>
                    <span className="bg-blue-500/10 text-blue-400 font-black px-3 py-1.5 rounded-xl border border-blue-500/20">
                      1 נקודה
                    </span>
                  </div>
                </div>

                {/* קוביית שאלת בונוס */}
                <div className="bg-[#0B0F19]/80 border border-purple-500/30 p-5 rounded-2xl relative overflow-hidden hover:border-purple-500/50 transition-colors">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-purple-500"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-lg text-purple-400 mb-1">שאלת בונוס 🌟</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        לכל משחק מצורפת שאלת כן/לא מיוחדת. מענה נכון על השאלה יעניק לכם נקודה נוספת, ללא קשר לניחוש התוצאה.
                      </p>
                    </div>
                    <span className="bg-purple-500/10 text-purple-400 font-black px-3 py-1.5 rounded-xl border border-purple-500/20">
                      1 נקודה
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex gap-4 items-center">
              <span className="text-3xl">💡</span>
              <p className="text-amber-200/90 text-sm font-bold leading-relaxed">
                <span className="text-amber-400 font-black">שימו לב:</span> המקסימום שניתן להוציא ממשחק בודד הוא 4 נקודות (3 על תוצאה מדויקת + 1 על שאלת בונוס).
              </p>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}