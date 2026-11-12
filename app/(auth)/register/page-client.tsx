"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useState } from "react";

import { signIn } from "next-auth/react";

import { BRAND } from "@/lib/brand";

import { BrandLegalLinks } from "@/components/shared/brand-legal-links";
import { BrandLogo } from "@/components/shared/brand-logo";
import LinkedIn from "@/components/shared/icons/linkedin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="flex min-h-screen w-full justify-center bg-[#f6f5f0] pb-12">
      <div className="z-10 mx-5 mt-[calc(20vh)] h-fit w-full max-w-md overflow-hidden rounded-sm border border-border bg-white dark:bg-gray-900 sm:mx-0 sm:shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 px-4 py-6 pt-8 text-center sm:px-16">
          <Link
            href={BRAND.marketingUrl}
            className="text-[#173c34] dark:text-white"
          >
            <BrandLogo />
          </Link>
          <h3 className="text-2xl font-medium text-foreground">
            Start sharing documents
          </h3>
        </div>
        <form
          className="flex flex-col gap-4 p-4 pt-8 sm:px-16"
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
              setError(
                "Unable to connect. Check your connection and try again.",
              );
            } finally {
              setPendingMethod(null);
            }
          }}
        >
          <Input
            id="register-email"
            aria-label="Email address"
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
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button
            type="submit"
            loading={pendingMethod === "email"}
            disabled={!!pendingMethod || !email.trim()}
            className="bg-[#146354] text-white hover:bg-[#104d42]"
          >
            Continue with Email
          </Button>
        </form>
        <p className="text-center">or</p>
        <div className="flex flex-col space-y-2 px-4 py-8 sm:px-16">
          <Button
            onClick={() => continueWithProvider("google")}
            disabled={!!pendingMethod}
            loading={pendingMethod === "google"}
            className="flex items-center justify-center space-x-2"
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
            className="flex items-center justify-center space-x-2"
          >
            <LinkedIn />
            <span>Continue with LinkedIn</span>
          </Button>
        </div>
        <BrandLegalLinks className="px-4 pb-8 sm:px-16" />
      </div>
    </div>
  );
}
