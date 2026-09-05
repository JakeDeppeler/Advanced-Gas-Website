import type { VehicleStatus } from "@/lib/portal/db";

/** The three road states, in the order they read on a picker. */
export const STATUS_OPTS: { k: VehicleStatus; label: string }[] = [
  { k: "on", label: "On the road" },
  { k: "repair", label: "Getting fixed" },
  { k: "off", label: "Off the road" },
];

export const STATUS_LABEL: Record<VehicleStatus, string> = {
  on: "On the road",
  repair: "Getting fixed",
  off: "Off the road",
};

/** The explanation that follows the bold status on a vehicle's page. */
export const STATUS_NOTE: Record<VehicleStatus, string> = {
  on: "",
  repair: "It still counts as part of the fleet — it just isn't available for work right now.",
  off: "It stays in the fleet and keeps its history, it just isn't counted as working.",
};

/** Bought new, or bought second hand. */
export const CONDITION_OPTS: { k: "new" | "used"; label: string }[] = [
  { k: "new", label: "New" },
  { k: "used", label: "Used" },
];

export const CONDITION_LABEL: Record<"new" | "used", string> = {
  new: "New when we got it",
  used: "Used when we got it",
};
