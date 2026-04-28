"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { requestMagicLinkAction } from "../actions";

type Props = {
  fromPath?: string | null;
};

export default function LoginForm({ fromPath }: Props) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-medium">Check your email.</p>
        <p className="mt-1 text-emerald-800">
          If <strong>{email}</strong> matches an active trade account, we just sent a sign-in link. The link expires in 30 minutes and can only be used once.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setEmail("");
          }}
          className="mt-3 text-emerald-700 underline-offset-4 hover:underline"
        >
          Use a different email →
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.trim()) return;
        startTransition(async () => {
          await requestMagicLinkAction(email);
          setSubmitted(true);
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@firm.com"
        />
      </div>
      {fromPath && (
        <p className="text-xs text-muted-foreground">
          You&apos;ll return to <code className="font-mono">{fromPath}</code> after signing in.
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending link…" : "Email me a sign-in link →"}
      </Button>
    </form>
  );
}
