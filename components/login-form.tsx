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
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase/config"; // Import db
import { doc, setDoc, serverTimestamp } from "firebase/firestore"; // Import Firestore functions
import { GoogleIcon } from "./icons/google-icon";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string(),
});

export function LoginForm() {
  const router = useRouter(); // Ensure useRouter is called here

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast.success("Signed in successfully!");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error("Uh oh! Something went wrong.", {
        description: error.message,
      });
    }
  }

  async function handleGoogleSignIn() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
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
            <Button type="submit" className="w-full">
              Sign In
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
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline">
            Sign Up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
