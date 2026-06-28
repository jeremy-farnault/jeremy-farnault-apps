import { GameMap } from "@/components/game-map";

export default function GamePage() {
  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden">
      <GameMap />
      <div className="absolute bottom-20 left-4 z-10 w-56 rounded-xl bg-(--surface-200)/90 backdrop-blur-sm border border-(--surface-300) p-4">
        <p className="text-xs font-semibold text-(--grey-500) uppercase tracking-wider">
          Character
        </p>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-80 rounded-xl bg-(--surface-200)/90 backdrop-blur-sm border border-(--surface-300) p-3">
        <p className="text-xs font-semibold text-(--grey-500) uppercase tracking-wider">
          Travel status
        </p>
      </div>
    </div>
  );
}
