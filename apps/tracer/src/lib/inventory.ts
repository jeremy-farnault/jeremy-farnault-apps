const INVENTORY_KEY = "tracer:inventory";

export type InventoryItem = {
  itemId: string;
  quantity: number;
};

export function loadInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    return raw ? (JSON.parse(raw) as InventoryItem[]) : [];
  } catch {
    return [];
  }
}

export function saveInventory(items: InventoryItem[]): void {
  localStorage.setItem(INVENTORY_KEY, JSON.stringify(items));
}

export function addItem(itemId: string): InventoryItem[] {
  const items = loadInventory();
  const existing = items.find((i) => i.itemId === itemId);
  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({ itemId, quantity: 1 });
  }
  saveInventory(items);
  return items;
}

export function removeItem(itemId: string): InventoryItem[] {
  const items = loadInventory();
  const idx = items.findIndex((i) => i.itemId === itemId);
  if (idx === -1) return items;
  const item = items[idx];
  if (!item || item.quantity <= 1) {
    items.splice(idx, 1);
  } else {
    item.quantity -= 1;
  }
  saveInventory(items);
  return items;
}
