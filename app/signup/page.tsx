import { SignUpForm } from "@/components/signup-form";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-center mb-6">
          Create an Account
        </h1>
        <SignUpForm />
      </div>
    </main>
  );
}
