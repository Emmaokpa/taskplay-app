// c:\Users\Emmanuel Okpa\Desktop\TaskPlay\client\app\page.tsx
"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't do anything until the auth state is determined
    if (isLoading) {
      return;
    }

    // If a user exists, redirect to the main dashboard.
    // Otherwise, send them to the login page.
    if (user) {
      router.push("/dashboard"); // This is the redirect from the root
    } else {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Render a loading state while the authentication check is in progress.
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>Loading...</p>
    </div>
  );
}
