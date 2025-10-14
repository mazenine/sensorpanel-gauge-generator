// src/renderUtils.ts
// Rendering utilities + gauge painters (arc + bar) with glow, warnings & segmentation

import type { Preset } from "./types";

// -----------------------------------------------------------------------------
// BASIC HELPERS
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export const pad = (n: number, width: number) => String(n).padStart(width, "0");
const dpr = () =>
  typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// -----------------------------------------------------------------------------
// CANVAS SETUP
export function buildCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  forPreview = false
) {
  if (forPreview) {
    ctx.imageSmoothingEnabled = true;
    try {
      // @ts-ignore
      ctx.imageSmoothingQuality = "high";
    } catch {}
    return;
  }

  const ratio = dpr();
  const w = Math.max(1, Math.floor(width * ratio));
  const h = Math.max(1, Math.floor(height * ratio));
  ctx.canvas.width = w;
  ctx.canvas.height = h;
  ctx.canvas.style.width = `${width}px`;
  ctx.canvas.style.height = `${height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.imageSmoothingEnabled = true;
  try {
    // @ts-ignore
    ctx.imageSmoothingQuality = "high";
  } catch {}
}

// -----------------------------------------------------------------------------
// COLOR HELPERS
function rgbaToParts(color: string) {
  if (!color) return { r: 0, g: 0, b: 0, a: 1 };
  if (color.startsWith("#")) {
    const c = color.slice(1);
    const hex =
      c.length === 3 ? c.split("").map((x) => x + x).join("") : c.padEnd(6, "0");
    const n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(",").map((s) => parseFloat(s));
    return { r: p[0] || 0, g: p[1] || 0, b: p[2] || 0, a: p[3] ?? 1 };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}
function withOpacity(color: string, mul: number) {
  const c = rgbaToParts(color);
  const a = clamp((c.a ?? 1) * mul, 0, 1);
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

// -----------------------------------------------------------------------------
// GEOMETRY
export function arcAnglesFromOpening(direction: string) {
  const dirDeg =
    ({ top: 270, right: 0, bottom: 90, left: 180 } as Record<string, number>)[
      direction
    ] ?? 90;
  const startDeg = dirDeg + 45;
  const sweepDeg = 270;
  return {
    startAngle: (startDeg * Math.PI) / 180,
    sweep: (sweepDeg * Math.PI) / 180,
  };
}
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = clamp(r, 0, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

// -----------------------------------------------------------------------------
// GRADIENTS
function makeCanvasLinear(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  stops: Array<{ pos: number; color: string }>
) {
  const g = ctx.createLinearGradient(
    rect.x,
    rect.y,
    rect.x + rect.w,
    rect.y + rect.h
  );
  stops.forEach((s) => g.addColorStop(clamp(s.pos, 0, 1), s.color));
  return g;
}
function mainPaint(ctx: CanvasRenderingContext2D, rect: any, main: any) {
  const stops =
    main?.fillMode === "solid"
      ? [
          { pos: 0, color: main?.colorSolid ?? "#00C2FF" },
          { pos: 1, color: main?.colorSolid ?? "#00C2FF" },
        ]
      : main?.gradient?.stops ?? [
          { pos: 0, color: "#00E0FF" },
          { pos: 1, color: "#FFD400" },
        ];
  return makeCanvasLinear(ctx, rect, stops);
}

// -----------------------------------------------------------------------------
// WARNINGS
function drawWarnings(ctx: CanvasRenderingContext2D, preset: any) {
  const { warnings, bar, arc, canvas } = preset;
  if (!warnings?.enabled || !warnings?.zones?.length) return;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";
  ctx.lineWidth = bar?.thickness ?? arc?.thickness ?? 24;

  const cw = canvas?.width ?? 512;
  const ch = canvas?.height ?? 512;
  const cx = cw / 2;
  const cy = ch / 2;
  ctx.translate(cx, cy);

  if (preset.mode === "arc") {
    const { startAngle = 135, endAngle = 405, radius = 180 } = arc ?? {};
    const thick = arc?.thickness ?? 24;
    ctx.lineWidth = thick;

    for (const z of warnings.zones) {
      const { start = 0, end = 0, color = "rgba(255,0,0,0.6)" } = z;
      const sAngle = degToRad(startAngle + (endAngle - startAngle) * (start / 100));
      const eAngle = degToRad(startAngle + (endAngle - startAngle) * (end / 100));
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, radius, sAngle, eAngle, false);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// GLOW SETTINGS
function readGlow(preset: any) {
  const g = preset?.glow ?? {};
  let mode: "soft" | "ring" | "legacy" =
    g.mode && (g.mode === "soft" || g.mode === "ring" || g.mode === "legacy")
      ? g.mode
      : "soft";

  const rawT = clamp(g.thickness ?? 1.25, 0, 20);
  const thicknessScale = 0.2 + Math.pow(rawT / 20, 0.9) * 8.8;

  const rawS = clamp(g.strength ?? 12, 0, 60);
  const strength = Math.round(Math.pow(rawS / 60, 1.1) * 60);

  return {
    enabled: !!g.enabled,
    mode,
    perSegment: !!g.perSegment,
    haloInner: !!g.haloInner,
    haloOuter: g.haloOuter !== false,
    haloThickness: thicknessScale,
    ringPasses: clamp(g.ringPasses ?? 3, 0, 12),
    ringThickness: thicknessScale,
    legacyOuterThickness: thicknessScale,
    strength,
  };
}

// -----------------------------------------------------------------------------
// LAYOUT HELPERS
function glowOuterLineWidth(glow: ReturnType<typeof readGlow>, baseLineWidth: number) {
  if (!glow.enabled || baseLineWidth <= 0) return 0;

  if (glow.mode === "soft") {
    if (!glow.haloOuter) return 0;
    const spread = baseLineWidth * (0.1 + glow.haloThickness * 0.45);
    return baseLineWidth + spread;
  }

  if (glow.mode === "ring") {
    if (glow.ringPasses <= 0) return 0;
    const spread = baseLineWidth * (0.05 + glow.ringThickness * 0.15);
    return baseLineWidth + spread;
  }

  const spread = baseLineWidth * (0.05 + glow.legacyOuterThickness * 0.25);
  return baseLineWidth + spread;
}

export function computeGaugeContentBounds(preset: Preset | any) {
  if (!preset) return { width: 0, height: 0 };

  const mode = preset.mode ?? "arc";
  const arc = preset.arc ?? {};
  const bar = preset.bar ?? {};
  const base = preset.base ?? {};
  const margin = (base as any).margin ?? 0;
  const paddingArc = 20;
  const paddingBar = 20;
  const glow = readGlow(preset);

  if (mode === "arc") {
    const radius = arc.radius ?? 200;
    const mainThick = arc.thickness ?? 24;
    const baseThick = base?.enabled ? mainThick * (base.thicknessScale ?? 1) : 0;
    const glowWidth = glowOuterLineWidth(glow, mainThick);
    const effectiveWidth = Math.max(mainThick, baseThick, glowWidth);
    const half = effectiveWidth / 2;
    const capAllowance = arc.roundCaps ? half : 0;
    const diameter = (radius + half + capAllowance) * 2;
    const total = diameter + margin * 2 + paddingArc * 2;
    return { width: total, height: total };
  }

  const len = bar.length ?? 420;
  const thick = bar.thickness ?? 24;
  const baseThick = base?.enabled ? thick * (base.thicknessScale ?? 1) : 0;
  const glowWidth = glowOuterLineWidth(glow, thick);
  const thicknessEnvelope = Math.max(thick, baseThick, glowWidth);
  const lengthEnvelope = len + (glowWidth > 0 ? glowWidth : 0);
  const orientation = bar.orientation ?? "horizontal";
  const width =
    orientation === "vertical"
      ? thicknessEnvelope + margin * 2 + paddingBar
      : lengthEnvelope + margin * 2 + paddingBar;
  const height =
    orientation === "vertical"
      ? lengthEnvelope + margin * 2 + paddingBar
      : thicknessEnvelope + margin * 2 + paddingBar;

  return { width, height };
}

// -----------------------------------------------------------------------------
// GLOW DRAWERS
function drawSoftHalo(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  baseLineWidth: number,
  paint: string | CanvasGradient,
  opts: { inner: boolean; outer: boolean; thickness: number; strength: number }
) {
  if ((!opts.inner && !opts.outer) || opts.thickness <= 0 || opts.strength <= 0) return;
  const baseAlpha = clamp(Math.pow(opts.strength / 50, 1.2), 0.02, 0.65);
  const passes = Math.max(4, Math.round(8 + opts.thickness * 2.5));
  const spread = baseLineWidth * (0.1 + opts.thickness * 0.45);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = paint as any;

  for (let i = 0; i < passes; i++) {
    const t = i / (passes - 1);
    ctx.globalAlpha = baseAlpha * (1 - t * 0.9);

    if (opts.outer) {
      ctx.lineWidth = baseLineWidth + spread * t;
      ctx.beginPath();
      path();
      ctx.stroke();
    }
    if (opts.inner) {
      ctx.lineWidth = baseLineWidth * Math.max(0.15, 1 - t * 0.9);
      ctx.beginPath();
      path();
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawRingGlow(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  baseLineWidth: number,
  paint: string | CanvasGradient,
  passes: number,
  ringThickness: number,
  strength: number
) {
  if (passes <= 0 || ringThickness <= 0 || strength <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = paint as any;

  const baseAlpha = clamp(Math.pow(strength / 55, 1.1), 0.05, 0.7);
  const spread = baseLineWidth * (0.05 + ringThickness * 0.15);

  for (let i = 0; i < passes; i++) {
    const t = i / Math.max(1, passes - 1);
    ctx.globalAlpha = baseAlpha * (1 - t * 0.5);
    ctx.lineWidth = baseLineWidth + spread * t;
    ctx.beginPath();
    path();
    ctx.stroke();
  }
  ctx.restore();
}

function drawLegacyDouble(
  ctx: CanvasRenderingContext2D,
  path: () => void,
  baseLineWidth: number,
  paint: string | CanvasGradient,
  outerThickness: number,
  strength: number
) {
  if (outerThickness <= 0 || strength <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = paint as any;

  const baseAlpha = clamp(Math.pow(strength / 60, 1.2), 0.08, 0.85);
  const spread = baseLineWidth * (0.05 + outerThickness * 0.25);

  ctx.globalAlpha = baseAlpha * 0.6;
  ctx.lineWidth = baseLineWidth + spread;
  ctx.beginPath();
  path();
  ctx.stroke();

  ctx.globalAlpha = baseAlpha * 0.3;
  ctx.lineWidth = baseLineWidth * 0.75;
  ctx.beginPath();
  path();
  ctx.stroke();

  ctx.restore();
}

// -----------------------------------------------------------------------------
// ARC GAUGE (centered + glow + segmentation; warning zones temporarily disabled)
export function drawArcGauge(
  ctx: CanvasRenderingContext2D,
  preset: any,
  value01: number
) {
  const { arc, base, main, openingDirection } = preset;
  const radius = arc?.radius ?? 200;
  const thick = arc?.thickness ?? 24;
  const round = !!arc?.roundCaps;
  const { startAngle, sweep } = arcAnglesFromOpening(openingDirection ?? "bottom");
  const progress = clamp(value01, 0, 1);
  const glow = readGlow(preset);

  ctx.save();
  ctx.lineCap = round ? "round" : "butt";

  // --- Center in pixel space -----------------------------------------------
  const dpr = window.devicePixelRatio || 1;
  const cw = ctx.canvas.width / dpr;
  const ch = ctx.canvas.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(cw / 2, ch / 2);

  const rect = { x: -radius, y: -radius, w: radius * 2, h: radius * 2 };
  const mainStyle = mainPaint(ctx, rect, main);

  // --- Base arc ------------------------------------------------------------
  if (base?.enabled) {
    ctx.strokeStyle = withOpacity(base.color ?? "#444", base.opacity ?? 0.5);
    ctx.lineWidth = thick * (base.thicknessScale ?? 1);
    ctx.beginPath();
    ctx.arc(0, 0, radius, startAngle, startAngle + sweep);
    ctx.stroke();
  }

  // --- WARNING ZONES DISABLED (safe for deployment) ------------------------

  // --- Main stroke (segmented or continuous) -------------------------------
  const isSeg = !!main?.segmented;
  const segCount = isSeg ? Math.max(1, main?.segments | 0) : 1;
  const gap = isSeg ? clamp(main?.segmentGap ?? 0, 0, thick * 2.5) : 0;
  const angGap = gap / radius;
  const segSweep = (sweep - (segCount - 1) * angGap) / segCount;
  const filled = progress * segCount;

  ctx.strokeStyle = mainStyle as any;
  ctx.lineWidth = thick;

  if (!isSeg) {
    // Continuous arc
    const endAngle = startAngle + sweep * progress;
    ctx.beginPath();
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.stroke();

    // Unified glow
    if (glow.enabled) {
      const path = () => ctx.arc(0, 0, radius, startAngle, endAngle);
      if (glow.mode === "soft") {
        drawSoftHalo(ctx, path, thick, mainStyle as any, {
          inner: glow.haloInner,
          outer: glow.haloOuter,
          thickness: glow.haloThickness,
          strength: glow.strength,
        });
      } else if (glow.mode === "ring") {
        drawRingGlow(ctx, path, thick, mainStyle as any,
          glow.ringPasses, glow.ringThickness, glow.strength);
      } else {
        drawLegacyDouble(ctx, path, thick, mainStyle as any,
          glow.legacyOuterThickness, glow.strength);
      }
    }

    ctx.restore();
    return;
  }

  // --- Segmented arcs ------------------------------------------------------
  for (let i = 0; i < segCount; i++) {
    const frac =
      i < Math.floor(filled)
        ? 1
        : i === Math.floor(filled)
        ? filled - Math.floor(filled)
        : 0;
    if (frac <= 0) continue;

    const segStart = startAngle + i * (segSweep + angGap);
    const segEnd = segStart + segSweep * frac;

    ctx.beginPath();
    ctx.arc(0, 0, radius, segStart, segEnd);
    ctx.stroke();

    // Per-segment glow
    if (glow.enabled && glow.perSegment && !round) {
      const path = () => ctx.arc(0, 0, radius, segStart, segEnd);
      if (glow.mode === "soft") {
        drawSoftHalo(ctx, path, thick, mainStyle as any, {
          inner: glow.haloInner,
          outer: glow.haloOuter,
          thickness: glow.haloThickness,
          strength: glow.strength,
        });
      } else if (glow.mode === "ring") {
        drawRingGlow(ctx, path, thick, mainStyle as any,
          glow.ringPasses, glow.ringThickness, glow.strength);
      } else {
        drawLegacyDouble(ctx, path, thick, mainStyle as any,
          glow.legacyOuterThickness, glow.strength);
      }
    }
  }

  // Unified fallback glow for all segments
  if (glow.enabled && (!glow.perSegment || round)) {
    const path = () => ctx.arc(0, 0, radius, startAngle, startAngle + sweep * progress);
    if (glow.mode === "soft") {
      drawSoftHalo(ctx, path, thick, mainStyle as any, {
        inner: glow.haloInner,
        outer: glow.haloOuter,
        thickness: glow.haloThickness,
        strength: glow.strength,
      });
    } else if (glow.mode === "ring") {
      drawRingGlow(ctx, path, thick, mainStyle as any,
        glow.ringPasses, glow.ringThickness, glow.strength);
    } else {
      drawLegacyDouble(ctx, path, thick, mainStyle as any,
        glow.legacyOuterThickness, glow.strength);
    }
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// BAR GAUGE (centered + glow + segmentation; warning zones temporarily disabled)
export function drawBarGauge(
  ctx: CanvasRenderingContext2D,
  preset: any,
  value01: number
) {
  const { bar, base, main } = preset;
  const horiz = (bar?.orientation ?? "horizontal") === "horizontal";
  const len = bar?.length ?? 420;
  const thick = bar?.thickness ?? 24;
  const r = clamp(bar?.squareEnds ? 0 : bar?.cornerRadius ?? 12, 0, thick / 2);
  const dir = bar?.direction ?? (horiz ? "ltr" : "ttb");
  const progress = clamp(value01, 0, 1);
  const glow = readGlow(preset);

  // --- Center drawing in pixel-space ---------------------------------------
  const dpr = window.devicePixelRatio || 1;
  const cw = ctx.canvas.width / dpr;
  const ch = ctx.canvas.height / dpr;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(cw / 2, ch / 2);

  const baseX = horiz ? -len / 2 : -thick / 2;
  const baseY = horiz ? -thick / 2 : -len / 2;

  const rectFull = { x: baseX, y: baseY, w: horiz ? len : thick, h: horiz ? thick : len };
  const mainStyle = mainPaint(ctx, rectFull, main);

  // --- Base background -----------------------------------------------------
  if (base?.enabled) {
    ctx.fillStyle = withOpacity(base.color ?? "#333", base.opacity ?? 0.4);
    if (horiz) roundRect(ctx, baseX, baseY, len, thick, r);
    else roundRect(ctx, baseX, baseY, thick, len, r);
    ctx.fill();
  }

  // --- WARNING ZONES DISABLED (safe for deployment) ------------------------
  // Intentionally skipped until next refinement phase

  // --- Main fill (segmented or continuous) ---------------------------------
  const isSeg = !!main?.segmented;
  const segCount = isSeg ? Math.max(1, main?.segments | 0) : 1;
  const gap = isSeg ? clamp(main?.segmentGap ?? 0, 0, thick * 2.5) : 0;
  const segLen = isSeg ? (len - (segCount - 1) * gap) / segCount : len;
  const filled = progress * segCount;

  ctx.fillStyle = mainStyle as any;

  if (!isSeg) {
    // Continuous fill
    const filledLen = len * progress;
    const x = horiz
      ? dir === "rtl" ? baseX + (len - filledLen) : baseX
      : baseX;
    const y = horiz
      ? baseY
      : dir === "btt" ? baseY + (len - filledLen) : baseY;

    roundRect(ctx, x, y, horiz ? filledLen : thick, horiz ? thick : filledLen, r);
    ctx.fill();
  } else {
    // Segmented fill
    for (let i = 0; i < segCount; i++) {
      const frac =
        i < Math.floor(filled)
          ? 1
          : i === Math.floor(filled)
          ? filled - Math.floor(filled)
          : 0;
      if (frac <= 0) continue;

      const off = i * (segLen + gap);
      const lenNow = segLen * frac;

      const x = horiz
        ? dir === "rtl" ? baseX + (len - (off + lenNow)) : baseX + off
        : baseX;
      const y = horiz
        ? baseY
        : dir === "btt" ? baseY + (len - (off + lenNow)) : baseY + off;

      roundRect(ctx, x, y, horiz ? lenNow : thick, horiz ? thick : lenNow, r);
      ctx.fill();
    }
  }

  // --- Glow (after main fill) ---------------------------------------------
  if (glow.enabled) {
    if (isSeg && glow.perSegment) {
      // Per-segment glow
      for (let i = 0; i < segCount; i++) {
        const frac =
          i < Math.floor(filled)
            ? 1
            : i === Math.floor(filled)
            ? filled - Math.floor(filled)
            : 0;
        if (frac <= 0) continue;

        const off = i * (segLen + gap);
        const lenNow = segLen * frac;

        const x = horiz
          ? dir === "rtl" ? baseX + (len - (off + lenNow)) : baseX + off
          : baseX;
        const y = horiz
          ? baseY
          : dir === "btt" ? baseY + (len - (off + lenNow)) : baseY + off;

        const path = () =>
          roundRect(ctx, x, y, horiz ? lenNow : thick, horiz ? thick : lenNow, r);

        if (glow.mode === "soft") {
          drawSoftHalo(ctx, path, thick, mainStyle as any, {
            inner: glow.haloInner,
            outer: glow.haloOuter,
            thickness: glow.haloThickness,
            strength: glow.strength,
          });
        } else if (glow.mode === "ring") {
          drawRingGlow(ctx, path, thick, mainStyle as any,
            glow.ringPasses, glow.ringThickness, glow.strength);
        } else {
          drawLegacyDouble(ctx, path, thick, mainStyle as any,
            glow.legacyOuterThickness, glow.strength);
        }
      }
    } else {
      // Unified glow
      const filledLen = len * progress;
      const x = horiz
        ? dir === "rtl" ? baseX + (len - filledLen) : baseX
        : baseX;
      const y = horiz
        ? baseY
        : dir === "btt" ? baseY + (len - filledLen) : baseY;

      const path = () =>
        roundRect(ctx, x, y, horiz ? filledLen : thick, horiz ? thick : filledLen, r);

      if (glow.mode === "soft") {
        drawSoftHalo(ctx, path, thick, mainStyle as any, {
          inner: glow.haloInner,
          outer: glow.haloOuter,
          thickness: glow.haloThickness,
          strength: glow.strength,
        });
      } else if (glow.mode === "ring") {
        drawRingGlow(ctx, path, thick, mainStyle as any,
          glow.ringPasses, glow.ringThickness, glow.strength);
      } else {
        drawLegacyDouble(ctx, path, thick, mainStyle as any,
          glow.legacyOuterThickness, glow.strength);
      }
    }
  }

  ctx.restore();
}
