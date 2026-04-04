import { auth } from "@jf/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      <NavBar />
      {children}
    </div>
  );
}
