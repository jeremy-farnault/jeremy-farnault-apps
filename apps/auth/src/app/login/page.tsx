"use client";

import { signIn } from "@jf/auth/client";
import { TextInput } from "@jf/ui";
import { apps } from "@jf/ui/config/apps";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await signIn.email({ email, password });

    if (signInError) {
      setError(signInError.message ?? "Login failed");
      setLoading(false);
    } else {
      router.push(redirect ?? "/");
      router.refresh();
    }
  }

  const signupHref = redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : "/signup";

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <h1 className="text-2xl font-semibold text-(--grey-900) mb-1">Sign in</h1>
      {error && <p className="text-sm text-(--red-500)">{error}</p>}
      <TextInput
        type="email"
        placeholder="Email"
        value={email}
        onChange={setEmail}
        required
      />
      <TextInput
        type="password"
        placeholder="Password"
        value={password}
        onChange={setPassword}
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-[10px] bg-(--magenta-400) px-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-sm text-(--grey-600)">
        No account yet?{" "}
        <Link href={signupHref} className="underline">
          Create one
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full max-w-[1024px] flex-col items-center px-4">
      <header className="sticky top-0 z-40 flex h-14 w-full items-center pt-3">
        <div className="flex items-center gap-3">
          {apps
            .filter((app) => ["notes", "journaler"].includes(app.id))
            .map((app) => (
              <a key={app.id} href={app.href} aria-label={app.name}>
                <app.icon
                  size={24}
                  style={{ color: app.accentColor ? `var(${app.accentColor})` : undefined }}
                />
              </a>
            ))}
          <span className="text-l font-semibold text-(--grey-900)">Outils</span>
        </div>
      </header>
      <div className="flex flex-1 w-full items-center justify-center py-16">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
