import { UserMenuConnected } from "@/components/user-menu-connected";
import { AppSwitcher, TooltipProvider } from "@jf/ui";
import { MapTrifoldIcon } from "@phosphor-icons/react/dist/ssr";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="relative w-full h-screen overflow-hidden">
        <header className="absolute top-0 left-0 right-0 z-[4000] flex h-14 items-center justify-between px-4 pt-3">
          <a
            href="/"
            className="flex items-center gap-2 text-l font-semibold text-(--primary-foreground) hover:opacity-80 transition-opacity bg-(--primary) px-4 py-1 rounded-xl"
          >
            <MapTrifoldIcon className="text-white" size={32} />
            Tracer
          </a>
          <div className="flex items-center gap-2">
            <AppSwitcher currentAppId="tracer" />
            <UserMenuConnected />
          </div>
        </header>
        {children}
      </div>
    </TooltipProvider>
  );
}
