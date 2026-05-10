"use client";

import { toast } from "sonner";

// Module-level (not component-level) so the guard survives HMR reloads in dev
// and is shared across all component instances in production.
let subscriptionAttempted = false;

export function usePushSubscription() {
  async function requestPushSubscription() {
    if (subscriptionAttempted) return;
    subscriptionAttempted = true;

    // Graceful no-op in environments without SW / PushManager (e.g. dev build)
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      toast("Push notifications are disabled — you'll only see in-app reminders");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const { endpoint, keys } = subscription.toJSON();

      // Server POST failure is silent — reminder is created, subscription can
      // be retried on next session
      try {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, p256dh: keys?.p256dh, auth: keys?.auth }),
        });
      } catch (err) {
        console.error("Failed to save push subscription to server:", err);
      }
    } catch (err) {
      // pushManager.subscribe() failure (e.g. bad VAPID key, browser rejection)
      console.error("Push subscription failed:", err);
      toast("Push notifications couldn't be enabled — you'll only see in-app reminders");
    }
  }

  return { requestPushSubscription };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
