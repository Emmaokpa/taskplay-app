// page.tsx
"use client";

import { useAuth } from "@/components/auth-provider";
import Link from "next/link"; // Import Link
import Image from "next/image";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  // The loading and user checks are handled by the layout, so we can assume user exists here.
  if (!user) {
    return null; // or a loading spinner, though layout should prevent this
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-left">
        <h1 className="text-xl font-bold sm:text-2xl md:text-3xl">
          Welcome, {user?.displayName || user?.email}!
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Ready to play, complete tasks, and earn rewards?
        </p>
      </div>

      {/* Main Banner */}
      <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden bg-primary/10">
        <Image
          src="/dashboard-banner.jpg" // The new banner image
          alt="TaskPlay Banner"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/games" passHref>
          <Card className="group relative aspect-[4/3] w-full overflow-hidden p-0 transition-shadow hover:shadow-lg">
            <Image src="/card-games.jpg" alt="Play Games" fill className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105" />
          </Card>
        </Link>

        <Link href="/dashboard/tasks" passHref>
          <Card className="group relative aspect-[4/3] w-full overflow-hidden p-0 transition-shadow hover:shadow-lg">
            <Image src="/card-offers.jpg" alt="Offers" fill className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105" />
          </Card>
        </Link>

        <Link href="/dashboard/affiliate" passHref>
          <Card className="group relative aspect-[4/3] w-full overflow-hidden p-0 transition-shadow hover:shadow-lg">
            <Image src="/card-affiliate.jpg" alt="Affiliate" fill className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105" />
          </Card>
        </Link>

        <Link href="/dashboard/videos" passHref>
          <Card className="group relative aspect-[4/3] w-full overflow-hidden p-0 transition-shadow hover:shadow-lg">
            <Image src="/card-videos.jpg" alt="Watch Videos" fill className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105" />
          </Card>
        </Link>
      </div>
    </div>
  );
}
