"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { AuthDivider, AuthShell } from "./AuthShell";
import GoogleButton from "./GoogleButton";
import { Button, Form, Input } from "@/components/ui/form";

interface AuthFormProps {
  mode: "login" | "signup";
}

/**
 * Generic sign-in / sign-up card. Not used by the live /login and /signup
 * pages, but kept in the same look so it matches if it is ever wired up.
 */
export default function AuthForm({ mode }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;

    // Simulate validation/submission logic
    // In a real app, you'd use signIn('credentials', ...) or a server action
    try {
      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Use at least ${MIN_PASSWORD_LENGTH} characters`);
        return;
      }

      // If successful, redirect
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <AuthShell
      title={mode === "login" ? "Sign in" : "Create your account"}
      subtitle={mode === "login" ? "Welcome back. Sign in to see your farm." : "Keep your farm records in one place."}
      footer={
        mode === "login" ? (
          <>
            Don't have an account?{" "}
            <Link href="/signup" className="font-semibold text-accent hover:underline">
              Create one
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </>
        )
      }
    >
      <Form onSubmit={handleSubmit} className="space-y-5">
        {mode === "signup" && (
          <>
            <Input label="Full name" name="name" type="text" autoComplete="name" required />
            <Input label="Phone number" name="phone" type="tel" inputMode="tel" autoComplete="tel" required />
          </>
        )}
        <Input label="Email" name="email" type="email" autoComplete="email" required />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          error={error || undefined}
        />
        <Button
          type="submit"
          variant="accent"
          isLoading={isLoading}
          loadingText={mode === "login" ? "Signing in" : "Creating account"}
          className="min-h-12 w-full text-[15px] md:min-h-11"
        >
          {mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </Form>

      <AuthDivider />

      <GoogleButton
        onClick={handleGoogleSignIn}
        label={mode === "login" ? "Continue with Google" : "Sign up with Google"}
        disabled={isLoading}
      />
    </AuthShell>
  );
}
