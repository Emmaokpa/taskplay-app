// page.tsx
"use client";

import { db } from "@/lib/firebase/config";
import { doc, setDoc, Timestamp, increment } from "firebase/firestore";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import SubscriptionButton from "@/components/SubscriptionButton";
import { ReferralInfoCard } from "@/components/referral-info-card";
import Link from "next/link"; // Import Link
import { Button } from "@/components/ui/button"; // Import Button

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [hasCheckedBonus, setHasCheckedBonus] = useState(false);  

  const DAILY_LOGIN_BONUS_AMOUNT = 20;

  useEffect(() => {
    // Only run the check once per session after the user is loaded
    if (user && !hasCheckedBonus) {
      checkAndAwardDailyBonus();
      setHasCheckedBonus(true);
    }
  }, [user, hasCheckedBonus]);

  const checkAndAwardDailyBonus = async () => {
    if (!user) return;

    const storedLastLoginDate = user.lastLoginDate;
    const storedConsecutiveDays = user.consecutiveLoginDays || 0;

    const now = Timestamp.now();
    const todayMidnight = new Date(now.toDate().setHours(0, 0, 0, 0)).getTime();

    // If there's no last login date, it's the user's first session.
    // The sign-up form has already awarded the bonus, so we just set the date.
    if (!storedLastLoginDate) {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          lastLoginDate: now,
          consecutiveLoginDays: 1, // Start the streak
        },
        { merge: true }
      );
      return; // Exit, no bonus to award here
    }

    const lastLoginDayMidnight = new Date(
      storedLastLoginDate.toDate().setHours(0, 0, 0, 0)
    ).getTime();

    // If the last login was before today, award a bonus.
    if (lastLoginDayMidnight < todayMidnight) {
      const yesterdayMidnight = new Date(todayMidnight);
      yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);

      const newConsecutiveDays =
        lastLoginDayMidnight === yesterdayMidnight.getTime()
          ? storedConsecutiveDays + 1
          : 1; // Reset streak if they missed a day

      const userDocRef = doc(db, "users", user.uid);
      await setDoc(
        userDocRef,
        {
          lastLoginDate: now,
          consecutiveLoginDays: newConsecutiveDays,
          nairaBalance: increment(DAILY_LOGIN_BONUS_AMOUNT),
        },
        { merge: true }
      );

      toast.success(
        `You received your daily ₦${DAILY_LOGIN_BONUS_AMOUNT} login bonus!`
      );
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-4xl space-y-8">
      <h1 className="text-3xl md:text-4xl font-bold text-center">
        Welcome, {user?.displayName || user?.email}!
      </h1>

      <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-white w-full text-center">
        <h2 className="text-2xl font-semibold mb-2">Your Balance</h2>
        <p className="text-4xl font-bold text-yellow-400 mb-4">
          ₦{user.nairaBalance?.toFixed(2) ?? "0.00"}
        </p>
        <p className="text-sm text-blue-400">
          Consecutive Login Days: {user.consecutiveLoginDays ?? 1}
        </p>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-white w-full text-center">
        <h2 className="text-2xl font-semibold mb-2">Your Game Limits (Today)</h2>
        <p>
          Free Games: <Badge className="ml-2">{user.dailyFreeGamesPlayed?.[new Date().toISOString().split('T')[0]] ?? 0} / 3</Badge>
        </p>

        {user.subscription ? (
          <p className="mt-2">
            Paid Games ({user.subscription.tier} Tier):{" "}
            <Badge className="ml-2">
              {user.dailyPaidGamesPlayed?.[new Date().toISOString().split('T')[0]] ?? 0} / {user.subscription.gamesPerDay}
            </Badge>
          </p>
        ) : (
          <p className="mt-2">Subscribe to play more games and earn more!</p>
        )}
      </div>
      <Link href="/vip" className="mt-4">
        <Button>View VIP Subscriptions</Button>
      </Link>

       {/* Add Subscription Buttons */}
      {user && !user.subscription && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl text-white w-full text-center mt-4">
          <h2 className="text-2xl font-semibold mb-2">Upgrade Your Experience</h2>
          <div className="flex flex-wrap justify-center gap-4">
            <SubscriptionButton tier="silver" email={user.email!} />
            <SubscriptionButton tier="gold" email={user.email!} />
            <SubscriptionButton tier="diamond" email={user.email!} />
            <SubscriptionButton tier="platinum" email={user.email!} />
          </div>
        </div>
      )}



      <ReferralInfoCard
        referralCode={user.referralCode ?? "N/A"}
        totalReferrals={user.totalReferrals ?? 0}
        referralEarnings={user.referralEarnings ?? 0}
      />
    </div>
  );
}
