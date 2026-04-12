import { AppShell } from "@jf/ui";
import { NotepadIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      appIcon={<NotepadIcon className="text-(--primary)" size={32} />}
      appName="Noter"
      currentAppId="notes"
      titleHref="/"
    >
      {children}
    </AppShell>
  );
}
