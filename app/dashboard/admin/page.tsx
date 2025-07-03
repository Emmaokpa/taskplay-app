"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  ClipboardList,
  ListChecks,
  Gamepad2,
  ShoppingBag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  const { user, isAdmin, isLoading, idToken } = useAuth();
  const router = useRouter();
  const [pendingWithdrawals, setPendingWithdrawals] = useState<number | null>(null);

  const fetchPendingCount = useCallback(async () => {
    if (!idToken) return;
    try {
      const response = await fetch('/api/admin/withdrawal-requests?status=pending', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPendingWithdrawals(data.length);
      } else {
        setPendingWithdrawals(0);
      }
    } catch (error) {
      console.error("Failed to fetch pending withdrawals", error);
      setPendingWithdrawals(0);
    }
  }, [idToken]);

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      toast.error("Access Denied");
      router.push("/dashboard");
    }
    fetchPendingCount();
  }, [isLoading, isAdmin, router, fetchPendingCount]);

  if (isLoading || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <p>Loading or checking permissions...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Welcome, {user?.displayName || 'Admin'}!</h1>
      <p className="text-muted-foreground mb-8">Here's an overview of your application.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Withdrawals Card */}
        <Link href="/dashboard/admin/withdrawals" className="block"> {/* Wrap the entire Card with Link */}
          <Card className="flex flex-col justify-between hover:shadow-lg transition-shadow h-full"> {/* Added h-full for consistent card heights */}
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Banknote />Withdrawal Requests</CardTitle>
              <CardDescription>Approve or reject user payout requests.</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingWithdrawals === null ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <p className="text-3xl font-bold">{pendingWithdrawals} <span className="text-lg font-normal text-muted-foreground">pending</span></p>
              )}
            </CardContent>
            <CardFooter>
              {/* Button here is now primarily for styling, no longer uses asChild */}
              <Button variant="link" className="w-full justify-start p-0"> {/* Use variant="link" to make it look like a link */}
                Manage Withdrawals <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </Link>

        {/* Manage Tasks Card */}
        <Link href="/dashboard/admin/manage-tasks" className="block">
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Manage Tasks
                <ClipboardList className="h-6 w-6 text-muted-foreground" />
              </CardTitle>
              <CardDescription>Create, edit, delete, and toggle tasks.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="link" className="w-full justify-start p-0">Go to Tasks <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </CardFooter>
          </Card>
        </Link>

        {/* Manage Games Card */}
        <Link href="/dashboard/admin/manage-games" className="block">
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Manage Games
                <Gamepad2 className="h-6 w-6 text-muted-foreground" />
              </CardTitle>
              <CardDescription>Add, edit, and manage games.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="link" className="w-full justify-start p-0">Manage Games <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </CardFooter>
          </Card>
        </Link>

        {/* Verify Submissions Card */}
        <Link href="/dashboard/admin/verify-submissions" className="block">
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Verify Submissions
                <ListChecks className="h-6 w-6 text-muted-foreground" />
              </CardTitle>
              <CardDescription>Approve or reject user task submissions.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="link" className="w-full justify-start p-0">Verify Submissions <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </CardFooter>
          </Card>
        </Link>

        {/* Affiliate Products Card */}
        <Link href="/dashboard/admin/affiliate" className="block">
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Affiliate Products
                <ShoppingBag className="h-6 w-6 text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                Add, edit, and manage affiliate products.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="link" className="w-full justify-start p-0">Go to Affiliate <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </CardFooter>
          </Card>
        </Link>
      </div>
    </div>
  );
}