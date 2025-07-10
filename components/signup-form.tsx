// signup-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/config"; // Import db
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { generateReferralCode } from "@/lib/generate-code";
import { applyReferral } from "@/lib/firebase/referrals";
import { GoogleIcon } from "./icons/google-icon";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  referralCode: z.string().optional(),
});

export function SignUpForm() {
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      referralCode: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;
      const newReferralCode = generateReferralCode();

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: values.email, // Use the email from the form
        isAdmin: false, // Default to not admin
        createdAt: serverTimestamp(), // Use serverTimestamp for creation time
        nairaBalance: 20, // Award the ₦20 sign-up bonus immediately
        // Referral fields
        referralCode: newReferralCode,
        referredBy: values.referralCode || null, // The code they used
        referredByUID: null, // Will be set after successful referral
        lastLoginDate: serverTimestamp(), // Set the first login date
        consecutiveLoginDays: 1, // Start the streak at 1
        totalReferrals: 0,
        referralEarnings: 0,
        referrals: [],
      });

      toast.success("Account created successfully!");

      // If a referral code was used, try to apply it
      if (values.referralCode) {
        await applyReferral(values.referralCode, user.uid);
      }

      router.push("/dashboard");
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error("Email already in use.", {
          description: "An account with this email already exists. Please try logging in.",
        });
      } else {
        toast.error("Uh oh! Something went wrong.", {
          description: error.message,
        });
      }
    }
  }

  async function handleGoogleSignIn() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if the user document already exists to avoid overwriting data
      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);

      // Only create a new document if one doesn't exist
      if (!docSnap.exists()) {
        const newReferralCode = generateReferralCode();
        await setDoc(userDocRef, {
          displayName: user.displayName || user.email,
          email: user.email,
          photoURL: user.photoURL,
          isAdmin: false,
          createdAt: serverTimestamp(),
          nairaBalance: 20,
          referralCode: newReferralCode,
          referredBy: null,
          lastLoginDate: serverTimestamp(),
          consecutiveLoginDays: 1,
          referredByUID: null,
          totalReferrals: 0,
          referralEarnings: 0,
          referrals: [],
        });
      }

      toast.success("Signed in with Google successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error("Google Sign-In Failed", {
        description: error.message,
      });
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="referralCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral Code (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter referral code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </form>
        </Form>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          Google
        </Button>
      </CardContent>
      <CardFooter className="flex justify-center text-sm">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
