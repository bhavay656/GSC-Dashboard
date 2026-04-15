import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { SignInCard } from "@/components/sign-in-card";

export default async function HomePage() {
  const session = await auth();

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      {session?.user?.id ? (
        <DashboardShell
          user={{
            name: session.user.name ?? "Connected user",
            email: session.user.email ?? ""
          }}
        />
      ) : (
        <SignInCard />
      )}
    </main>
  );
}
