"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export default function UnsubscribePage() {
  const params = useParams<{ token: string }>();
  const [status, setStatus] = useState<"idle" | "unsubscribed" | "resubscribed" | "error">("idle");
  const [loading, setLoading] = useState(false);

  async function handleUnsubscribe() {
    setLoading(true);
    try {
      const res = await fetch(`/api/unsubscribe/${params.token}`, { method: "POST" });
      if (res.ok) {
        setStatus("unsubscribed");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResubscribe() {
    setLoading(true);
    try {
      const res = await fetch(`/api/unsubscribe/${params.token}`, { method: "DELETE" });
      if (res.ok) {
        setStatus("resubscribed");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-zinc-900">RB Studio</h1>
          <p className="mt-1 text-sm text-zinc-500">Email Preferences</p>
        </div>

        {status === "idle" && (
          <div className="text-center">
            <p className="mb-6 text-zinc-700">
              Click below to unsubscribe from RB Studio marketing emails.
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="rounded-md bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Unsubscribe"}
            </button>
          </div>
        )}

        {status === "unsubscribed" && (
          <div className="text-center">
            <p className="mb-4 text-zinc-700">
              You&apos;ve been unsubscribed from RB Studio emails.
            </p>
            <p className="mb-6 text-sm text-zinc-500">
              You will no longer receive marketing emails from us.
            </p>
            <button
              onClick={handleResubscribe}
              disabled={loading}
              className="text-sm text-blue-600 underline hover:text-blue-700"
            >
              Changed your mind? Resubscribe
            </button>
          </div>
        )}

        {status === "resubscribed" && (
          <div className="text-center">
            <p className="text-zinc-700">
              Welcome back! You&apos;ve been resubscribed to RB Studio emails.
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <p className="text-red-600">
              Something went wrong. Please try again later.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
