"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Gamepad2,
  ClipboardList,
  Video,
  DollarSign,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Games", href: "/dashboard/games", icon: Gamepad2 },
  { name: "Offers", href: "/dashboard/tasks", icon: ClipboardList },
  { name: "Videos", href: "/dashboard/videos", icon: Video },
  { name: "Affiliate", href: "/dashboard/affiliate", icon: DollarSign },
];

export function BottomBar() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "inline-flex flex-col items-center justify-center px-5 hover:bg-muted group",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}