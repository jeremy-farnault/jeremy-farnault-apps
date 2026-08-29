import { ApertureIcon } from "@phosphor-icons/react/dist/ssr";

export default function HandleNotFound() {
  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <ApertureIcon size={48} weight="thin" className="text-(--grey-400)" />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-(--grey-900)">Portfolio not found</h1>
        <p className="max-w-sm text-sm text-(--grey-600)">
          No one has claimed this handle, or the link is incorrect.
        </p>
      </div>
    </main>
  );
}
