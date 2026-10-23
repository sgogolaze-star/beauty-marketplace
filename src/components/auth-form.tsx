"use client";
import { useState } from "react";
import { authenticate } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
import { AccountTypeSelector } from "@/components/account-type-selector";
import type { RegistrationType } from "@/lib/provider-validation";

export function AuthForm({
  signup,
  initialKind,
  next,
}: {
  signup: boolean;
  initialKind: RegistrationType;
  next: string;
}) {
  const [kind, setKind] = useState(initialKind);
  return (
    <form action={authenticate} className="stack">
      <input type="hidden" name="mode" value={signup ? "signup" : "login"} />
      <input type="hidden" name="next" value={next} />
      {signup && (
        <>
          <AccountTypeSelector value={kind} onChange={setKind} />
          <p className="registration-help" aria-live="polite">
            {kind === "customer"
              ? "Discover and book beauty and wellness services."
              : kind === "business"
                ? "For salons, studios and teams. After email confirmation, complete your business application for review."
                : "For professionals working independently. After email confirmation, complete your provider application for review."}
          </p>
          {kind !== "customer" && (
            <ol className="signup-steps" aria-label="Registration steps">
              <li aria-current="step">1. Account</li>
              <li>2. Application</li>
              <li>3. Review</li>
            </ol>
          )}
          <label>
            Full name
            <input
              name="full_name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              placeholder="Your first and last name"
            />
          </label>
        </>
      )}
      <label>
        Email address
        <input
          required
          type="email"
          name="email"
          autoComplete="email"
          maxLength={254}
          placeholder="you@example.com"
        />
      </label>
      <label>
        Password
        <input
          required
          type="password"
          name="password"
          minLength={8}
          maxLength={128}
          autoComplete={signup ? "new-password" : "current-password"}
          placeholder="At least 8 characters"
        />
      </label>
      {signup && (
        <p className="form-note">
          We use these details to create your account and manage bookings.
          Provider contact and business details are collected in the next step.
          Never enter identity documents or payment details here.
        </p>
      )}
      <SubmitButton>
        {signup
          ? kind === "customer"
            ? "Create customer account"
            : "Create account and continue"
          : "Sign in"}
      </SubmitButton>
    </form>
  );
}
