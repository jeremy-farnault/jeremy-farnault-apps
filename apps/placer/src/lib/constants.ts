import type { Icon } from "@phosphor-icons/react";
import {
  AirplaneIcon,
  BankIcon,
  CameraIcon,
  CarIcon,
  CoffeeIcon,
  FlagIcon,
  ForkKnifeIcon,
  HeartIcon,
  HouseIcon,
  IslandIcon,
  MapPinIcon,
  MountainsIcon,
  ShoppingBagIcon,
  StarIcon,
  TrainIcon,
  TreeIcon,
} from "@phosphor-icons/react";

export const PLACER_COLOR_PALETTE = [
  { label: "Yellow", value: "var(--yellow-400)" },
  { label: "Yellow Dark", value: "var(--yellow-600)" },
  { label: "Green", value: "var(--green-400)" },
  { label: "Green Dark", value: "var(--green-600)" },
  { label: "Red", value: "var(--red-400)" },
  { label: "Red Dark", value: "var(--red-600)" },
  { label: "Magenta", value: "var(--magenta-400)" },
  { label: "Purple", value: "var(--purple-400)" },
  { label: "Purple Dark", value: "var(--purple-600)" },
  { label: "Blue", value: "var(--blue-400)" },
  { label: "Teal", value: "var(--teal-400)" },
  { label: "Moss", value: "var(--moss-400)" },
  { label: "Grey", value: "var(--grey-400)" },
] as const;

export const CATEGORY_ICONS: Record<string, Icon> = {
  House: HouseIcon,
  Heart: HeartIcon,
  Star: StarIcon,
  MapPin: MapPinIcon,
  Airplane: AirplaneIcon,
  Car: CarIcon,
  Train: TrainIcon,
  Camera: CameraIcon,
  Coffee: CoffeeIcon,
  Utensils: ForkKnifeIcon,
  Mountain: MountainsIcon,
  Tree: TreeIcon,
  Beach: IslandIcon,
  Museum: BankIcon,
  ShoppingBag: ShoppingBagIcon,
  Flag: FlagIcon,
};

export const DEFAULT_CATEGORY_COLOR = "var(--grey-400)";
export const DEFAULT_CATEGORY_ICON = "MapPin";
