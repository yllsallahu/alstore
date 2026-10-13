import {
  BookCheck,
  Boxes,
  FileText,
  House,
  type LucideIcon,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  ChartColumn,
  PackagePlus,
} from "lucide-react";

import type { ModuleSlug } from "@/lib/navigation";

export const HOME_ICON: LucideIcon = House;

export const MODULE_ICONS: Record<ModuleSlug, LucideIcon> = {
  "shitje-e-re": ShoppingCart,
  faturat: FileText,
  klientet: Users,
  "blerje-e-re": PackagePlus,
  furnitoret: Truck,
  stoku: Boxes,
  pagesat: Wallet,
  "atk-edi": BookCheck,
  shpenzimet: ReceiptText,
  raportet: ChartColumn,
  cilesimet: Settings,
};
