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
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
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
        const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?dates=20260519-20260620");
        const data = await response.json();

        if (data && data.events) {
          const upcoming = data.events.map((event: any) => {
            const competition = event.competitions[0];
            const homeCompetitor = competition.competitors.find((c: any) => c.homeAway === 'home');
            const awayCompetitor = competition.competitors.find((c: any) => c.homeAway === 'away');

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
              homeTeam: homeCompetitor.team.displayName,
              homeLogo: homeCompetitor.team.logo || "",
              awayTeam: awayCompetitor.team.displayName,
              awayLogo: awayCompetitor.team.logo || "",
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-blue-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none" />

      <div className="relative max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        
        <header className="flex items-center justify-between bg-[#151D30]/80 backdrop-blur-xl p-4 md:p-5 rounded-3xl border border-slate-700/40 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-14 w-14 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20">
                <AvatarImage src={user?.photoURL} alt={user?.displayName} />
                <AvatarFallback className="bg-slate-800 text-white font-bold">{user?.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-[#151D30] rounded-full" />
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
            className="text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl border border-slate-700/40 font-bold transition-all"
            onClick={() => signOut(auth)}
          >
            התנתק
          </Button>
        </header>

        <Tabs defaultValue="matches" className="w-full">
          {/* תיקון הטאבים הלא פעילים: text-slate-400 עם שינוי צבע בהובר */}
          <TabsList className="grid w-full grid-cols-2 mb-8 h-14 bg-[#111827]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 shadow-inner">
            <TabsTrigger value="matches" className="rounded-xl font-black text-md tracking-wide text-slate-400 hover:text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/20 transition-all duration-300">
              ⚽ זירת הניחושים
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="rounded-xl font-black text-md tracking-wide text-slate-400 hover:text-slate-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/20 transition-all duration-300">
              📊 דירוג החברה
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="matches" className="space-y-6 focus-visible:outline-hidden">
            <div className="flex justify-between items-center px-2">
              <div>
                <h3 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">משחקים קרובים</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">עדכון חי מהשרתים</p>
              </div>
              {loadingMatches && (
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  <span className="text-xs text-blue-400 font-black tracking-wider">LIVE DATA</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!loadingMatches && realMatches.length === 0 && (
                <div className="col-span-full text-center text-slate-500 py-16 bg-[#151D30]/20 rounded-3xl border border-slate-800 border-dashed">
                  לא נמצאו משחקים פעילים בטווח הזמן שנבחר
                </div>
              )}
              
              {realMatches.map((match) => (
                <MatchCard 
                  key={match.id}
                  userId={user?.id}
                  matchId={match.id}
                  homeTeam={match.homeTeam}
                  homeLogo={match.homeLogo}
                  awayTeam={match.awayTeam}
                  awayLogo={match.awayLogo}
                  startTime={match.startTime}
                  propQuestion={match.propQuestion}
                  isLocked={match.isLocked}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="leaderboard" className="bg-[#151D30]/40 border border-slate-700/40 p-6 rounded-3xl shadow-2xl backdrop-blur-md focus-visible:outline-hidden">
            <div className="mb-8">
              <h3 className="text-2xl font-black bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">טבלת האליפות</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">הטבלה מתעדכנת אוטומטית עם סיום המשחקים</p>
            </div>
            
            <div className="space-y-3">
              {leaderboard.map((player, index) => {
                const isCurrentUser = player.id === user?.id;
                
                return (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group ${
                      isCurrentUser 
                        ? "bg-gradient-to-r from-blue-600/20 via-blue-600/5 to-transparent border-blue-500/50 shadow-xl shadow-blue-900/20" 
                        : "bg-[#0B0F19]/50 border-slate-800 hover:border-slate-700 hover:bg-[#111827]"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 flex justify-center items-center">
                        {index === 0 ? <span className="text-3xl animate-bounce duration-1000 drop-shadow-lg">🥇</span> : 
                         index === 1 ? <span className="text-2xl drop-shadow-md">🥈</span> : 
                         index === 2 ? <span className="text-2xl drop-shadow-md">🥉</span> : 
                         <span className="font-black text-sm text-slate-500 tracking-wider">#{index + 1}</span>}
                      </div>
                      
                      <Avatar className={`h-12 w-12 border-2 transition-transform duration-300 group-hover:scale-105 shadow-md ${isCurrentUser ? "border-blue-400" : "border-slate-700"}`}>
                        <AvatarImage src={player.photoURL} alt={player.displayName} />
                        <AvatarFallback className="bg-slate-800 text-white font-bold">{player.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <span className={`font-black text-lg ${isCurrentUser ? "text-blue-300" : "text-slate-200"}`}>
                        {player.displayName} 
                        {isCurrentUser && (
                          <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black mr-2 tracking-wide uppercase align-middle">
                            אתה
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <div className={`font-black tracking-wider text-base bg-[#0B0F19] px-4 py-2 rounded-xl border shadow-inner flex items-center gap-1 ${isCurrentUser ? "border-blue-500/40 text-blue-400" : "border-slate-800 text-slate-300"}`}>
                      {player.totalPoints || 0} <span className="text-xs font-bold text-slate-500 mt-0.5">נק׳</span>
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