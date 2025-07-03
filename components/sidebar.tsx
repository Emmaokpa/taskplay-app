// components/sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  // {
  //   name: "Affiliate",
  //   href: "/affiliate",
  //   icon: DollarSign,
  //   adminOnly: false,
  // },
  {
    name: "Affiliate",
    href: "/affiliate",
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
    <aside className="w-64 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col p-4 border-r border-gray-200 dark:border-gray-700">
      <div className="flex-1">
        <h2 className="text-2xl font-bold mb-8 text-gray-900 dark:text-white">
          TaskPlay
        </h2>
        <nav className="space-y-1">
          {navItems.map((item) => {
            if (item.adminOnly && !isAdmin) {
              return null; // This correctly hides the admin link for non-admins
            }

            // Highlight the "Admin Panel" link if the user is on any admin page.
            const isActive = item.href === "/dashboard/admin"
              ? pathname.startsWith(item.href)
              : pathname === item.href;

            return (
              <Link key={item.name} href={item.href} passHref>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto">
        <Button variant="outline" className="w-full justify-center gap-2" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
