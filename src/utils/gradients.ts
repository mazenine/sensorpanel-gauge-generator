import type { GradientStop } from "@/types";

export type GradientMode = "solid" | "gradient2" | "gradient3";

export function getDefaultStops(mode: GradientMode): GradientStop[] {
  if (mode === "gradient2") {
    return [
      { pos: 0, color: "#00ff00" },
      { pos: 1, color: "#ff0000" },
    ];
  }
  if (mode === "gradient3") {
    return [
      { pos: 0, color: "#00ff00" },
      { pos: 0.5, color: "#ffff00" },
      { pos: 1, color: "#ff0000" },
    ];
  }
  return [{ pos: 0, color: "#ffffff" }];
}