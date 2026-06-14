"use client";

import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from "@/lib/constants";
import type { CategoryRow, SpotRow } from "@/lib/queries";
import L from "leaflet";
import { createElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

function MapRefCapture({ mapRef }: { mapRef: React.RefObject<L.Map | null> }) {
  const map = useMap();
  mapRef.current = map;
  return null;
}

function SpotHoverBubble({ spot, x, y }: { spot: SpotRow; x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute z-[3500] animate-[overlay-in_0.15s_ease-out]"
      style={{ left: x + 20, top: y, transform: "translateY(-50%)" }}
    >
      <div className="w-[180px] overflow-hidden rounded-[12px] bg-(--card) shadow-[0_8px_24px_0_rgba(0,0,0,0.2)]">
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium text-(--grey-900)">{spot.name}</p>
        </div>
        {spot.photoUrl && (
          <img src={spot.photoUrl} alt={spot.name} className="h-[100px] w-full object-cover" />
        )}
      </div>
    </div>
  );
}
import { SpotDetailModal } from "./spot-detail-modal";

interface PlacerMapProps {
  spots: SpotRow[];
  categories: CategoryRow[];
  pendingLocation?: { lat: number; lng: number } | null;
  flyToTarget?: { lat: number; lng: number; zoom: number } | null;
  activeCategoryId?: string | null;
  pinnableLocation?: { lat: number; lng: number } | null;
  onPinClick?: () => void;
  onMapDoubleClick?: (loc: { lat: number; lng: number }) => void;
}

function createSpotIcon(color: string, iconName: string) {
  const Icon = (CATEGORY_ICONS[iconName] ??
    CATEGORY_ICONS[DEFAULT_CATEGORY_ICON]) as React.ComponentType<{ size: number; color: string }>;
  const iconSvg = renderToStaticMarkup(
    createElement(Icon, {
      size: 14,
      color: "white",
    })
  );
  return L.divIcon({
    html: `<div style="width:28px;height:28px;border-radius:6px;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">${iconSvg}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    className: "",
  });
}

const pendingIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:transparent;border:3px solid var(--blue-400);box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  className: "",
});

const userPosIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:var(--blue-400);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: "",
});

const pinnableIcon = L.divIcon({
  html: `<div style="width:28px;height:28px;border-radius:50%;background:var(--blue-400);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="white"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  className: "",
});

function FitBounds({ markers, skip }: { markers: [number, number][]; skip: boolean }) {
  const map = useMap();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (skip || markers.length === 0) return;

    timerRef.current = setTimeout(() => {
      const valid = markers.filter(([lat, lng]) => lat !== undefined && lng !== undefined);
      if (valid.length === 0) return;

      if (valid.length === 1 && valid[0]) {
        map.setView(valid[0], 10);
      } else {
        map.fitBounds(L.latLngBounds(valid), { maxZoom: 16, padding: [50, 50] });
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [markers, map, skip]);

  return null;
}

function UserLocation({ onPosition }: { onPosition: (pos: [number, number]) => void }) {
  const map = useMap();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current || !navigator.geolocation) return;
    calledRef.current = true;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos: [number, number] = [coords.latitude, coords.longitude];
        map.setView(pos, 16);
        onPosition(pos);
      },
      () => {}
    );
  }, [map, onPosition]);

  return null;
}

function LocateControl({ userPosition }: { userPosition: [number, number] | null }) {
  const map = useMap();
  const posRef = useRef(userPosition);
  posRef.current = userPosition;

  useEffect(() => {
    const btn = L.DomUtil.create("button") as HTMLButtonElement;
    btn.type = "button";
    btn.title = "Go to my location";
    btn.style.cssText =
      "display:flex;align-items:center;justify-content:center;width:30px;height:30px;cursor:pointer;background:var(--card);border:none;border-radius:0.75rem;box-shadow:0 0 10px rgba(0,0,0,0.1);";
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M232,120h-8.34A96.14,96.14,0,0,0,136,32.34V24a8,8,0,0,0-16,0v8.34A96.14,96.14,0,0,0,32.34,120H24a8,8,0,0,0,0,16h8.34A96.14,96.14,0,0,0,120,223.66V232a8,8,0,0,0,16,0v-8.34A96.14,96.14,0,0,0,223.66,136H232a8,8,0,0,0,0-16Zm-96,87.6V200a8,8,0,0,0-16,0v7.6A80.15,80.15,0,0,1,48.4,136H56a8,8,0,0,0,0-16H48.4A80.15,80.15,0,0,1,120,48.4V56a8,8,0,0,0,16,0V48.4A80.15,80.15,0,0,1,207.6,120H200a8,8,0,0,0,0,16h7.6A80.15,80.15,0,0,1,136,207.6ZM128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z"/></svg>';

    L.DomEvent.disableClickPropagation(btn);
    btn.onclick = () => {
      if (posRef.current) {
        map.flyTo(posRef.current, 16);
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            const pos: [number, number] = [coords.latitude, coords.longitude];
            posRef.current = pos;
            map.flyTo(pos, 16);
          },
          () => {}
        );
      }
    };

    const container = L.DomUtil.create("div", "leaflet-control");
    container.appendChild(btn);

    const Ctrl = L.Control.extend({
      onAdd: () => container,
      onRemove: () => {},
    });
    const ctrl = new (Ctrl as new (opts: L.ControlOptions) => L.Control)({
      position: "bottomright",
    });
    ctrl.addTo(map);
    return () => {
      map.removeControl(ctrl);
    };
  }, [map]);

  return null;
}

