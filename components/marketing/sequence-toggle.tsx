"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SequenceToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketing/sequences/${id}/toggle`, { method: "PUT" });
      if (res.ok) {
        const { data } = await res.json();
        setActive(data.isActive);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        active ? "bg-blue-600" : "bg-zinc-300"
      } ${loading ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block size-3.5 rounded-full bg-white transition-transform ${
          active ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}
