"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, setDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { toast } from "sonner"; 
import { Crown } from "lucide-react";

import { ReferralInfoCard } from "@/components/referral-info-card";
import { EarningsCard } from "@/components/earnings-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isManaging, setIsManaging] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    const authUser = auth.currentUser;
    if (!authUser) {
      toast.error("User not authenticated.");
      return;
    }

    if (authUser.displayName === displayName) {
      toast.info("No changes to save.");
      return;
    }

    setIsSaving(true);
    try {
      if (authUser.displayName !== displayName) {
        await updateProfile(authUser, { displayName });
      }

      const userDocRef = doc(db, "users", authUser.uid);
      await setDoc(userDocRef, { displayName }, { merge: true });

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile.", {
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user?.email) {
      toast.error("User email not found.");
      return;
    }
    setIsManaging(true);
    try {
      const response = await fetch('/api/paystack/manage-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (response.ok && data.manage_link) {
        window.location.href = data.manage_link;
      } else {
        toast.error(`Failed to get management link: ${data.error || 'Could not find a subscription for this account.'}`);
      }
    } catch (error: any) {
      console.error('Manage subscription error:', error);
      toast.error(`An unexpected error occurred: ${error.message}`);
    } finally {
      setIsManaging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const subscription = user.subscription;
  let daysRemaining: number | null = null;
  let showExpirationWarning = false;

  if (subscription?.status === 'active' && subscription.expiresAt) {
    // The 'expiresAt' field is a Firestore Timestamp, so we convert it to a Date object
    const expiresAtDate = new Date(subscription.expiresAt.seconds * 1000);
    const now = new Date();
    const timeDiff = expiresAtDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    showExpirationWarning = daysRemaining <= 3 && daysRemaining >= 0;
  }

  const renderSubscriptionContent = () => {
    if (subscription?.status === 'active') {
      return (
        <>
          {showExpirationWarning && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-300 rounded-r-lg">
              <p className="font-bold">Subscription Expiring Soon!</p>
              <p className="text-sm">
                Your plan expires in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}.
                <Link href="/vip" className="underline font-semibold ml-1">Renew now</Link>
                {' '}to keep your benefits.
              </p>
            </div>
          )}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div>
                <p className="font-bold text-lg capitalize text-green-800 dark:text-green-300">{subscription.tier} Plan</p>
                <p className="text-sm text-muted-foreground">Status: <span className="font-semibold text-green-600 dark:text-green-400">Active</span></p>
              </div>
              <Crown className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Your plan expires on: {new Date(subscription.expiresAt.seconds * 1000).toLocaleDateString()}
            </p>
            <Button onClick={handleManageSubscription} disabled={isManaging} className="w-full sm:w-auto">
              {isManaging ? "Getting link..." : "Manage Subscription"}
            </Button>
          </div>
        </>
      );
    }

    if (subscription?.status === 'cancelled') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div>
              <p className="font-bold text-lg capitalize text-red-800 dark:text-red-300">{subscription.tier} Plan</p>
              <p className="text-sm text-muted-foreground">Status: <span className="font-semibold text-red-600 dark:text-red-400">Cancelled</span></p>
            </div>
            <Crown className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            Your benefits will expire on: {new Date(subscription.expiresAt.seconds * 1000).toLocaleDateString()}
          </p>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/vip">Resubscribe</Link>
          </Button>
        </div>
      );
    }

    // Default case: no subscription
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">You do not have an active subscription.</p>
        <Button asChild>
          <Link href="/vip">View VIP Plans</Link>
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8">
      <h1 className="text-3xl font-bold">Your Profile</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1: Profile and Avatar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
              </Avatar>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email || ''} disabled readOnly />
                <p className="text-sm text-muted-foreground mt-1">
                  Email cannot be changed.
                </p>
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Subscription and Referrals */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Status</CardTitle>
              <CardDescription>Your current VIP plan details.</CardDescription>
            </CardHeader>
            <CardContent>{renderSubscriptionContent()}</CardContent>
          </Card>

          <EarningsCard user={user} />

          <ReferralInfoCard
            referralCode={user.referralCode ?? "N/A"}
            totalReferrals={user.totalReferrals ?? 0}
            referralEarnings={user.referralEarnings ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