const MIN_ZOOM_FOR_PLACEMENT = 10;

function MapDoubleClick({
  onDoubleClick,
}: { onDoubleClick: ((loc: { lat: number; lng: number }) => void) | undefined }) {
  const map = useMapEvents({
    dblclick(e) {
      if (map.getZoom() >= MIN_ZOOM_FOR_PLACEMENT) {
        onDoubleClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else {
        map.zoomIn();
      }
    },
  });
  return null;
}

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
  categories,
  pendingLocation,
  flyToTarget,
  activeCategoryId,
  pinnableLocation,
  onPinClick,
  onMapDoubleClick,
}: PlacerMapProps) {
  const [selectedSpot, setSelectedSpot] = useState<SpotRow | null>(null);
  const [hoveredSpot, setHoveredSpot] = useState<{ spot: SpotRow; x: number; y: number } | null>(
    null
  );
  const [locationOverride, setLocationOverride] = useState(false);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const visibleSpots = activeCategoryId
    ? spots.filter((s) => s.category?.id === activeCategoryId)
    : spots;

  const markerPositions = useMemo((): [number, number][] => {
    const positions: [number, number][] = visibleSpots.map((s) => [s.lat, s.lng]);
    if (pendingLocation) positions.push([pendingLocation.lat, pendingLocation.lng]);
    return positions;
  }, [visibleSpots, pendingLocation]);

  return (
    <>
      <div className="relative h-full w-full">
        <div className="h-full w-full isolate overflow-hidden rounded-[22px]">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={3}
            doubleClickZoom={false}
            style={{ height: "100%", width: "100%" }}
            attributionControl={false}
            zoomControl={true}
            className="greyscale-map"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapRefCapture mapRef={mapRef} />
            <MapDoubleClick onDoubleClick={onMapDoubleClick} />
            <FlyTo target={flyToTarget} />
            <FitBounds markers={markerPositions} skip={locationOverride} />
            <UserLocation
              onPosition={(pos) => {
                setUserPosition(pos);
                setLocationOverride(true);
              }}
            />
            <LocateControl userPosition={userPosition} />
            {visibleSpots.map((spot) => (
              <Marker
                key={spot.id}
                position={[spot.lat, spot.lng]}
                icon={createSpotIcon(
                  spot.category?.color ?? "var(--grey-400)",
                  spot.category?.icon ?? DEFAULT_CATEGORY_ICON
                )}
                eventHandlers={{
                  click: () => setSelectedSpot(spot),
                  mouseover: () => {
                    const map = mapRef.current;
                    if (!map) return;
                    const point = map.latLngToContainerPoint([spot.lat, spot.lng]);
                    setHoveredSpot({ spot, x: point.x, y: point.y });
                  },
                  mouseout: () => setHoveredSpot(null),
                }}
              />
            ))}
            {pendingLocation && (
              <Marker position={[pendingLocation.lat, pendingLocation.lng]} icon={pendingIcon} />
            )}
            {userPosition && <Marker position={userPosition} icon={userPosIcon} />}
            {pinnableLocation && (
              <Marker
                position={[pinnableLocation.lat, pinnableLocation.lng]}
                icon={pinnableIcon}
                eventHandlers={{ click: () => onPinClick?.() }}
              />
            )}
          </MapContainer>
        </div>
        {hoveredSpot && (
          <SpotHoverBubble spot={hoveredSpot.spot} x={hoveredSpot.x} y={hoveredSpot.y} />
        )}
      </div>

      <SpotDetailModal
        spot={selectedSpot}
        categories={categories}
        onClose={() => setSelectedSpot(null)}
      />
    </>
  );
}
