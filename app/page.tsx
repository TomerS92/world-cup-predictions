"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleLogin = async () => {
    console.log("1. הכפתור נלחץ בהצלחה!");
    
    try {
      console.log("2. מכין את חלון ההתחברות של גוגל...");
      const provider = new GoogleAuthProvider();
      
      console.log("3. מנסה לפתוח את החלון...");
      const result = await signInWithPopup(auth, provider);
      
      console.log("4. ההתחברות עבדה! המשתמש:", result.user.email);

      // בדיקה אם המשתמש כבר קיים במסד הנתונים
      const userRef = doc(db, "Users", result.user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log("5. יוצר משתמש חדש במסד הנתונים...");
        await setDoc(userRef, {
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          email: result.user.email,
          totalPoints: 0,
          streakCount: 0,
          joinedAt: new Date(),
        });
      }

      console.log("6. מעביר ל-Dashboard...");
      router.push("/dashboard");
      
    } catch (error: any) {
      console.error("7. שגיאה מפורטת:", error);
      alert(`הייתה שגיאה: ${error.message}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md text-center shadow-lg border-0">
        <CardHeader className="space-y-2">
          <div className="text-6xl mb-4">🏆</div>
          <CardTitle className="text-3xl font-extrabold tracking-tight">
            ניחושי המונדיאל
          </CardTitle>
          <CardDescription className="text-base text-slate-500">
            האפליקציה הרשמית של החברה. <br />
            התחברו כדי להתחיל לצבור נקודות!
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Button 
            className="w-full text-lg h-12 rounded-xl" 
            size="lg"
            onClick={handleLogin}
          >
            התחבר עם Google
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}