import { clamp } from "@/renderUtils";

/** Convert various rgba()/hex formats into a hex string the color input can use. */
export function rgbaToHexGuess(color: string) {
  if (!color) return "#ffffff";
  if (color.startsWith("#")) return color;
  const match = color.match(/rgba?\(([^)]+)\)/i);
  if (!match) return "#ffffff";
  const [r, g, b] = match[1].split(",").map((part) => parseFloat(part));
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}