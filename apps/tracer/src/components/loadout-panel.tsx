"use client";

import { EQUIPMENT, type EquipmentDef, type OwnedItem, profileLabel } from "@/config/equipment";
import { useEquipmentStore } from "@/stores/equipment-store";
import { useState } from "react";

function defOf(item: OwnedItem): EquipmentDef | undefined {
  return EQUIPMENT.find((d) => d.id === item.defId);
}

function bonusLabel(def: EquipmentDef): string {
  return def.kind === "weapon" ? `+${def.might} Might` : profileLabel(def.profile);
}

type Row = { item: OwnedItem; def: EquipmentDef };

export function LoadoutPanel() {
  const [expanded, setExpanded] = useState(false);
  const items = useEquipmentStore((s) => s.items);
  const toggle = useEquipmentStore((s) => s.toggle);

  const rows: Row[] = items
    .map((item) => ({ item, def: defOf(item) }))
    .filter((r): r is Row => r.def !== undefined);
  const weapons = rows.filter((r) => r.def.kind === "weapon");
  const vehicles = rows.filter((r) => r.def.kind === "vehicle");

  const renderRow = ({ item, def }: Row) => (
    <div key={item.instanceId} className="flex items-center justify-between gap-2">
      <span className="text-xs text-(--grey-200)">
        {def.emoji} {def.name} <span className="text-(--grey-500)">{bonusLabel(def)}</span>
      </span>
      <button
        type="button"
        onClick={() => toggle(item.instanceId)}
        className={`shrink-0 text-xs font-semibold tabular-nums transition-colors ${
          item.active ? "text-red-500" : "text-(--grey-500) hover:text-white"
        }`}
      >
        {item.active ? "on" : "off"}
      </button>
    </div>
  );

  return (
    <div className="rounded-xl bg-(--surface-200)/90 backdrop-blur-sm border border-red-500 select-none text-left w-full">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <p className="text-xs font-semibold text-(--grey-500) uppercase tracking-wider">
          🧰 Loadout
        </p>
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-2">
          {rows.length === 0 ? (
            <p className="text-xs text-(--grey-500) italic">Nothing owned</p>
          ) : (
            <>
              {weapons.length > 0 && (
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-(--grey-500) uppercase tracking-wider">Weapons</p>
                  {weapons.map(renderRow)}
                </div>
              )}
              {vehicles.length > 0 && (
                <div
                  className={`flex flex-col gap-1 ${
                    weapons.length > 0 ? "pt-2 border-t border-(--surface-300)" : ""
                  }`}
                >
                  <p className="text-[10px] text-(--grey-500) uppercase tracking-wider">Vehicles</p>
                  {vehicles.map(renderRow)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
