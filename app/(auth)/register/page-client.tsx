"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useState } from "react";

import { signIn } from "next-auth/react";

import { BRAND } from "@/lib/brand";

import { AuthShell } from "@/components/shared/auth-shell";
import { BrandLegalLinks } from "@/components/shared/brand-legal-links";
import LinkedIn from "@/components/shared/icons/linkedin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const router = useRouter();
  const next = useSearchParams()?.get("next") ?? undefined;

  const [email, setEmail] = useState<string>("");
  const [pendingMethod, setPendingMethod] = useState<
    "email" | "google" | "linkedin" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  async function continueWithProvider(provider: "google" | "linkedin") {
    if (pendingMethod) return;
    setPendingMethod(provider);
    setError(null);
    try {
      const response = await signIn(provider, {
        ...(next ? { callbackUrl: next } : {}),
      });
      if (response?.error) setError("Unable to sign in. Please try again.");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setPendingMethod(null);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      description="Use your work email to get a sign-in code. No password to remember."
      footer={
        <p>
          Already have an account?{" "}
          <Link
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pendingMethod) return;
          const submittedEmail = email.trim().toLowerCase();
          setPendingMethod("email");
          setError(null);
          try {
            const response = await signIn("email", {
              email: submittedEmail,
              redirect: false,
              ...(next ? { callbackUrl: next } : {}),
            });
            if (response?.ok && !response.error) {
              try {
                sessionStorage.setItem(
                  "pendingVerificationEmail",
                  submittedEmail,
                );
              } catch {
                // Verification also supports entering the email manually.
              }
              router.push("/auth/email");
            } else {
              setError("Unable to send your code. Please try again.");
            }
          } catch {
            setError("Unable to connect. Check your connection and try again.");
          } finally {
            setPendingMethod(null);
          }
        }}
      >
        <Label htmlFor="register-email">Work email</Label>
        <Input
          id="register-email"
          aria-describedby={error ? "registration-error" : undefined}
          type="email"
          autoComplete="email"
          required
          className="border"
          placeholder="jsmith@company.co"
          disabled={!!pendingMethod}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && (
          <p
            id="registration-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <Button
          type="submit"
          loading={pendingMethod === "email"}
          disabled={!!pendingMethod || !email.trim()}
        >
          Continue with Email
        </Button>
      </form>
      <p className="my-5 text-center text-sm text-muted-foreground">
        Or continue with
      </p>
      <div className="flex flex-col gap-3">
        <Button
          onClick={() => continueWithProvider("google")}
          disabled={!!pendingMethod}
          loading={pendingMethod === "google"}
          variant="outline"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 488 512"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
          </svg>
          <span>Continue with Google</span>
        </Button>
        <Button
          onClick={() => continueWithProvider("linkedin")}
          disabled={!!pendingMethod}
          loading={pendingMethod === "linkedin"}
          variant="outline"
        >
          <LinkedIn />
          <span>Continue with LinkedIn</span>
        </Button>
      </div>
      <BrandLegalLinks className="mt-6" />
    </AuthShell>
  );
}
