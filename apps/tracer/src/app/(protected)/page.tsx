"use client";

import { GameMap } from "@/components/game-map";
import { ITEM_CATALOGUE } from "@/config/economy";
import { useStats } from "@/hooks/use-stats";
import { loadInventory, removeItem } from "@/lib/inventory";
import type { InventoryItem } from "@/lib/inventory";
import { useEffect, useState } from "react";

export default function GamePage() {
  const { stats, resetStats, restoreStats } = useStats();
  const [expanded, setExpanded] = useState(false);
  const [inventoryExpanded, setInventoryExpanded] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>(() => loadInventory());
  const [time, setTime] = useState(() => new Date().toLocaleTimeString());

  const itemMap = Object.fromEntries(ITEM_CATALOGUE.map((i) => [i.id, i]));

  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  const isCritical = stats.hunger === 0 || stats.thirst === 0;

  function handleConsume(itemId: string) {
    const item = itemMap[itemId];
    if (!item) return;
    const updated = removeItem(itemId);
    setInventory(updated);
    restoreStats(item.hungerRestore, item.thirstRestore);
  }

  function handleReset() {
    resetStats();
    localStorage.removeItem("tracer:travel");
    localStorage.removeItem("tracer:position");
    window.location.reload();
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <GameMap />

      {/* Temporary dev reset button */}
      <button
        type="button"
        onClick={handleReset}
        className="absolute top-4 left-4 z-10 text-xs text-(--grey-500) underline cursor-pointer"
      >
        Reset
      </button>

      {/* In-game time */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-lg bg-(--surface-200)/90 backdrop-blur-sm border border-(--surface-300)">
        <p className="text-xs font-medium tabular-nums text-(--grey-200)">{time}</p>
      </div>

      {/* Bottom-left panel stack */}
      <div className="absolute bottom-20 left-4 z-10 flex flex-col gap-2 w-56">
        {/* Inventory panel */}
        <button
          type="button"
          className="rounded-xl bg-(--surface-200)/90 backdrop-blur-sm border border-red-500 cursor-pointer select-none text-left w-full"
          onClick={() => setInventoryExpanded((v) => !v)}
        >
          <div className="flex items-center justify-between p-4">
            <p className="text-xs font-semibold text-(--grey-500) uppercase tracking-wider">
              🎒 Inventory
            </p>
          </div>

          {inventoryExpanded && (
            <div className="px-4 pb-4 flex flex-col gap-2">
              {inventory.length === 0 ? (
                <p className="text-xs text-(--grey-500) italic">Nothing here</p>
              ) : (
                inventory.map((entry) => {
                  const item = itemMap[entry.itemId];
                  if (!item) return null;
                  return (
                    <div key={entry.itemId} className="flex items-center justify-between">
                      <span className="text-xs text-(--grey-200)">
                        {item.emoji} {item.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConsume(entry.itemId);
                        }}
                        className="text-xs text-(--grey-500) hover:text-white tabular-nums transition-colors"
                      >
                        ×{entry.quantity}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </button>

        {/* Character panel */}
        <button
          type="button"
          className="rounded-xl bg-(--surface-200)/90 backdrop-blur-sm border border-red-500 cursor-pointer select-none text-left w-full"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center justify-between p-4">
            <p className="text-xs font-semibold text-(--grey-500) uppercase tracking-wider">
              Character
            </p>
            {isCritical && !expanded && <span className="w-2 h-2 rounded-full bg-red-500" />}
          </div>

          {expanded && (
            <div className="px-4 pb-4 flex flex-col gap-2">
              <StatRow label="❤️ Health" value={`${Math.floor(stats.health)}`} />
              <StatRow
                label="🍚 Hunger"
                value={`${Math.floor(stats.hunger)}`}
                critical={stats.hunger === 0}
              />
              <StatRow
                label="💧 Thirst"
                value={`${Math.floor(stats.thirst)}`}
                critical={stats.thirst === 0}
              />
              <StatRow label="💴 Money" value={`¥${stats.money.toLocaleString()}`} />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  critical,
}: {
  label: string;
  value: string;
  critical?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-(--grey-500)">{label}</span>
      <span
        className={`text-xs font-medium tabular-nums ${critical ? "text-red-500" : "text-(--grey-200)"}`}
      >
        {value}
      </span>
    </div>
  );
}
