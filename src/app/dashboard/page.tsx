"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/"); return; }
    const provider = session.provider;
    if (provider === "google") {
      router.replace("/dashboard/gmail");
    } else {
      router.replace("/dashboard/messages");
    }
  }, [session, status, router]);

  return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Redirecting...</span>
    </div>
  );
}
