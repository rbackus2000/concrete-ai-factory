"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { signOutAction } from "./actions";

export default function SignOutLink() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await signOutAction();
          router.push("/trade/portal/login");
          router.refresh();
        })
      }
      disabled={pending}
      className="text-foreground/70 underline-offset-4 hover:underline disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
