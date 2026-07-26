"use client";

import type { Poi } from "@/config/game";
import { Popup } from "react-map-gl/mapbox";

interface Props {
  poi: Poi;
  onClose: () => void;
  onGoHere: (poi: Poi) => void;
  disabled?: boolean;
  onAction?: (poi: Poi) => void;
  actionLabel?: "Shop" | "Eat" | "Work" | "Explore" | "Study" | "Train" | "Rest" | "Confront";
  actionDisabled?: boolean;
  actionHint?: string;
}

export function SelectionPopup({
  poi,
  onClose,
  onGoHere,
  disabled,
  onAction,
  actionLabel,
  actionDisabled,
  actionHint,
}: Props) {
  const isHome = poi.category === "home";
  return (
    <Popup
      longitude={poi.longitude}
      latitude={poi.latitude}
      anchor="bottom"
      offset={40}
      onClose={onClose}
      closeButton={false}
      closeOnClick={true}
      className="tracer-popup"
    >
      <div className="flex flex-col gap-2 p-1 min-w-32">
        <div>
          <p className="text-sm font-semibold text-white">{poi.label}</p>
          {!isHome && <p className="text-xs text-white/50 capitalize">{poi.category}</p>}
        </div>
        {onAction && actionLabel && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => !actionDisabled && onAction(poi)}
              disabled={actionDisabled}
              className="w-full rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 transition-colors"
            >
              {actionLabel}
            </button>
            {actionHint && <p className="text-[10px] text-white/50 text-center">{actionHint}</p>}
          </div>
        )}
        <button
          type="button"
          onClick={() => !disabled && onGoHere(poi)}
          disabled={disabled}
          className="w-full rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold py-1.5 transition-colors"
        >
          {isHome ? "Go home" : "Go here"}
        </button>
      </div>
    </Popup>
  );
}
