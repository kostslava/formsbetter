"use client";

import { FormEvent, useState } from "react";
import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { LoaderCircle, LogIn, Sparkles } from "lucide-react";
import { firebaseAuth, googleProvider } from "@/lib/firebase-client";

interface AuthPanelProps {
  title?: string;
  subtitle?: string;
}

function formatAuthError(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return error instanceof Error ? error.message : "Auth failed";
  }

  if (error.code === "auth/unauthorized-domain") {
    const host = typeof window !== "undefined" ? window.location.hostname : "this domain";
    return `Google sign-in is blocked for ${host}. Add this domain in Firebase Console -> Authentication -> Settings -> Authorized domains.`;
  }

  return error.message || "Auth failed";
}

export function AuthPanel({
  title = "Sign in to FormsBetter",
  subtitle = "Use your Pontune Firebase account to access your forms.",
}: AuthPanelProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firebaseAuth) {
      setError("Firebase auth is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.");
      return;
    }

    setWorking(true);
    setError(null);

    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      } else {
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setWorking(false);
    }
  };

  const googleSignIn = async () => {
    if (!firebaseAuth || !googleProvider) {
      setError("Firebase auth is not configured. Set NEXT_PUBLIC_FIREBASE_* env vars.");
      return;
    }

    setWorking(true);
    setError(null);

    try {
      await signInWithPopup(firebaseAuth, googleProvider);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md rounded-2xl border border-white/60 bg-white/85 p-6 shadow-xl backdrop-blur sm:p-7">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
        <Sparkles size={14} />
        Account Access
      </div>
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:ring-2 focus:ring-slate-300/80"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 transition focus:ring-2 focus:ring-slate-300/80"
        />

        <button
          type="submit"
          disabled={working}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
        >
          {working ? <LoaderCircle size={15} className="animate-spin" /> : <LogIn size={15} />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        disabled={working}
        onClick={() => {
          void googleSignIn();
        }}
        className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      >
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-3 text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
      >
        {mode === "signin"
          ? "Need an account? Create one"
          : "Already have an account? Sign in"}
      </button>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
    </section>
  );
}
