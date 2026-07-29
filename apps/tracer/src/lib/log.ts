import { type LogCategory, useLogStore } from "@/stores/log-store";
import { toast } from "sonner";

// How a log call should surface as a toast, if at all. Omit for log-only.
export type ToastTone = "success" | "error" | "default";

// The single entry-point every event site calls. Appends to the activity log
// and, when `toast` is set, also fires a sonner toast. Kept as a plain helper
// (not a store method) so the store stays pure state with no sonner import.
// Called imperatively from event handlers via getState(), matching the
// existing useRegionStore.getState().discover(...) pattern.
export function log(params: {
  category: LogCategory;
  message: string;
  toast?: ToastTone;
}): void {
  const { category, message, toast: tone } = params;
  useLogStore.getState().add(category, message);
  if (!tone) return;
  if (tone === "success") toast.success(message);
  else if (tone === "error") toast.error(message);
  else toast(message);
}
