import { NotesNav } from "@/components/notes-nav";
import { AppShell } from "@jf/ui";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell currentAppId="notes" bottomBarItems={<NotesNav />}>
      {children}
    </AppShell>
  );
}
