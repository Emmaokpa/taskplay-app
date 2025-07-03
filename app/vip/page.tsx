"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import SubscriptionButton from "@/components/SubscriptionButton";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Define the subscription tiers data, including prices and features
const tiers = [
  {
    name: "Silver",
    tier: "silver" as const,
    price: 4000,
    features: [
      "10 Games Per Day",
      "Standard Support",
    ],
    popular: false,
  },
  {
    name: "Gold",
    tier: "gold" as const,
    price: 7000,
    features: [
      "25 Games Per Day",
      "Priority Support",
      "Access to Exclusive Games",
    ],
    popular: true,
  },
  {
    name: "Diamond",
    tier: "diamond" as const,
    price: 12000,
    features: [
      "60 Games Per Day",
      "24/7 Priority Support",
      "Access to All Exclusive Games",
      "Early Access to New Features",
    ],
    popular: false,
  },
  {
    name: "Platinum",
    tier: "platinum" as const,
    price: 20000,
    features: [
      "150 Games Per Day",
      "Dedicated Account Manager",
      "Access to All Exclusive Games",
      "Early Access to New Features",
      "Custom Game Requests",
    ],
    popular: false,
  },
];

const VIPPage = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isManaging, setIsManaging] = useState(false);

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
      toast.error(`An unexpected error occurred: ${error.message}`);
    } finally {
      setIsManaging(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><p>Loading...</p></div>;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const subscription = user.subscription;
  let daysRemaining: number | null = null;
  let showExpirationWarning = false;

  if (subscription?.status === 'active' && subscription.expiresAt) {
    const expiresAtDate = new Date(subscription.expiresAt.seconds * 1000);
    const now = new Date();
    const timeDiff = expiresAtDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    showExpirationWarning = daysRemaining <= 3 && daysRemaining >= 0;
  }

  if (user.subscription?.status === 'active' || user.subscription?.status === 'cancelled') {
    // Find the details of the current tier to display features
    const currentTierDetails = tiers.find(t => t.tier === user.subscription.tier);
    const isActive = user.subscription.status === 'active';

    return (
      <div className="container mx-auto px-4 py-12">
        {showExpirationWarning && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-300 rounded-lg">
            <p className="font-bold">Your Subscription is Expiring Soon!</p>
            <p className="text-sm">
              Your {subscription?.tier} plan will expire in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}.
              Renew now to avoid losing your VIP benefits.
            </p>
          </div>
        )}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            {isActive ? 'Your Active Plan' : 'Your Plan Status'}
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">
            {isActive ? 'Thank you for being a VIP member!' : 'Your subscription has been cancelled.'}
          </p>
        </div>
        <div className="flex justify-center">
          <Card className={cn("w-full max-w-md border-primary ring-2", isActive ? "ring-primary" : "ring-gray-400")}>
            <CardHeader className="text-center">
              <Badge className={cn("w-fit self-center mb-2 text-white", isActive ? "bg-green-500 hover:bg-green-500" : "bg-red-500 hover:bg-red-500")}>
                {isActive ? 'Active' : 'Cancelled'}
              </Badge>
              <CardTitle className="capitalize text-3xl">{user.subscription.tier}</CardTitle>
              <CardDescription>
                {isActive ? 'Expires on:' : 'Benefits expire on:'} {new Date(user.subscription.expiresAt.seconds * 1000).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {currentTierDetails?.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {isActive ? (
                <Button onClick={handleManageSubscription} disabled={isManaging} className="w-full">
                  {isManaging ? "Getting link..." : "Manage Subscription"}
                </Button>
              ) : (
                <Button asChild className="w-full"><Link href="/vip">Resubscribe</Link></Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
            Choose Your VIP Plan
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">
            Unlock exclusive benefits and enhance your gaming experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {tiers.map((tier) => (
            <Card key={tier.name} className={cn("flex flex-col", tier.popular && "border-primary ring-2 ring-primary")}>
              <CardHeader>
                {tier.popular && <Badge className="w-fit self-center mb-2">Most Popular</Badge>}
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>
                  <span className="text-3xl font-bold">₦{tier.price.toLocaleString()}</span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <CheckCircle2 className="mr-2 h-5 w-5 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <SubscriptionButton tier={tier.tier} email={user.email!} />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VIPPage;
