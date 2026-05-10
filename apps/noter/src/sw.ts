/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string; revision: string | null })[];
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

self.addEventListener("push", (event: PushEvent) => {
  event.waitUntil(
    (async () => {
      try {
        const data = event.data?.json() as {
          title?: string;
          body?: string;
          url?: string;
        };
        const title = data?.title ?? "Reminder";
        const body = data?.body ?? "";
        const url = data?.url ?? "/";

        await self.registration.showNotification(title, {
          body,
          icon: "/icons/icon-192x192.png",
          data: { url },
        });

        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: "REMINDER_RECEIVED" });
        }
      } catch (err) {
        console.error("[SW] Failed to handle push event:", err);
      }
    })()
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url: string = (event.notification.data as { url?: string })?.url ?? "/";

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windowClients) {
        if (client.url.endsWith(url) && "focus" in client) {
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
