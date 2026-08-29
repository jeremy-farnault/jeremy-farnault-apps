import { Button } from "@jf/ui";
import { ApertureIcon } from "@phosphor-icons/react/dist/ssr";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3003";
const EXPOSER_URL = process.env.NEXT_PUBLIC_EXPOSER_URL ?? "http://localhost:3016";

export function SignInLanding() {
  const loginHref = `${AUTH_URL}/login?redirect=${encodeURIComponent(EXPOSER_URL)}`;

  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <ApertureIcon size={56} weight="thin" className="text-(--purple-600)" />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-(--grey-900)">Exposer</h1>
        <p className="max-w-md text-(--grey-600)">
          A public-by-link photo portfolio. Sign in to create yours, or open a{" "}
          <span className="whitespace-nowrap">/handle</span> link to view someone&apos;s work.
        </p>
      </div>
      <Button asChild size="lg">
        <a href={loginHref}>Sign in</a>
      </Button>
    </main>
  );
}
