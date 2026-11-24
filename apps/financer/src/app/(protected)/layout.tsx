import { FinancerShell } from "@/components/financer-shell";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  return <FinancerShell userId={session?.user.id ?? ""}>{children}</FinancerShell>;
}
