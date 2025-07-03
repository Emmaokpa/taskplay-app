"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "./ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface ReferralInfoCardProps {
  referralCode: string;
  totalReferrals: number;
  referralEarnings: number;
}

export function ReferralInfoCard({
  referralCode,
  totalReferrals,
  referralEarnings,
}: ReferralInfoCardProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied to clipboard!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Referral Stats</CardTitle>
        <CardDescription>
          Share your code to earn ₦50 for every new user who signs up.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border bg-muted p-3">
          <p className="text-sm font-medium">Your Code:</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-mono font-bold tracking-wider text-primary">
              {referralCode}
            </p>
            <Button variant="ghost" size="icon" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex justify-around text-center">
          <div>
            <p className="text-2xl font-bold">{totalReferrals}</p>
            <p className="text-sm text-muted-foreground">Total Referrals</p>
          </div>
          <div>
            <p className="text-2xl font-bold">₦{referralEarnings}</p>
            <p className="text-sm text-muted-foreground">Total Earnings</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
