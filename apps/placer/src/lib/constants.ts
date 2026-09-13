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

export const DEFAULT_CATEGORY_COLOR = "var(--grey-200)";
export const DEFAULT_CATEGORY_ICON = "MapPin";
