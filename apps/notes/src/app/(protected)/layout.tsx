import { NotepadIcon } from "@phosphor-icons/react/dist/ssr";
import { NotesNav } from "@/components/notes-nav";
import { AppShell } from "@jf/ui";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      currentAppId="notes"
      appName="Noter"
      appIcon={<NotepadIcon size={20} />}
      bottomBarItems={<NotesNav />}
    >
      <div className="bg-(--grey-100) min-h-screen">
        {children}
      </div>
    </AppShell>
  );
}
