import { BoughtList } from "@/components/bought-list";
import { getBought } from "@/lib/queries";
import { auth } from "@jf/auth";
import { headers } from "next/headers";

export default async function BoughtPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const items = await getBought(session?.user.id ?? "");
  return <BoughtList items={items} />;
}
