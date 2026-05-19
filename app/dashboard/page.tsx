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
  isLocked: boolean; // הוספנו דגל נעילה
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
        const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard");
        const data = await response.json();

        if (data && data.events) {
          const upcoming = data.events.map((event: any) => {
            const competition = event.competitions[0];
            const home = competition.competitors.find((c: any) => c.homeAway === 'home').team.displayName;
            const away = competition.competitors.find((c: any) => c.homeAway === 'away').team.displayName;

            const dateObj = new Date(event.date);
            const formattedDate = dateObj.toLocaleString('he-IL', {
              weekday: 'long', 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit'
            });

            // בדיקת נעילת זמן האם שעת המשחק קטנה מהשעה כרגע?
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-xl font-bold text-slate-500 animate-pulse">טוען נתונים...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <header className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-slate-100">
              <AvatarImage src={user?.photoURL} alt={user?.displayName} />
              <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">{user?.displayName}</h2>
              <p className="text-sm font-medium text-blue-600">{user?.totalPoints || 0} נקודות</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => signOut(auth)}>
            התנתק
          </Button>
        </header>

        <Tabs defaultValue="matches" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 h-12 bg-slate-200/50 rounded-xl p-1">
            <TabsTrigger value="matches" className="rounded-lg font-bold text-base">הפרמייר ליג</TabsTrigger>
            <TabsTrigger value="leaderboard" className="rounded-lg font-bold text-base">טבלת החברה</TabsTrigger>
          </TabsList>
          
          <TabsContent value="matches" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black tracking-tight">המשחקים הקרובים</h3>
              {loadingMatches && <span className="text-sm text-blue-500 font-bold animate-pulse">מושך נתונים מ-ESPN...</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!loadingMatches && realMatches.length === 0 && (
                <div className="col-span-full text-center text-slate-400 py-10">
                  לא נמצאו משחקים קרובים בלוח הזמנים
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
          
          <TabsContent value="leaderboard" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
            <h3 className="text-2xl font-black mb-6 tracking-tight">דירוג המובילים</h3>
            
            <div className="space-y-3">
              {leaderboard.map((player, index) => {
                const isCurrentUser = player.id === user?.id;
                return (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isCurrentUser 
                        ? "bg-blue-50/50 border-blue-200 shadow-sm" 
                        : "bg-slate-50/50 border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-6 text-center font-black text-lg ${
                        index === 0 ? "text-yellow-500 text-xl" : index === 1 ? "text-slate-400" : index === 2 ? "text-amber-600" : "text-slate-400"
                      }`}>
                        {index === 0 ? "👑" : index + 1}
                      </span>
                      
                      <Avatar className="h-10 w-10 border border-slate-200">
                        <AvatarImage src={player.photoURL} alt={player.displayName} />
                        <AvatarFallback>{player.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      
                      <span className={`font-bold ${isCurrentUser ? "text-blue-900 font-extrabold" : "text-slate-800"}`}>
                        {player.displayName} {isCurrentUser && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium mr-1">אתה</span>}
                      </span>
                    </div>
                    
                    <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-2xs">
                      {player.totalPoints || 0} נק׳
                    </span>
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