import Link from "next/link";

type AccessPageProps = {
  searchParams: {
    error?: string;
    returnTo?: string;
  };
};

export default function AccessPage({ searchParams }: AccessPageProps) {
  const returnTo = searchParams.returnTo ?? "/";
  const hasError = searchParams.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/95 p-8 shadow-soft">
        <div className="inline-flex rounded-full border border-sea/20 bg-sea/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sea">
          Restricted Access
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-ink">
          Enter dashboard password
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This SEO dashboard is restricted to approved viewers. Enter the shared
          password to continue.
        </p>

        <form action="/api/access" method="post" className="mt-8 space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block text-sm">
            <span className="mb-2 block font-medium text-ink">Password</span>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 outline-none"
            />
          </label>

          {hasError ? (
            <div className="rounded-2xl border border-coral/20 bg-coral/5 px-4 py-3 text-sm text-coral">
              Incorrect password. Please try again.
            </div>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Continue
          </button>
        </form>

        <p className="mt-6 text-xs text-slate-500">
          If you need access, contact the dashboard owner.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          <Link href="/" className="underline underline-offset-2">
            Back to home
          </Link>
        </p>
      </section>
    </main>
  );
}
