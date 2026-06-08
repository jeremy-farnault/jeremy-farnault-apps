"use client";

import type { SpotRow } from "@/lib/queries";
import L from "leaflet";
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { SpotDetailModal } from "./spot-detail-modal";

interface PlacerMapProps {
  spots: SpotRow[];
  pendingLocation?: { lat: number; lng: number } | null;
  flyToTarget?: { lat: number; lng: number; zoom: number } | null;
  activeCategoryId?: string | null;
}

function createSpotIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    className: "",
  });
}

const pendingIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:transparent;border:3px solid var(--blue-400);box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  className: "",
});

function FlyTo({
  target,
}: { target: { lat: number; lng: number; zoom: number } | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], target.zoom);
  }, [target, map]);
  return null;
}

export function PlacerMap({
  spots,
  pendingLocation,
  flyToTarget,
  activeCategoryId,
}: PlacerMapProps) {
  const [selectedSpot, setSelectedSpot] = useState<SpotRow | null>(null);

  const visibleSpots = activeCategoryId
    ? spots.filter((s) => s.category?.id === activeCategoryId)
    : spots;

  return (
    <>
      <div className="greyscale-map h-full w-full">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
          zoomControl={true}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FlyTo target={flyToTarget} />
          {visibleSpots.map((spot) => (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              icon={createSpotIcon(spot.category?.color ?? "var(--grey-400)")}
              eventHandlers={{ click: () => setSelectedSpot(spot) }}
            />
          ))}
          {pendingLocation && (
            <Marker position={[pendingLocation.lat, pendingLocation.lng]} icon={pendingIcon} />
          )}
        </MapContainer>
      </div>

      <SpotDetailModal spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
    </>
  );
}
