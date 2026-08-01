"use client";

import { EQUIPMENT, profileLabel } from "@/config/equipment";
import type { GenericPoi } from "@/config/game";
import { log } from "@/lib/log";
import { useCharacterStore } from "@/stores/character-store";
import { useEquipmentStore } from "@/stores/equipment-store";

function formatYen(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

interface Props {
  poi: GenericPoi;
  onClose: () => void;
}

export function EquipmentShopModal({ poi, onClose }: Props) {
  const money = useCharacterStore((s) => s.money);
  const spendMoney = useCharacterStore((s) => s.spendMoney);
  const acquire = useEquipmentStore((s) => s.acquire);

  const title = `${poi.emoji} ${poi.label}`;
  const forSale = poi.sells ?? [];
  const items = EQUIPMENT.filter((d) => forSale.includes(d.id));

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      <div className="w-80 rounded-xl bg-(--surface-200)/95 backdrop-blur-sm border border-(--surface-300) p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-(--grey-500) hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{item.emoji}</span>
                <div>
                  <p className="text-xs font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-(--grey-500)">
                    {item.kind === "weapon" ? `+${item.might} Might` : profileLabel(item.profile)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={money < item.price}
                onClick={() => {
                  if (spendMoney(item.price)) {
                    acquire(item.id);
                    log({
                      category: "purchase",
                      message: `Bought ${item.name} · −${formatYen(item.price)}`,
                    });
                  }
                }}
                className="shrink-0 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1 transition-colors"
              >
                ¥{item.price}
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-(--grey-500) text-right tabular-nums">
          Balance: ¥{money.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
