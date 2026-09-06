"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return <button type="button" className="back-button" onClick={() => window.history.length > 1 ? router.back() : router.push("/dashboard")} aria-label="Go back">← Back</button>;
}
