export interface InventoryItem {
  slot: number;
  type: string;
  amount: number;
  enchantments?: Enchantment[];
}

export interface Enchantment {
  name: string;
  level: number;
}

export interface PotionEffect {
  type: string;
  amplifier: number;
  duration: number;
}

export interface InventoryResponse {
  inventory: InventoryItem[];
  enderChest: InventoryItem[];
  potionEffects: PotionEffect[];
}
