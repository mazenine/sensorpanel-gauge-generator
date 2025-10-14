// src/exportUtils.ts
// Handles PNG export with proper state handling for segmented and continuous modes.

import JSZip from "jszip";
import type { Preset } from "./types";
import {
  buildCanvas,
  clamp,
  pad,
  drawArcGauge,
  drawBarGauge,
  computeGaugeContentBounds,
} from "./renderUtils";

/**
 * Decide how many PNG frames to export based on preset mode.
 * - If segmented: number of segments + optional base frame
 * - If continuous: free number of states (10–101), defaults to 16
 */
export function effectiveExportStates(preset: Preset): number {
  const segmented = !!preset.main?.segmented;
  if (segmented) {
    const segs = preset.main?.segments ?? 0;
    const includeBase = preset.base?.enabled ? 1 : 0;
    return Math.max(1, segs + includeBase);
  }
  return clamp(preset.states ?? 16, 10, 101);
}

// Reuse offscreen canvas for performance
const offscreen =
  typeof document !== "undefined"
    ? document.createElement("canvas")
    : ({} as HTMLCanvasElement);

/**
 * Renders a single PNG state frame as a Blob.
 * @param valueIndex Index of this state
 * @param total Total number of states to render
 */
export async function renderStateBlob(
  preset: Preset,
  valueIndex: number,
  total: number
): Promise<Blob | null> {
  const { width, height } = preset.canvas;
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext("2d")!;

  // Build base canvas at full resolution
  buildCanvas(ctx, width, height);
  ctx.clearRect(0, 0, width, height);

  // Background (if not transparent)
  if (preset.canvas.background !== "transparent") {
    ctx.fillStyle = preset.canvas.background;
    ctx.fillRect(0, 0, width, height);
  }

  // --- Compute gauge size and scaling (same logic as LivePreviewCard)
  const { width: reqW, height: reqH } = computeGaugeContentBounds(preset);
  const safeW = reqW > 0 ? reqW : width;
  const safeH = reqH > 0 ? reqH : height;
  const s = Math.min(width / safeW, height / safeH, 1);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(s, s);

  // --- Compute progress
  const segmented = !!preset.main?.segmented;
  const v01 = segmented
    ? valueIndex / Math.max(1, preset.main?.segments || 1)
    : total === 1
    ? 1
    : valueIndex / (total - 1);

  // --- Draw gauge (scaled and centered)
  if (preset.mode === "bar") drawBarGauge(ctx, preset, v01);
  else drawArcGauge(ctx, preset, v01);

  ctx.restore();

  // --- Return PNG blob safely
  return await new Promise<Blob | null>((res) =>
    offscreen.toBlob(
      (b) => res(b ?? null),
      "image/png"
    )
  );
}



/**
 * Builds and returns a ZIP containing all PNG state frames.
 * Now matches LivePreviewCard scaling and centering.
 */
export async function exportZip(preset: Preset, namePrefix?: string) {
  console.log("[EXPORT DEBUG]", {
    segmented: preset.main?.segmented,
    segments: preset.main?.segments,
    states: preset.states,
  });

  const zip = new JSZip();
  const count = effectiveExportStates(preset);
  const zpad = count >= 100 ? 3 : 2;

  // --- Precompute geometry for consistent scaling
  const { width: reqW, height: reqH } = computeGaugeContentBounds(preset);
  const canvasW = preset.canvas.width;
  const canvasH = preset.canvas.height;
  const safeW = reqW > 0 ? reqW : canvasW;
  const safeH = reqH > 0 ? reqH : canvasH;
  const s = Math.min(canvasW / safeW, canvasH / safeH, 1);

  for (let i = 0; i < count; i++) {
    const { width, height } = preset.canvas;
    offscreen.width = width;
    offscreen.height = height;
    const ctx = offscreen.getContext("2d")!;

    buildCanvas(ctx, width, height);
    ctx.clearRect(0, 0, width, height);

    // Optional background
    if (preset.canvas.background !== "transparent") {
      ctx.fillStyle = preset.canvas.background;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(s, s);

    const segmented = !!preset.main?.segmented;
    const v01 = segmented
      ? i / Math.max(1, preset.main?.segments || 1)
      : count === 1
      ? 1
      : i / (count - 1);

    if (preset.mode === "bar") drawBarGauge(ctx, preset, v01);
    else drawArcGauge(ctx, preset, v01);

    ctx.restore();

    const blob = await new Promise<Blob | null>((res) =>
      offscreen.toBlob((b) => res(b ?? null), "image/png")
    );

    if (blob) {
      zip.file(
        `${namePrefix || preset.namePrefix || "gauge"}_${pad(i, zpad)}.png`,
        blob
      );
    }
  }

  return await zip.generateAsync({ type: "blob" });
}
