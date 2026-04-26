"use client";

import { signIn, signUp } from "@jf/auth/client";
import { TextInput } from "@jf/ui";
import { apps } from "@jf/ui/config/apps";
import { GoogleLogoIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignUpForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: signUpError } = await signUp.email({
      name,
      email,
      password,
      callbackURL: redirect ?? "/",
    });

    if (signUpError) {
      setError(signUpError.message ?? "Sign up failed");
      setLoading(false);
    } else {
      setEmailSent(true);
      setLoading(false);
    }
  }

  const loginHref = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";

  async function handleGoogleSignIn() {
    setLoading(true);
    setError("");
    const { error: googleError } = await signIn.social({
      provider: "google",
      callbackURL: redirect ?? "/",
    });
    if (googleError) {
      setError(googleError.message ?? "Google sign-in failed");
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="text-2xl font-semibold text-(--grey-900) mb-1">Check your email</h1>
        <p className="text-sm text-(--grey-600)">
          We sent a verification link to <strong>{email}</strong>. Click it to activate your
          account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
      <h1 className="text-2xl font-semibold text-(--grey-900) mb-1">Create account</h1>
      {error && <p className="text-sm text-(--red-500)">{error}</p>}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-(--surface-200) px-3 text-sm font-medium text-(--grey-900) shadow-sm disabled:opacity-50"
      >
        <GoogleLogoIcon size={18} />
        Continue with Google
      </button>
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-(--grey-200)" />
        <span className="text-xs text-(--grey-400)">or</span>
        <div className="h-px flex-1 bg-(--grey-200)" />
      </div>
      <TextInput type="text" placeholder="Name" value={name} onChange={setName} required />
      <TextInput type="email" placeholder="Email" value={email} onChange={setEmail} required />
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
        {loading ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-(--grey-600)">
        Already have an account?{" "}
        <Link href={loginHref} className="underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default function SignUpPage() {
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
          <SignUpForm />
        </Suspense>
      </div>
    </main>
  );
}
