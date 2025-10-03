import React, { useEffect, useMemo, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, RefreshCw, Sun, Moon, Monitor } from "lucide-react";
import JSZip from "jszip";

/* =========================================================
   Types & helpers
   ========================================================= */
type Theme = "light" | "dark" | "system";
type Opening = "bottom" | "left" | "top" | "right";
type Orientation = "horizontal" | "vertical";
type Direction = "ltr" | "rtl" | "ttb" | "btt";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const dpr = () => (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
const pad = (n: number, width: number) => String(n).padStart(width, "0");

function parseRGBA(c: string) {
  if (!c) return { r: 0, g: 0, b: 0, a: 1 };
  if (c.startsWith("#")) {
    const s = c.replace("#", "");
    const full = s.length === 3 ? s.split("").map(x => x + x).join("") : s;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const m = c.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1].split(",").map(s => parseFloat(s));
    return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts[3] ?? 1 };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}
function rgbaToString({ r, g, b, a }: { r: number; g: number; b: number; a: number }) {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${clamp(a, 0, 1)})`;
}
function withOpacity(color: string, mult: number) {
  const c = parseRGBA(color);
  return rgbaToString({ ...c, a: clamp(c.a * mult, 0, 1) });
}
function rgbaToHexGuess(c: string){
  if(c?.startsWith("#")) return c;
  const m = c?.match(/rgba?\(([^)]+)\)/i);
  if(!m) return "#ffffff";
  const [r,g,b] = m[1].split(",").map(s=>parseFloat(s));
  const toHex = (n:number)=> clamp(Math.round(n),0,255).toString(16).padStart(2,"0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;  // NOTE: corrected below in UI if needed
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function mixColor(c1: string, c2: string, t: number) {
  const a = parseRGBA(c1), b = parseRGBA(c2);
  return rgbaToString({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t), a: lerp(a.a, b.a, t) });
}
function sampleGradient(stops: { pos: number; color: string }[], t: number) {
  const s = [...stops].sort((x, y) => x.pos - y.pos);
  const x = clamp(t, 0, 1);
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i], b = s[i + 1];
    if (x >= a.pos && x <= b.pos) {
      const tt = (x - a.pos) / Math.max(1e-6, b.pos - a.pos);
      return mixColor(a.color, b.color, tt);
    }
  }
  return s[x <= s[0].pos ? 0 : s.length - 1].color;
}

function buildCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const ratio = dpr();
  ctx.canvas.width = Math.max(1, Math.floor(width * ratio));
  ctx.canvas.height = Math.max(1, Math.floor(height * ratio));
  ctx.canvas.style.width = width + "px";
  ctx.canvas.style.height = height + "px";
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
}

function makeCanvasGradient(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  stops: { pos: number; color: string }[]
) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  const ss = [...stops].sort((a, b) => a.pos - b.pos);
  ss.forEach((s) => g.addColorStop(clamp(s.pos, 0, 1), s.color));
  return g as CanvasGradient;
}

// Minimal browser downloader (no external deps)
async function downloadBlob(blob: Blob, filename: string){
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 1000);
}

/* =========================================================
   Preset + local storage
   ========================================================= */
const defaultPreset = {
  theme: "system" as Theme,
  mode: "arc" as "arc" | "bar",
  openingDirection: "bottom" as Opening,
  states: 16,
  canvas: { width: 512, height: 512, background: "transparent" },
  arc: { radius: 200, thickness: 24, roundCaps: true },
  bar: {
    orientation: "horizontal" as Orientation,
    direction: "ltr" as Direction,
    length: 420,
    thickness: 24,
    cornerRadius: 12,
    squareEnds: false
  },
  base: { enabled: true, color: "rgba(50,50,50,1)", opacity: 0.6, preset: "dark", sameGeometryAsMain: true, thicknessScale: 1 },
  main: {
    fillMode: "gradient3" as "solid" | "gradient2" | "gradient3",
    colorSolid: "#00C2FF",
    gradient: {
      stops: [
        { pos: 0, color: "#00E0FF" },
        { pos: 0.5, color: "#00FF88" },
        { pos: 1, color: "#FFD400" },
      ],
    },
    segmented: false,
    segments: 16,
    segmentGap: 2,
    segmentMiniGradient: false,
    frame: { enabled: false, color: "rgba(255,255,255,0.9)", thickness: 1.35 },
  },
  warnings: {
    start: {
      enabled: false, lengthPct: 0.15, mode: "solid",
      colorSolid: "#00E0FF",
      gradient: { stops: [ { pos: 0, color: "#00E0FF" }, { pos: 1, color: "#00B2FF" } ] },
    },
    end: {
      enabled: true, lengthPct: 0.2, mode: "solid",
      colorSolid: "#FF3B30",
      gradient: { stops: [ { pos: 0, color: "#FFA500" }, { pos: 1, color: "#FF3B30" } ] },
    },
  },
  glow: { enabled: true, mode: "halo" as "halo" | "ring", strength: 18, thickness: 1.25, ringPasses: 2 },
  usability: { showGrid: false },
  namePrefix: "gauge",
  presetName: "Default 270°",
};

function useLocalPreset(key: string, initial: any) {
  const [val, setVal] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
    return initial;
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal] as const;
}

/* =========================================================
   Geometry + effects
   ========================================================= */
function drawGlowHalo(ctx: CanvasRenderingContext2D, pathFn: () => void, width: number, paint: string | CanvasGradient, strength: number) {
  // A soft halo behind the stroke using shadowBlur; matches main stroke color
  const color = typeof paint === "string" ? paint : "rgba(255,255,255,0.85)";
  const blur = Math.max(width * 0.75, clamp(strength * 1.4, 4, 100));
  ctx.save();
  ctx.lineWidth = width;
  ctx.strokeStyle = "rgba(0,0,0,0)";
  ctx.shadowBlur = blur;
  ctx.shadowColor = color;
  ctx.globalCompositeOperation = "destination-over";
  ctx.beginPath(); pathFn(); ctx.stroke();
  ctx.restore();
}
function drawGlowRings(ctx: CanvasRenderingContext2D, pathFn: () => void, width: number, paint: string | CanvasGradient, strength: number, passes = 2) {
  // Optional ring glow (kept as a style experiment)
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = paint as any;
  const alpha = clamp(strength / 40, 0, 0.9);
  for (let i = passes; i >= 1; i--) {
    ctx.globalAlpha = alpha * (i / passes);
    ctx.lineWidth = width * (1 + i * 0.6);
    ctx.beginPath(); pathFn(); ctx.stroke();
  }
  ctx.restore();
}
function arcAnglesFromOpening(direction: Opening) {
  // Opening direction is the CENTER of the 90° gap
  const dirDeg = { right: 0, top: 90, left: 180, bottom: 270 }[direction] ?? 270;
  const startDeg = dirDeg + 45;
  const sweepDeg = 270;
  return { startAngle: (startDeg * Math.PI) / 180, sweep: (sweepDeg * Math.PI) / 180 };
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

/* =========================================================
   Renderers
   ========================================================= */
function drawArcGauge(ctx: CanvasRenderingContext2D, preset: any, value01: number) {
  const { canvas, arc, base, main, warnings, glow, openingDirection } = preset;
  const { startAngle, sweep } = arcAnglesFromOpening(openingDirection);
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const radius = arc.radius, thick = arc.thickness;
  ctx.lineCap = arc.roundCaps ? "round" : "butt";

  const progress = clamp(value01, 0, 1);
  const endAngle = startAngle + sweep * progress;

  const rect = { x: cx - radius, y: cy - radius, w: radius * 2, h: radius * 2 };
  const fullMainStops =
    main.fillMode === "solid" ? [{ pos: 0, color: main.colorSolid }, { pos: 1, color: main.colorSolid }] : main.gradient.stops;
  const fullMainPaint = makeCanvasGradient(ctx, rect, fullMainStops);

  // Base
  if (base.enabled) {
    const pathBase = () => ctx.arc(cx, cy, radius, startAngle, startAngle + sweep);
    ctx.strokeStyle = withOpacity(base.color, base.opacity);
    ctx.lineWidth = base.sameGeometryAsMain ? thick * (base.thicknessScale || 1) : thick;
    ctx.beginPath(); pathBase(); ctx.stroke();
  }

  const strokeWithEffects = (pathFn: () => void, paint: string | CanvasGradient) => {
    ctx.strokeStyle = paint as any;
    ctx.lineWidth = thick;
    ctx.beginPath(); pathFn(); ctx.stroke();

    if (main.frame?.enabled) {
      ctx.strokeStyle = main.frame.color;
      ctx.lineWidth = thick * (main.frame.thickness || 1.25);
      ctx.beginPath(); pathFn(); ctx.stroke();
    }
    if (glow.enabled) {
      // Halo matches stroke color; draw behind
      if (glow.mode === "halo") drawGlowHalo(ctx, pathFn, thick, paint, glow.strength);
      else drawGlowRings(ctx, pathFn, thick, paint, glow.strength, glow.ringPasses ?? 2);
    }
  };

  // Continuous
  if (!main.segmented) {
    const pathMain = () => ctx.arc(cx, cy, radius, startAngle, endAngle);
    strokeWithEffects(pathMain, fullMainPaint);

    // Start warning overlay
    if (warnings.start.enabled && progress <= (warnings.start.lengthPct || 0)) {
      const wStops = warnings.start.mode === "solid" ? [{ pos: 0, color: warnings.start.colorSolid }, { pos: 1, color: warnings.start.colorSolid }] : warnings.start.gradient.stops;
      const wPaint = makeCanvasGradient(ctx, rect, wStops);
      strokeWithEffects(pathMain, wPaint);
    }
    // End warning overlay
    if (warnings.end.enabled && progress >= 1 - (warnings.end.lengthPct || 0)) {
      const zoneStart = startAngle + sweep * (1 - (warnings.end.lengthPct || 0));
      const from = Math.max(zoneStart, startAngle), to = endAngle;
      if (to > from) {
        const wStops = warnings.end.mode === "solid" ? [{ pos: 0, color: warnings.end.colorSolid }, { pos: 1, color: warnings.end.colorSolid }] : warnings.end.gradient.stops;
        const wPaint = makeCanvasGradient(ctx, rect, wStops);
        const pathWarn = () => ctx.arc(cx, cy, radius, from, to);
        strokeWithEffects(pathWarn, wPaint);
      }
    }
    return;
  }

  // Segmented
  const N = Math.max(1, main.segments | 0);
  const gapPx = clamp(main.segmentGap, 0, thick * 0.8);
  const gapAngle = gapPx / radius;
  const segSweep = (sweep - (N - 1) * gapAngle) / N;
  const visible = Math.floor(progress * N);

  for (let i = 0; i < N; i++) {
    if (i >= visible) break;
    const segStart = startAngle + i * (segSweep + gapAngle);
    const segEnd = segStart + segSweep;

    // Color from full gradient
    const tMid = (i + 0.5) / N;
    const paint = sampleGradient(fullMainStops, tMid);

    const path = () => ctx.arc(cx, cy, radius, segStart, segEnd);
    strokeWithEffects(path, paint);
  }
}

function drawBarGauge(ctx: CanvasRenderingContext2D, preset: any, value01: number) {
  const { canvas, bar, base, main, warnings, glow } = preset;
  const centerX = canvas.width / 2, centerY = canvas.height / 2;
  const len = bar.length, thick = bar.thickness;
  const horiz = bar.orientation === "horizontal";
  const dir = bar.direction;
  const r = clamp(bar.squareEnds ? 0 : bar.cornerRadius, 0, thick / 2);

  const x0 = centerX - (horiz ? len / 2 : thick / 2);
  const y0 = centerY - (horiz ? thick / 2 : len / 2);
  const w = horiz ? len : thick;
  const h = horiz ? thick : len;

  // Base track
  if (base.enabled) {
    const strokeColor = withOpacity(base.color, base.opacity);
    if (base.sameGeometryAsMain) {
      const minor = horiz ? h : w;
      const scaledMinor = minor * (base.thicknessScale || 1);
      const delta = scaledMinor - minor;
      const nx0 = horiz ? x0 : x0 - delta / 2;
      const ny0 = horiz ? y0 - delta / 2 : y0;
      const nw = horiz ? w : scaledMinor;
      const nh = horiz ? scaledMinor : h;
      ctx.save(); ctx.fillStyle = strokeColor; roundRect(ctx, nx0, ny0, nw, nh, r); ctx.fill(); ctx.restore();
    } else {
      ctx.save(); ctx.strokeStyle = strokeColor; ctx.lineWidth = h; roundRect(ctx, x0, y0, w, h, r); ctx.stroke(); ctx.restore();
    }
  }

  const progress = clamp(value01, 0, 1);
  const fullMainStops =
    main.fillMode === "solid" ? [{ pos: 0, color: main.colorSolid }, { pos: 1, color: main.colorSolid }] : main.gradient.stops;
  const fullPaint = makeCanvasGradient(ctx, { x: x0, y: y0, w, h }, fullMainStops);

  const strokeRect = (rect: { x: number; y: number; w: number; h: number }, paint: string | CanvasGradient) => {
    const path = () => roundRect(ctx, rect.x, rect.y, rect.w, rect.h, r);
    ctx.save(); ctx.fillStyle = paint as any; path(); ctx.fill();
    if (main.frame?.enabled) { ctx.strokeStyle = main.frame.color; ctx.lineWidth = thick * (main.frame.thickness || 1.25); path(); ctx.stroke(); }
    if (glow.enabled) {
      // halo behind fill
      if (glow.mode === "halo") drawGlowHalo(ctx, path, thick, paint, glow.strength);
      else drawGlowRings(ctx, path, thick, paint, glow.strength, glow.ringPasses ?? 2);
    }
    ctx.restore();
  };

  function placeRect(offset: number, length: number) {
    if (horiz) {
      if (dir === "rtl") return { x: x0 + w - (offset + length), y: y0, w: length, h };
      return { x: x0 + offset, y: y0, w: length, h };
    } else {
      if (dir === "btt") return { x: x0, y: y0 + h - (offset + length), w, h: length };
      return { x: x0, y: y0 + offset, w, h: length };
    }
  }

  // Continuous
  if (!main.segmented) {
    const axisLen = horiz ? w : h;
    const filled = axisLen * progress;
    const rect = placeRect(0, filled);
    strokeRect(rect, fullPaint);

    const startZonePx = warnings.start.enabled ? axisLen * clamp(warnings.start.lengthPct, 0, 0.5) : 0;
    const endZonePx = warnings.end.enabled ? axisLen * clamp(warnings.end.lengthPct, 0, 0.5) : 0;

    if (warnings.start.enabled && progress <= (warnings.start.lengthPct || 0)) {
      const wl = Math.min(filled, startZonePx);
      if (wl > 0) {
        const r2 = placeRect(0, wl);
        const stops = warnings.start.mode === "solid" ? [{ pos: 0, color: warnings.start.colorSolid }, { pos: 1, color: warnings.start.colorSolid }] : warnings.start.gradient.stops;
        strokeRect(r2, makeCanvasGradient(ctx, { x: x0, y: y0, w, h }, stops));
      }
    }
    if (warnings.end.enabled && progress >= 1 - (warnings.end.lengthPct || 0)) {
      const zoneStart = axisLen - endZonePx;
      const overlap = Math.max(0, filled - zoneStart);
      if (overlap > 0) {
        const r3 = placeRect(zoneStart, overlap);
        const stops = warnings.end.mode === "solid" ? [{ pos: 0, color: warnings.end.colorSolid }, { pos: 1, color: warnings.end.colorSolid }] : warnings.end.gradient.stops;
        strokeRect(r3, makeCanvasGradient(ctx, { x: x0, y: y0, w, h }, stops));
      }
    }
    return;
  }

  // Segmented (blocky)
  const N = Math.max(1, main.segments | 0);
  const gap = clamp(main.segmentGap, 0, thick * 0.8);
  const axisLen = horiz ? w : h;
  const segLen = (axisLen - (N - 1) * gap) / N;
  const visible = Math.floor(progress * N);

  for (let i = 0; i < N; i++) {
    if (i >= visible) break;
    const offset = i * (segLen + gap);
    const rect = placeRect(offset, segLen);

    const tMid = (i + 0.5) / N;
    const paint = sampleGradient(fullMainStops, tMid);

    strokeRect(rect, paint);
  }
}

/* =========================================================
   Export helpers
   ========================================================= */
function effectiveExportStates(preset: any) {
  if (preset.main.segmented) {
    const baseAdd = preset.base.enabled ? 1 : 0;
    return Math.max(1, (preset.main.segments | 0) + baseAdd);
  }
  return clamp(preset.states | 0, 2, 101);
}

async function renderStateBlob(preset: any, vIndex: number, totalStates: number, outW?: number, outH?: number){
  const cloned = JSON.parse(JSON.stringify(preset));
  if (outW && outH) {
    cloned.canvas.width = outW;
    cloned.canvas.height = outH;
  }
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  buildCanvas(ctx, cloned.canvas.width, cloned.canvas.height);
  ctx.clearRect(0,0,cloned.canvas.width,cloned.canvas.height);
  if (cloned.canvas.background !== "transparent") {
    ctx.fillStyle = cloned.canvas.background;
    ctx.fillRect(0, 0, cloned.canvas.width, cloned.canvas.height);
  }
  const v01 = cloned.main.segmented
    ? vIndex / Math.max(1, cloned.main.segments)
    : vIndex / Math.max(1, totalStates - 1);
  if (cloned.mode === "arc") drawArcGauge(ctx, cloned, v01); else drawBarGauge(ctx, cloned, v01);
  return await new Promise<Blob | null>(res => c.toBlob((b)=>res(b), "image/png"));
}

async function exportZip(preset: any, outW?: number, outH?: number){
  const zip = new JSZip();
  const count = effectiveExportStates(preset);
  const zeroPadWidth = count >= 100 ? 3 : 2;
  for(let i=0;i<count;i++){
    const nm = `${preset.namePrefix}_${pad(i, zeroPadWidth)}.png`;
    const blob = await renderStateBlob(preset, i, count, outW, outH);
    if (blob) zip.file(nm, blob);
  }
  return await zip.generateAsync({ type: "blob" });
}

/* =========================================================
   App
   ========================================================= */
export default function App(){
  const [preset, setPreset] = useLocalPreset("aida64-gauge-preset", defaultPreset);
  const [theme, setTheme] = useState<Theme>(preset.theme);
  const [currentState, setCurrentState] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportW, setExportW] = useState<number>(preset.canvas.width);
  const [exportH, setExportH] = useState<number>(preset.canvas.height);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Keep export size in sync with preset unless user changes it
  useEffect(()=>{
    setExportW(preset.canvas.width);
    setExportH(preset.canvas.height);
  }, [preset.canvas.width, preset.canvas.height]);

  // Theme
  useEffect(()=>{
    const root = document.documentElement;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effective = theme==='system' ? (prefersDark?'dark':'light') : theme;
    root.classList.toggle('dark', effective==='dark');
  },[theme]);

  // Render preview (with padding + theme background for preview card)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const thick = preset.mode === "arc" ? preset.arc.thickness : preset.bar.thickness;
    const frameW = preset.main.frame?.enabled ? thick * (preset.main.frame.thickness || 1.25) : 0;
    const baseW = preset.base.enabled && preset.base.sameGeometryAsMain ? thick * (preset.base.thicknessScale || 1) : thick;
    const maxStrokeHalf = Math.max(thick, frameW, baseW) / 2;
    const glowPadding = preset.glow.enabled ? Math.max(8, preset.glow.strength * 1.5) : 0;
    const padding = Math.ceil(maxStrokeHalf + glowPadding + 6);

    const drawW = preset.canvas.width + padding * 2;
    const drawH = preset.canvas.height + padding * 2;

    buildCanvas(ctx, drawW, drawH);
    ctx.clearRect(0, 0, drawW, drawH);

    // Card background that matches theme (kept dark in dark mode)
    const rootIsDark = document.documentElement.classList.contains("dark");
    const previewBg = rootIsDark ? "#0b1220" : "#f8fafc";
    ctx.fillStyle = previewBg;
    ctx.fillRect(0, 0, drawW, drawH);

    // Optional inner canvas background (for exported look)
    if (preset.canvas.background !== "transparent") {
      ctx.save();
      ctx.translate(padding, padding);
      ctx.fillStyle = preset.canvas.background;
      ctx.fillRect(0, 0, preset.canvas.width, preset.canvas.height);
      ctx.restore();
    }

    // translate so drawing is centered with padding
    ctx.save();
    ctx.translate(padding, padding);

    const total = effectiveExportStates(preset);
    const v01 = preset.main.segmented
      ? currentState / Math.max(1, preset.main.segments)
      : currentState / Math.max(1, total - 1);

    if (preset.mode === "arc") drawArcGauge(ctx, preset, v01);
    else drawBarGauge(ctx, preset, v01);

    ctx.restore();

    canvas.style.width = `${drawW}px`;
    canvas.style.height = `${drawH}px`;
  }, [preset, currentState]);

  // updater
  const update = (path: string, value: any) => {
    setPreset((prev: any) => {
      const copy: any = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let obj = copy;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
      return copy;
    });
  };

  const effectiveStates = useMemo(() => effectiveExportStates(preset), [preset]);
  const zeroPadWidth = effectiveStates >= 100 ? 3 : 2;

  // Gradient editor with pickers + numeric inputs
  function GradientEditorSimple({
    title,
    maxStops,
    value,
    onChange,
  }: {
    title: string;
    maxStops: number;
    value: { stops: { pos: number; color: string }[] };
    onChange: (v: { stops: { pos: number; color: string }[] }) => void;
  }) {
    const stops = [...value.stops].sort((a, b) => a.pos - b.pos);

    const setStop = (i: number, patch: Partial<{ pos: number; color: string }>) => {
      const ns = stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
      onChange({ stops: ns.sort((a, b) => a.pos - b.pos) });
    };
    const addStop = () => {
      if (stops.length >= maxStops) return;
      const pos = clamp(0.5, 0, 1);
      const color = sampleGradient(stops, pos);
      onChange({ stops: [...stops, { pos, color }].sort((a, b) => a.pos - b.pos) });
    };
    const removeStop = (i: number) => {
      if (stops.length <= 2) return;
      onChange({ stops: stops.filter((_, idx) => idx !== i) });
    };

    return (
      <Card className="mt-2">
        <CardHeader className="py-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {stops.map((st, i) => (
            <div key={i} className="grid grid-cols-7 items-center gap-2">
              <Label className="col-span-2">Stop {i + 1}</Label>
              <Input
                type="color"
                className="w-12 h-9 p-1"
                value={st.color.startsWith("#") ? st.color : "#ffffff"}
                onChange={(e) => setStop(i, { color: e.target.value })}
              />
              <Input
                className="col-span-2"
                value={st.color}
                onChange={(e) => setStop(i, { color: e.target.value })}
              />
              <div className="col-span-2">
                <Slider
                  value={[Math.round(st.pos * 100)]}
                  onValueChange={(v) => setStop(i, { pos: clamp(v[0] / 100, 0, 1) })}
                  max={100}
                  step={1}
                />
              </div>
              <Button variant="secondary" onClick={() => removeStop(i)} disabled={stops.length <= 2}>Remove</Button>
            </div>
          ))}
          <Button onClick={addStop} variant="outline" disabled={stops.length >= maxStops}>Add stop</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-[1600px] grid grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)] gap-0">
        {/* LEFT – Scrollable editor with sticky title */}
        <aside className="h-screen overflow-y-auto bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-r border-gray-200/40 dark:border-gray-800/60">
          <div className="sticky top-0 z-10 px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200/40 dark:border-gray-800/60">
            <h1 className="text-lg font-semibold">AIDA64 Gauge Generator</h1>
          </div>

          <div className="p-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Layout</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="w-28">Theme</Label>
                  <Select value={theme} onValueChange={(v: Theme)=>{ setTheme(v); update('theme', v); }}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="w-4 h-4"/>Light</div></SelectItem>
                      <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="w-4 h-4"/>Dark</div></SelectItem>
                      <SelectItem value="system"><div className="flex items-center gap-2"><Monitor className="w-4 h-4"/>System</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-28">Mode</Label>
                  <Select value={preset.mode} onValueChange={(v:any)=>update('mode', v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arc">270° Circular</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {preset.mode === "arc" ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Opening</Label>
                      <Select value={preset.openingDirection} onValueChange={(v:any)=>update("openingDirection", v)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom">Bottom</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Radius</Label>
                      <Slider max={400} min={20} step={1} value={[preset.arc.radius]} onValueChange={(v)=>update("arc.radius", v[0])}/>
                      <Input className="w-20" type="number" value={preset.arc.radius} onChange={(e)=>update("arc.radius", parseInt(e.target.value||"0"))}/>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Thickness</Label>
                      <Slider max={120} min={4} step={1} value={[preset.arc.thickness]} onValueChange={(v)=>update("arc.thickness", v[0])}/>
                      <Input className="w-20" type="number" value={preset.arc.thickness} onChange={(e)=>update("arc.thickness", parseInt(e.target.value||"0"))}/>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Round caps</Label>
                      <Switch checked={preset.arc.roundCaps} onCheckedChange={(v)=>update("arc.roundCaps", v)}/>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Orientation</Label>
                      <Select value={preset.bar.orientation} onValueChange={(v:any)=>update("bar.orientation", v)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="horizontal">Horizontal</SelectItem>
                          <SelectItem value="vertical">Vertical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Direction</Label>
                      <Select value={preset.bar.direction} onValueChange={(v:any)=>update("bar.direction", v)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ltr">Left → Right</SelectItem>
                          <SelectItem value="rtl">Right → Left</SelectItem>
                          <SelectItem value="ttb">Top → Bottom</SelectItem>
                          <SelectItem value="btt">Bottom → Top</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Length</Label>
                      <Slider max={800} min={50} step={1} value={[preset.bar.length]} onValueChange={(v)=>update("bar.length", v[0])}/>
                      <Input className="w-24" type="number" value={preset.bar.length} onChange={(e)=>update("bar.length", parseInt(e.target.value||"0"))}/>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Thickness</Label>
                      <Slider max={160} min={4} step={1} value={[preset.bar.thickness]} onValueChange={(v)=>update("bar.thickness", v[0])}/>
                      <Input className="w-24" type="number" value={preset.bar.thickness} onChange={(e)=>update("bar.thickness", parseInt(e.target.value||"0"))}/>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Corner radius</Label>
                      <Slider max={80} min={0} step={1} value={[preset.bar.cornerRadius]} onValueChange={(v)=>update("bar.cornerRadius", v[0])}/>
                      <Input className="w-24" type="number" value={preset.bar.cornerRadius} onChange={(e)=>update("bar.cornerRadius", parseInt(e.target.value||"0"))}/>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Square ends</Label>
                      <Switch checked={preset.bar.squareEnds} onCheckedChange={(v)=>update("bar.squareEnds", v)}/>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Base Stroke</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="w-28">Enabled</Label>
                  <Switch checked={preset.base.enabled} onCheckedChange={(v)=>update("base.enabled", v)}/>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-28">Color</Label>
                  <Input type="color" className="w-12 h-9 p-1" value={preset.base.color.startsWith("#") ? preset.base.color : "#323232"} onChange={(e)=>update("base.color", e.target.value)} />
                  <Input className="flex-1" value={preset.base.color} onChange={(e)=>update("base.color", e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="w-28">Opacity</Label>
                  <Slider max={100} min={0} step={1} value={[Math.round((preset.base.opacity||1)*100)]} onValueChange={(v)=>update("base.opacity", v[0]/100)}/>
                  <Input className="w-20" type="number" value={Math.round((preset.base.opacity||1)*100)} onChange={(e)=>update("base.opacity", clamp(parseInt(e.target.value||"0"),0,100)/100)}/>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="w-28">Same geometry</Label>
                  <Switch checked={preset.base.sameGeometryAsMain} onCheckedChange={(v)=>update("base.sameGeometryAsMain", v)}/>
                </div>
                <div className="flex items-center gap-3">
                  <Label className="w-28">Thickness ×</Label>
                  <Slider max={2} min={0.25} step={0.05} value={[preset.base.thicknessScale||1]} onValueChange={(v)=>update("base.thicknessScale", v[0])}/>
                  <Input className="w-20" type="number" step={0.05} value={preset.base.thicknessScale||1} onChange={(e)=>update("base.thicknessScale", parseFloat(e.target.value||"1"))}/>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Main Stroke</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Label className="w-28">Fill</Label>
                  <Select value={preset.main.fillMode} onValueChange={(v:any)=>update("main.fillMode", v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="gradient2">2-point Gradient</SelectItem>
                      <SelectItem value="gradient3">3-point Gradient</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {preset.main.fillMode === "solid" ? (
                  <div className="flex items-center gap-2">
                    <Label className="w-28">Color</Label>
                    <Input type="color" className="w-12 h-9 p-1" value={preset.main.colorSolid.startsWith("#") ? preset.main.colorSolid : "#00C2FF"} onChange={(e)=>update("main.colorSolid", e.target.value)} />
                    <Input className="flex-1" value={preset.main.colorSolid} onChange={(e)=>update("main.colorSolid", e.target.value)} />
                  </div>
                ) : (
                  <GradientEditorSimple
                    title="Main Gradient"
                    maxStops={preset.main.fillMode === "gradient2" ? 2 : 3}
                    value={preset.main.gradient}
                    onChange={(g)=>update("main.gradient", g)}
                  />
                )}
                <div className="flex items-center gap-3">
                  <Label className="w-28">Segmented</Label>
                  <Switch checked={preset.main.segmented} onCheckedChange={(v)=>update("main.segmented", v)}/>
                </div>
                {preset.main.segmented && (
                  <>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Segments</Label>
                      <Slider max={100} min={1} step={1} value={[preset.main.segments]} onValueChange={(v)=>update("main.segments", v[0])}/>
                      <Input className="w-20" type="number" value={preset.main.segments} onChange={(e)=>update("main.segments", parseInt(e.target.value||"0"))}/>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Gap</Label>
                      <Slider max={30} min={0} step={1} value={[preset.main.segmentGap]} onValueChange={(v)=>update("main.segmentGap", v[0])}/>
                      <Input className="w-20" type="number" value={preset.main.segmentGap} onChange={(e)=>update("main.segmentGap", parseInt(e.target.value||"0"))}/>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-3">
                  <Label className="w-28">Frame</Label>
                  <Switch checked={preset.main.frame.enabled} onCheckedChange={(v)=>update("main.frame.enabled", v)}/>
                  {preset.main.frame.enabled && (
                    <>
                      <Label className="w-20">× Thick</Label>
                      <Slider max={2} min={1} step={0.05} value={[preset.main.frame.thickness]} onValueChange={(v)=>update("main.frame.thickness", v[0])}/>
                      <div className="flex items-center gap-2">
                        <Label className="w-28">Frame Color</Label>
                        <Input type="color" className="w-12 h-9 p-1" value={preset.main.frame.color.startsWith("#") ? preset.main.frame.color : "#ffffff"} onChange={(e)=>update("main.frame.color", e.target.value)} />
                        <Input className="w-36" value={preset.main.frame.color} onChange={(e)=>update("main.frame.color", e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Warning Zones</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="end">
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="start">Start</TabsTrigger>
                    <TabsTrigger value="end">End</TabsTrigger>
                  </TabsList>
                  <TabsContent value="start" className="space-y-3">
                    <div className="flex items-center gap-3"><Label className="w-28">Enabled</Label><Switch checked={preset.warnings.start.enabled} onCheckedChange={(v)=>update("warnings.start.enabled", v)}/></div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Length %</Label>
                      <Slider max={50} min={0} step={1} value={[Math.round(preset.warnings.start.lengthPct*100)]} onValueChange={(v)=>update("warnings.start.lengthPct", v[0]/100)}/>
                      <Input className="w-20" type="number" value={Math.round(preset.warnings.start.lengthPct*100)} onChange={(e)=>update("warnings.start.lengthPct", clamp(parseInt(e.target.value||"0"),0,50)/100)}/>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Mode</Label>
                      <Select value={preset.warnings.start.mode} onValueChange={(v:any)=>update("warnings.start.mode", v)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid</SelectItem>
                          <SelectItem value="gradient2">2-point Gradient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {preset.warnings.start.mode === "solid" ? (
                      <div className="flex items-center gap-2">
                        <Label className="w-28">Color</Label>
                        <Input type="color" className="w-12 h-9 p-1" value={preset.warnings.start.colorSolid.startsWith("#") ? preset.warnings.start.colorSolid : "#00E0FF"} onChange={(e)=>update("warnings.start.colorSolid", e.target.value)} />
                        <Input className="flex-1" value={preset.warnings.start.colorSolid} onChange={(e)=>update("warnings.start.colorSolid", e.target.value)} />
                      </div>
                    ) : (
                      <GradientEditorSimple
                        title="Start Gradient (2 stops)"
                        maxStops={2}
                        value={preset.warnings.start.gradient}
                        onChange={(g)=>update("warnings.start.gradient", g)}
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="end" className="space-y-3">
                    <div className="flex items-center gap-3"><Label className="w-28">Enabled</Label><Switch checked={preset.warnings.end.enabled} onCheckedChange={(v)=>update("warnings.end.enabled", v)}/></div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Length %</Label>
                      <Slider max={50} min={0} step={1} value={[Math.round(preset.warnings.end.lengthPct*100)]} onValueChange={(v)=>update("warnings.end.lengthPct", v[0]/100)}/>
                      <Input className="w-20" type="number" value={Math.round(preset.warnings.end.lengthPct*100)} onChange={(e)=>update("warnings.end.lengthPct", clamp(parseInt(e.target.value||"0"),0,50)/100)}/>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Mode</Label>
                      <Select value={preset.warnings.end.mode} onValueChange={(v:any)=>update("warnings.end.mode", v)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid</SelectItem>
                          <SelectItem value="gradient2">2-point Gradient</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {preset.warnings.end.mode === "solid" ? (
                      <div className="flex items-center gap-2">
                        <Label className="w-28">Color</Label>
                        <Input type="color" className="w-12 h-9 p-1" value={preset.warnings.end.colorSolid.startsWith("#") ? preset.warnings.end.colorSolid : "#FF3B30"} onChange={(e)=>update("warnings.end.colorSolid", e.target.value)} />
                        <Input className="flex-1" value={preset.warnings.end.colorSolid} onChange={(e)=>update("warnings.end.colorSolid", e.target.value)} />
                      </div>
                    ) : (
                      <GradientEditorSimple
                        title="End Gradient (2 stops)"
                        maxStops={2}
                        value={preset.warnings.end.gradient}
                        onChange={(g)=>update("warnings.end.gradient", g)}
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-base">Glow</CardTitle>
  </CardHeader>
  <CardContent className="space-y-3">
    <div className="flex items-center gap-3">
      <Label className="w-28">Enabled</Label>
      <Switch
        checked={preset.glow.enabled}
        onCheckedChange={(v) => update("glow.enabled", v)}
      />
    </div>

    <div className="flex items-center gap-3">
      <Label className="w-28">Strength</Label>
      <Slider
        max={100}
        min={0}
        step={1}
        value={[preset.glow.strength]}
        onValueChange={(v) => update("glow.strength", v[0])}
      />
      <Input
        className="w-20"
        type="number"
        value={preset.glow.strength}
        onChange={(e) =>
          update(
            "glow.strength",
            clamp(parseInt(e.target.value || "0"), 0, 100)
          )
        }
      />
    </div>

    <div className="flex items-center gap-3">
      <Label className="w-28">Thickness</Label>
      <Slider
        max={3}
        min={0.1}
        step={0.05}
        value={[preset.glow.thickness]}
        onValueChange={(v) => update("glow.thickness", v[0])}
      />
      <Input
        className="w-20"
        type="number"
        step={0.05}
        value={preset.glow.thickness}
        onChange={(e) =>
          update(
            "glow.thickness",
            clamp(parseFloat(e.target.value || "0"), 0.1, 3)
          )
        }
      />
    </div>
  </CardContent>
</Card>



            <div className="pb-10" />
          </div>
        </aside>

        {/* RIGHT – Sticky preview + export (no scroll), fits viewport */}
        <main className="h-screen sticky top-0 p-4 flex flex-col gap-4 bg-gray-100 dark:bg-gray-950 overflow-hidden">
          <Card className="flex-1 min-h-0">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Live Preview</CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <div className="h-full w-full overflow-auto flex items-center justify-center rounded-xl p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200/40 dark:border-gray-700/40">
                <canvas ref={canvasRef} className="rounded-lg shadow max-w-full h-auto" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="w-28">File prefix</Label>
                <Input className="flex-1" value={preset.namePrefix} onChange={(e)=> update("namePrefix", e.target.value || "gauge")} />
              </div>

              <div className="flex items-center gap-3">
                <Label className="w-28">Export size</Label>
                <Input className="w-24" type="number" min={16} value={exportW} onChange={(e)=> setExportW(clamp(parseInt(e.target.value || "0"), 16, 4096))} />
                <span>×</span>
                <Input className="w-24" type="number" min={16} value={exportH} onChange={(e)=> setExportH(clamp(parseInt(e.target.value || "0"), 16, 4096))} />
                <span className="text-xs text-muted-foreground">px</span>
              </div>

              <div className="flex items-center gap-3">
                <Label className="w-28">Scrub</Label>
                <Slider
                  max={Math.max(1, preset.main.segmented ? preset.main.segments : effectiveStates - 1)}
                  min={0}
                  step={1}
                  value={[currentState]}
                  onValueChange={(v)=> setCurrentState(v[0])}
                />
                <Input
                  className="w-20"
                  type="number"
                  value={currentState}
                  onChange={(e)=> setCurrentState(clamp(parseInt(e.target.value||"0"), 0, Math.max(1, preset.main.segmented ? preset.main.segments : effectiveStates - 1)))}
                />
                <div className="text-xs text-muted-foreground">{effectiveStates} states (pad {zeroPadWidth})</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={async () => {
                    setIsExporting(true);
                    try {
                      const bin = await exportZip(preset, exportW, exportH);
                      downloadBlob(bin, `${preset.namePrefix}_states_${effectiveStates}.zip`);
                    } finally { setIsExporting(false); }
                  }}
                  disabled={isExporting}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export ZIP
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    setIsExporting(true);
                    try {
                      const blob = await renderStateBlob(preset, currentState, effectiveStates, exportW, exportH);
                      if (blob) downloadBlob(blob, `${preset.namePrefix}_single.png`);
                    } finally { setIsExporting(false); }
                  }}
                  disabled={isExporting}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export single PNG
                </Button>
                <Button onClick={()=> setPreset(defaultPreset)} variant="ghost">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
