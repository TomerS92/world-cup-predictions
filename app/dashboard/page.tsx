"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, orderBy, DocumentData } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MatchCard } from "@/components/MatchCard";

interface RealMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  propQuestion: string;
  isLocked: boolean;
}

export default function Dashboard() {
  const [user, setUser] = useState<DocumentData | null>(null);
  const [leaderboard, setLeaderboard] = useState<DocumentData[]>([]);
  const [realMatches, setRealMatches] = useState<RealMatch[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/");
        return;
      }

      const userDoc = await getDoc(doc(db, "Users", currentUser.uid));
      if (userDoc.exists()) {
        setUser({ id: currentUser.uid, ...userDoc.data() });
      }

      try {
        const usersRef = collection(db, "Users");
        const q = query(usersRef, orderBy("totalPoints", "desc"));
        const querySnapshot = await getDocs(q);
        
        const usersList: DocumentData[] = [];
        querySnapshot.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() });
        });
        
        setLeaderboard(usersList);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      }

      setLoadingUser(false);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchESPNMatches = async () => {
      try {
        // עדכון טווח התאריכים להבאת כל המשחקים שנשארו לצורך טסטים
        const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20260519-20260620");
        const data = await response.json();

        if (data && data.events) {
          const upcoming = data.events.map((event: any) => {
            const competition = event.competitions[0];
            const home = competition.competitors.find((c: any) => c.homeAway === 'home').team.displayName;
            const away = competition.competitors.find((c: any) => c.homeAway === 'away').team.displayName;

            const dateObj = new Date(event.date);
            const formattedDate = dateObj.toLocaleString('he-IL', {
              weekday: 'short', 
              month: 'numeric', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit'
            });

            const isLocked = dateObj < new Date();

            return {
              id: event.id,
              homeTeam: home,
              awayTeam: away,
              startTime: formattedDate,
              propQuestion: "האם יובקעו מעל 2.5 שערים במשחק?",
              isLocked: isLocked
            };
          });

          setRealMatches(upcoming);
        }
      } catch (error) {
        console.error("Error fetching matches from API:", error);
      } finally {
        setLoadingMatches(false);
      }
    };

    fetchESPNMatches();
  }, []);

  if (loadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0F19]">
        <div className="text-xl font-black text-blue-500 animate-pulse tracking-widest">טוען זירת משחק...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans selection:bg-blue-500/30" dir="rtl">
      {/* רקע אמביינט זוהר בעדינות */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-blue-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* הדר פרימיום כהה */}
        <header className="flex items-center justify-between bg-[#151D30]/60 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-slate-800/80 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-14 w-14 border-2 border-blue-500/50 shadow-lg shadow-blue-500/10">
                <AvatarImage src={user?.photoURL} alt={user?.displayName} />
                <AvatarFallback className="bg-slate-800 text-white font-bold">{user?.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#151D30] rounded-full" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black bg-gradient-to-l from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">{user?.displayName}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xl">🏆</span>
                <p className="text-sm font-extrabold text-blue-400 tracking-wide">{user?.totalPoints || 0} נקודות במאזן</p>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl border border-slate-800 font-bold transition-all"
            onClick={() => signOut(auth)}
          >
            התנתק
          </Button>
        </header>

        {/* טאבים בסגנון אפליקציית ספורט מודרנית */}
        <Tabs defaultValue="matches" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-14 bg-[#111827] border border-slate-800 rounded-2xl p-1.5 shadow-inner">
            <TabsTrigger value="matches" className="rounded-xl font-black text-md tracking-wide data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
              ⚽ משחקים וניחושים
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="rounded-xl font-black text-md tracking-wide data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
              📊 טבלת הליגה של החברה
            </TabsTrigger>
          </TabsList>
          
          {/* תוכן משחקים */}
          <TabsContent value="matches" className="space-y-6 focus-visible:outline-hidden">
            <div className="flex justify-between items-center px-1">
              <div>
                <h3 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">זירת הניחושים</h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">לוח המשחקים הרשמי מהשרתים</p>
              </div>
              {loadingMatches && (
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  <span className="text-xs text-blue-400 font-black tracking-wider">LIVE DATA</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {!loadingMatches && realMatches.length === 0 && (
                <div className="col-span-full text-center text-slate-500 py-16 bg-[#151D30]/20 rounded-2xl border border-slate-800 border-dashed">
                  לא נמצאו משחקים פעילים בטווח הזמן שנבחר
                </div>
              )}
              
              {realMatches.map((match) => (
                <MatchCard 
                  key={match.id}
                  userId={user?.id}
                  matchId={match.id}
                  homeTeam={match.homeTeam}
                  awayTeam={match.awayTeam}
                  startTime={match.startTime}
                  propQuestion={match.propQuestion}
                  isLocked={match.isLocked}
                />
              ))}
            </div>
          </TabsContent>
          
          {/* תוכן טבלת מובילים */}
          <TabsContent value="leaderboard" className="bg-[#151D30]/20 border border-slate-800/60 p-5 md:p-6 rounded-2xl shadow-2xl backdrop-blur-md focus-visible:outline-hidden">
            <div className="mb-6">
              <h3 className="text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">דירוג האליפות</h3>
              <p className="text-xs font-bold text-slate-500 mt-0.5">הטבלה מתעדכנת אוטומטית עם סיום המשחקים</p>
            </div>
            
            <div className="space-y-3">
              {leaderboard.map((player, index) => {
                const isCurrentUser = player.id === user?.id;
                const isTop3 = index < 3;
                
                return (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 group ${
                      isCurrentUser 
                        ? "bg-gradient-to-r from-blue-600/20 via-blue-600/10 to-transparent border-blue-500/40 shadow-xl shadow-blue-900/10" 
                        : "bg-[#151D30]/40 border-slate-800 hover:border-slate-700 hover:bg-[#151D30]/70"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* מיקום מעוצב בטבלה */}
                      <div className="w-8 flex justify-center items-center">
                        {index === 0 ? <span className="text-2xl animate-bounce duration-1000">🥇</span> : 
                         index === 1 ? <span className="text-2xl">🥈</span> : 
                         index === 2 ? <span className="text-2xl">🥉</span> : 
                         <span className="font-black text-sm text-slate-500 tracking-wider">#{index + 1}</span>}
                      </div>
                      
                      {/* תמונת פרופיל */}
                      <Avatar className={`h-11 w-11 border transition-transform duration-300 group-hover:scale-105 ${isCurrentUser ? "border-blue-400" : "border-slate-700"}`}>
                        <AvatarImage src={player.photoURL} alt={player.displayName} />
                        <AvatarFallback className="bg-slate-800 text-white font-bold">{player.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      {/* שם משתמש */}
                      <span className={`font-black text-md ${isCurrentUser ? "text-blue-400" : "text-slate-200"}`}>
                        {player.displayName} 
                        {isCurrentUser && (
                          <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black mr-2 tracking-wide uppercase">
                            אתה
                          </span>
                        )}
                      </span>
                    </div>
                    
                    {/* תצוגת ניקוד מעוצבת קפסולה */}
                    <div className={`font-black tracking-wider text-sm bg-[#111827] px-4 py-1.5 rounded-xl border shadow-inner ${isCurrentUser ? "border-blue-500/30 text-blue-400" : "border-slate-800 text-slate-300"}`}>
                      {player.totalPoints || 0} <span className="text-[10px] font-bold text-slate-500 mr-0.5">נק׳</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}