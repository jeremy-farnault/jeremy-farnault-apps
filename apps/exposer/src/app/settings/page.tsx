import { HandleSettings } from "@/components/handle-settings";
import { TagSettings } from "@/components/tag-settings";
import { getUserTags } from "@/lib/tag-actions";
import { getSessionUser } from "@/lib/user";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/");

  const tags = await getUserTags();

  return (
    <main className="flex w-full flex-1 flex-col gap-8 px-4 py-8">
      <h1 className="text-xl font-semibold text-(--grey-900)">Settings</h1>
      <HandleSettings currentHandle={sessionUser.handle ?? ""} />
      <TagSettings initialTags={tags} />
    </main>
  );
}
