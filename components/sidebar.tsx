// components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/components/auth-provider"; // Import useAuth
import { toast } from "sonner";
import {
  LayoutDashboard,
  UserCircle,
  Settings,
  Gamepad2,
  ClipboardList,
  ShieldCheck,
  LogOut,
  Crown,
  DollarSign,
  Banknote,
  Video,
} from "lucide-react";

const navItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    adminOnly: false,
  },
  {
    name: "Profile",
    href: "/dashboard/profile", // Corrected path
    icon: UserCircle,
    adminOnly: false,
  },
  {
    name: "Offers",
    href: "/dashboard/tasks",
    icon: ClipboardList,
    adminOnly: false,
  },
  {
    name: "Games",
    href: "/dashboard/games",
    icon: Gamepad2,
    adminOnly: false,
  },
  {
    name: "Videos",
    href: "/dashboard/videos",
    icon: Video,
    adminOnly: false,
  },
  {
    name: "Affiliate",
    href: "/dashboard/affiliate",
    icon: DollarSign,
    adminOnly: false,
  },
  {
    name: "Withdrawals",
    href: "/dashboard/admin/withdrawals",
    icon: Banknote,
    adminOnly: true,
  },
  {
    name: "VIP",
    href: "/vip",
    icon: Crown,
    adminOnly: false,
  },
  {
    name: "Settings",
    href: "/dashboard/settings", // Corrected path
    icon: Settings,
    adminOnly: false,
  },
  // This is the single entry point for all admin functionality
  {
    name: "Admin Panel",
    href: "/dashboard/admin",
    icon: ShieldCheck,
    adminOnly: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully!");
      router.push("/login");
    } catch (error: any) {
      toast.error("Sign Out Failed", {
        description: error.message,
      });
    }
  };

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          {/* You can add an icon here if you want */}
          <span className="">TaskPlay</span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start gap-1 px-2 text-sm font-medium lg:px-4">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) {
              return null; // This correctly hides the admin link for non-admins
            }

            // Highlight the "Admin Panel" link if the user is on any admin page.
            const isActive =
              item.href === "/dashboard/admin"
                ? pathname.startsWith(item.href)
                : pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  buttonVariants({ variant: isActive ? "secondary" : "ghost" }),
                  "w-full justify-start"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4">
        <Button variant="outline" className="w-full justify-center gap-2" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
}
