"use client";

import { CATEGORY_ICONS } from "@/lib/constants";
import type { SpotRow } from "@/lib/queries";
import { ActionModal } from "@jf/ui";

interface SpotDetailModalProps {
  spot: SpotRow | null;
  onClose: () => void;
}

export function SpotDetailModal({ spot, onClose }: SpotDetailModalProps) {
  const IconComp = spot?.category ? CATEGORY_ICONS[spot.category.icon] : undefined;

  return (
    <ActionModal
      isOpen={!!spot}
      onClose={onClose}
      size="small"
      title={spot?.name ?? ""}
      content={
        spot && (
          <div className="flex flex-col gap-3">
            {spot.category && (
              <div className="flex items-center gap-2">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: spot.category.color }}
                >
                  {IconComp && <IconComp size={14} className="text-white" />}
                </span>
                <span className="text-sm text-(--grey-700)">{spot.category.name}</span>
              </div>
            )}
            {spot.description && <p className="text-sm text-(--grey-700)">{spot.description}</p>}
            <p className="font-mono text-xs text-(--grey-500)">
              {spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}
            </p>
          </div>
        )
      }
      secondaryButton={{ label: "Close", onClick: onClose }}
    />
  );
}
