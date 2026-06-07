"use client";

import type { SpotRow } from "@/lib/queries";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { SpotDetailModal } from "./spot-detail-modal";

interface PlacerMapProps {
  spots: SpotRow[];
  pendingLocation?: { lat: number; lng: number } | null;
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

export function PlacerMap({ spots, pendingLocation }: PlacerMapProps) {
  const [selectedSpot, setSelectedSpot] = useState<SpotRow | null>(null);

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
          {spots.map((spot) => (
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
