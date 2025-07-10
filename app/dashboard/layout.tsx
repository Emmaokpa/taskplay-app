// layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Wallet } from "lucide-react";

import { useAuth } from "@/components/auth-provider";
import { Sidebar } from "@/components/sidebar"; // Ensure this import is present
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { BottomBar } from "@/components/bottom-bar";
import { Badge } from "@/components/ui/badge";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const totalBalance =
    (user?.nairaBalance || 0) +
    (user?.referralEarnings || 0) +
    (user?.affiliateEarnings || 0);

  useEffect(() => {
    // If not loading and no user is found, redirect to login
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Show a loading state while authentication is in progress
  if (isLoading || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-background md:block">
        <Sidebar />
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
                <SheetDescription>
                  Main navigation menu for the dashboard.
                </SheetDescription>
              </SheetHeader>
              <Sidebar />
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1" /> {/* This pushes the following items to the right */}
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <Badge variant="outline" className="text-sm font-semibold">
              ₦{totalBalance.toFixed(2)}
            </Badge>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <BottomBar />
    </div>
  );
}
