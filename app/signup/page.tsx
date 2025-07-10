import { SignUpForm } from "@/components/signup-form";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Create an Account</h1>
          <p className="text-muted-foreground">
            Enter your details to get started
          </p>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}