"use client";

import { signIn } from "next-auth/react";

export function SignInCard() {
  return (
    <section className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
      <div className="w-full rounded-[28px] border border-white/70 bg-white/90 p-8 shadow-soft backdrop-blur">
        <div className="mb-8 inline-flex rounded-full border border-sea/20 bg-sea/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sea">
          Internal SEO Intelligence
        </div>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-ink">
          Google Search Console keyword intelligence dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
          Connect a Google account with Search Console access to fetch performance data,
          enrich keywords by intent and product, and review opportunities in a clean
          leadership-ready dashboard.
        </p>
        <div className="mt-8">
          <button
            type="button"
            onClick={() => signIn("google")}
            className="inline-flex items-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Connect Google Search Console
          </button>
        </div>
        <div className="mt-8 rounded-2xl border border-line bg-mist p-4 text-sm text-slate-600">
          Configure Google OAuth as a Web Application and add these authorized redirect
          URIs:
          <div className="mt-3 font-mono text-xs text-slate-700">
            http://localhost:3000/api/auth/callback/google
          </div>
          <div className="mt-1 font-mono text-xs text-slate-700">
            https://your-vercel-app.vercel.app/api/auth/callback/google
          </div>
        </div>
      </div>
    </section>
  );
}
