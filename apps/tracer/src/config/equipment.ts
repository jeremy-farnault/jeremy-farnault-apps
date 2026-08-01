// Persistent, ownable gear sold by the weapon/vehicle shops. Weapons raise the
// holder's effective Might; vehicles change the direct-route routing profile
// (cycling/driving) so real travel time comes from the routing API, not a
// hardcoded multiplier.

// Mapbox Directions profile the active vehicle routes the direct trip through.
export type VehicleProfile = "cycling" | "driving";

export type EquipmentDef =
  | { id: string; name: string; emoji: string; price: number; kind: "weapon"; might: number }
  | {
      id: string;
      name: string;
      emoji: string;
      price: number;
      kind: "vehicle";
      profile: VehicleProfile;
    };

export const EQUIPMENT: EquipmentDef[] = [
  { id: "stick", name: "Stick", emoji: "🪵", price: 100, kind: "weapon", might: 5 },
  { id: "bat", name: "Baseball Bat", emoji: "🏏", price: 1500, kind: "weapon", might: 3 },
  { id: "airgun", name: "Airgun", emoji: "🔫", price: 4000, kind: "weapon", might: 5 },
  { id: "cb400n", name: "CB400N", emoji: "🏍️", price: 1000, kind: "vehicle", profile: "driving" },
  { id: "bike", name: "Bicycle", emoji: "🚲", price: 3000, kind: "vehicle", profile: "cycling" },
  {
    id: "motorbike",
    name: "Motorbike",
    emoji: "🏍️",
    price: 12000,
    kind: "vehicle",
    profile: "driving",
  },
];

// One owned instance of a definition, assignable to an actor and toggled on/off.
export type OwnedItem = {
  instanceId: string;
  defId: string;
  ownerId: string;
  active: boolean;
};

function defOf(item: OwnedItem): EquipmentDef | undefined {
  return EQUIPMENT.find((d) => d.id === item.defId);
}

// The Might bonus from the owner's active weapon (slot rule guarantees ≤1), else 0.
export function activeWeaponMight(items: OwnedItem[], ownerId: string): number {
  for (const it of items) {
    if (!it.active || it.ownerId !== ownerId) continue;
    const def = defOf(it);
    if (def?.kind === "weapon") return def.might;
  }
  return 0;
}

// Human-readable effect of a vehicle's routing profile, for shop/loadout labels.
export function profileLabel(profile: VehicleProfile): string {
  return profile === "cycling" ? "Cycling route" : "Driving route";
}

export type VehicleDef = Extract<EquipmentDef, { kind: "vehicle" }>;

// The owner's active vehicle def (slot rule guarantees ≤1), else null (walk).
// Callers read `.profile` for routing and `.name` for the travel-mode label.
export function activeVehicle(items: OwnedItem[], ownerId: string): VehicleDef | null {
  for (const it of items) {
    if (!it.active || it.ownerId !== ownerId) continue;
    const def = defOf(it);
    if (def?.kind === "vehicle") return def;
  }
  return null;
}
