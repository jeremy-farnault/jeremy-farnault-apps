import { SpinnerGapIcon } from "@phosphor-icons/react/dist/ssr";

export default function Loading() {
  return (
    <div className="flex flex-1 w-full items-center justify-center">
      <SpinnerGapIcon size={32} className="animate-spin text-(--grey-500)" />
    </div>
  );
}
