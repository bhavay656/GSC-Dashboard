"use client";

import { useSession } from "next-auth/react";
import { DashboardShell } from "@/components/dashboard-shell";
import { SignInCard } from "@/components/sign-in-card";

export function HomeClient() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <section className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
        <div className="rounded-3xl border border-white/70 bg-white/90 px-6 py-5 text-sm text-slate-600 shadow-soft">
          Loading dashboard session...
        </div>
      </section>
    );
  }

  if (session?.user?.id) {
    return (
      <DashboardShell
        user={{
          name: session.user.name ?? "Connected user",
          email: session.user.email ?? ""
        }}
      />
    );
  }

  return <SignInCard />;
}
