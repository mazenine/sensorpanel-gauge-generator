console.log("✅ App mounted");


import React, { useEffect, useMemo, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, RefreshCw } from "lucide-react";

import { LivePreviewCard } from "@/components/LivePreviewCard";

import { defaultPreset } from "./presets";
import { buildCanvas, clamp, drawArcGauge, drawBarGauge } from "./renderUtils";
import { exportZip, renderStateBlob, effectiveExportStates } from "./exportUtils";

/* =============================================================================
   Small helpers
============================================================================= */

function rgbaToHexGuess(c: string) {
  if (!c) return "#ffffff";
  if (c.startsWith("#")) return c;
  const m = c.match(/rgba?\(([^)]+)\)/i);
  if (!m) return "#ffffff";
  const [r, g, b] = m[1].split(",").map((s) => parseFloat(s));
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(b)}${toHex(b)}`;
}

// Note: we keep presets in localStorage so users don’t lose settings on refresh.
function useLocalPreset<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {}
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }, [key, val]);
  return [val, setVal];
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-32">{label}</Label>
      <Input
        type="color"
        value={rgbaToHexGuess(value)}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-9 p-1"
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
    </div>
  );
}

// Default gradient stop presets used by GradientEditor and parent components.
function getDefaultStops(mode: string) {
  if (mode === "solid") return [{ pos: 0, color: "#ffffff" }];
  if (mode === "gradient2")
    return [
      { pos: 0, color: "#00ff00" },
      { pos: 1, color: "#ff0000" },
    ];
  if (mode === "gradient3")
    return [
      { pos: 0, color: "#00ff00" },
      { pos: 0.5, color: "#ffff00" },
      { pos: 1, color: "#ff0000" },
    ];
  return [{ pos: 0, color: "#ffffff" }];
}


// Minimal gradient editor reused for Main/Warning gradients.
function GradientEditor({
  title,
  stops,
  onChange,
}: {
  title: string;
  stops: Array<{ pos: number; color: string }>;
  onChange: (s: Array<{ pos: number; color: string }>) => void;
}) {
  const updateStop = (i: number, patch: Partial<{ pos: number; color: string }>) => {
    const s = stops.map((st, idx) =>
      idx === i ? { ...st, ...patch } : st
    );
    onChange(s);
  };

  return (
    <Card className="mt-2 bg-neutral-850 border-neutral-800">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stops.map((st, i) => (
          <div key={i} className="grid grid-cols-5 items-center gap-2">
            <Label className="col-span-2">Stop {i + 1}</Label>
            <Input
              type="color"
              value={rgbaToHexGuess(st.color)}
              onChange={(e) => updateStop(i, { color: e.target.value })}
              className="w-12 h-9 p-1"
            />
            <Input
              value={st.color}
              onChange={(e) => updateStop(i, { color: e.target.value })}
              className="col-span-2"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* =============================================================================
   App (dark-only, soft neutral, preview fits, left-only scroll)
============================================================================= */


export default function App() {
  // Force dark-only & softly adjust tones (neutral-950 bg / neutral-900 cards / neutral-800 borders).
  const [preset, setPreset] = useLocalPreset("aida64-gauge-preset", {
    ...defaultPreset,
    theme: "dark", // lock to dark; we also force <html>.dark below
    // Extend glow shape non-destructively so the UI can set extra fields
    glow: {
      ...(defaultPreset as any).glow,
      enabled: (defaultPreset as any).glow?.enabled ?? true,
      strength: (defaultPreset as any).glow?.strength ?? 12, // 0..20
      thickness: (defaultPreset as any).glow?.thickness ?? 4, // 0..20 (soft/ring)
      // Extra UI-only fields – renderer can read them if it supports them:
      mode: (defaultPreset as any).glow?.mode ?? "soft", // "soft" | "ring" | "legacy"
      haloInner: (defaultPreset as any).glow?.haloInner ?? true,
      haloOuter: (defaultPreset as any).glow?.haloOuter ?? true,
      legacyThickness: (defaultPreset as any).glow?.legacyThickness ?? 8, // up to 40
    },
  } as any);

  const [currentState, setCurrentState] = useState(0.75);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Export-only size (does NOT affect preview canvas)
  const [expW, setExpW] = useState(preset.canvas.width);
  const [expH, setExpH] = useState(preset.canvas.height);
  const [keepAR, setKeepAR] = useState(true);
  const ar = useRef(preset.canvas.width / Math.max(1, preset.canvas.height));

  // Force the <html> element into dark mode (no toggle for now).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    return () => root.classList.add("dark");
  }, []);

  // Derived: how many preview/export states
  const totalStates = useMemo(() => effectiveExportStates(preset as any), [preset]);

  // Render preview (canvas scales to card; no scroll)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    buildCanvas(ctx as any, preset.canvas.width, preset.canvas.height);
    ctx.clearRect(0, 0, preset.canvas.width, preset.canvas.height);

    const v01 = preset.main.segmented
      ? currentState / Math.max(1, preset.main.segments)
      : currentState / Math.max(1, totalStates - 1);

    if (preset.mode === "arc") drawArcGauge(ctx as any, preset as any, v01);
    else drawBarGauge(ctx as any, preset as any, v01); 
    
      console.log("Rendering gauge mode:", preset?.mode, "progress:", v01);

    

    // Make it always fit without scrollbars
    canvas.style.width = "100%";
    canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    (canvas.style as any).aspectRatio = `${preset.canvas.width} / ${preset.canvas.height}`;
  }, [preset, currentState, totalStates]);


  
  // Update helper that supports "a.b.c" paths without changing your types
  const update = (path: string, value: any) =>
    setPreset((prev: any) => {
      const copy: any =
        typeof structuredClone === "function" ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let obj = copy;
      for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
      obj[parts[parts.length - 1]] = value;
      return copy;
    });

  // Export-size helpers (preserve preview aspect unless toggled off)
  const setW = (w: number) => {
    setExpW(w);
    if (keepAR) setExpH(Math.max(1, Math.round(w / ar.current)));
  };
  const setH = (h: number) => {
    setExpH(h);
    if (keepAR) setExpW(Math.max(1, Math.round(h * ar.current)));
  };
  const withExportSize = (p = preset as any) => ({
    ...p,
    canvas: { ...p.canvas, width: expW, height: expH },
  });

  // Export actions (name prefix lives on preset.namePrefix)
  const doExportZip = async () => {
    const bin = await exportZip(withExportSize() as any);
    const a = document.createElement("a");
    const url = URL.createObjectURL(bin);
    a.href = url;
    a.download = `${preset.namePrefix}_states_${totalStates}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const doExportSingle = async () => {
    const blob = await renderStateBlob(withExportSize() as any, currentState, totalStates);
    if (!blob) return;
    const a = document.createElement("a");
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${preset.namePrefix}_single.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-4 p-4">
        {/* LEFT – scrolls vertically only; soft dark container */}
        <div className="h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden rounded-lg bg-neutral-925 border border-neutral-800">
          <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 pb-3 bg-neutral-925/95 backdrop-blur border-b border-neutral-800">
            <h1 className="text-lg font-semibold">Gauge Generator for AIDA64 SensorPanel</h1>
            <p className="text-xs text-neutral-400">Design & export multi-state PNG gauges</p>
          </div>

          {/* Layout */}
          <Card className="m-4 bg-neutral-900 border-neutral-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Layout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="w-32">Mode</Label>
                <Select value={preset.mode} onValueChange={(v: any) => update("mode", v)}>
                  <SelectTrigger className="w-full max-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="arc">270° Circular</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {preset.mode === "arc" ? (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="w-32">Opening</Label>
                    <Select
                      value={preset.openingDirection}
                      onValueChange={(v: any) => update("openingDirection", v)}
                    >
                      <SelectTrigger className="w-full max-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom">Bottom</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="w-32">Radius</Label>
                    <Slider
                      max={400}
                      min={20}
                      step={1}
                      value={[preset.arc.radius]}
                      onValueChange={(v) => update("arc.radius", v[0])}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      value={preset.arc.radius}
                      onChange={(e) => update("arc.radius", parseInt(e.target.value || "0"))}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="w-32">Thickness</Label>
                    <Slider
                      max={160}
                      min={4}
                      step={1}
                      value={[preset.arc.thickness]}
                      onValueChange={(v) => update("arc.thickness", v[0])}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      value={preset.arc.thickness}
                      onChange={(e) => update("arc.thickness", parseInt(e.target.value || "0"))}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="w-32">Round caps</Label>
                    <Switch
                      checked={preset.arc.roundCaps}
                      onCheckedChange={(v) => update("arc.roundCaps", v)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Label className="w-32">Orientation</Label>
                    <Select
                      value={preset.bar.orientation}
                      onValueChange={(v: any) => update("bar.orientation", v)}
                    >
                      <SelectTrigger className="w-full max-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horizontal">Horizontal</SelectItem>
                        <SelectItem value="vertical">Vertical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="w-32">Direction</Label>
                    <Select
                      value={preset.bar.direction}
                      onValueChange={(v) => update("bar.direction", v)}
                    >
                      <SelectTrigger className="w-full max-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {preset.bar.orientation === "horizontal" ? (
                          <>
                            <SelectItem value="ltr">Left → Right</SelectItem>
                            <SelectItem value="rtl">Right → Left</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="ttb">Top → Bottom</SelectItem>
                            <SelectItem value="btt">Bottom → Top</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="w-32">Length</Label>
                    <Slider
                      max={800}
                      min={50}
                      step={1}
                      value={[preset.bar.length]}
                      onValueChange={(v) => update("bar.length", v[0])}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      value={preset.bar.length}
                      onChange={(e) => update("bar.length", parseInt(e.target.value || "0"))}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="w-32">Thickness</Label>
                    <Slider
                      max={160}
                      min={4}
                      step={1}
                      value={[preset.bar.thickness]}
                      onValueChange={(v) => update("bar.thickness", v[0])}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      value={preset.bar.thickness}
                      onChange={(e) => update("bar.thickness", parseInt(e.target.value || "0"))}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="w-32">Corner radius</Label>
                    <Slider
                      max={80}
                      min={0}
                      step={1}
                      value={[preset.bar.cornerRadius]}
                      onValueChange={(v) => update("bar.cornerRadius", v[0])}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      value={preset.bar.cornerRadius}
                      onChange={(e) =>
                        update("bar.cornerRadius", parseInt(e.target.value || "0"))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="w-32">Square ends</Label>
                    <Switch
                      checked={preset.bar.squareEnds}
                      onCheckedChange={(v) => update("bar.squareEnds", v)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Base Stroke */}
          <Card className="m-4 bg-neutral-900 border-neutral-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Base Stroke</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="w-32">Enabled</Label>
                <Switch
                  checked={preset.base.enabled}
                  onCheckedChange={(v) => update("base.enabled", v)}
                />
              </div>
              <ColorInput
                label="Color"
                value={preset.base.color}
                onChange={(v) => update("base.color", v)}
              />
              <div className="flex items-center gap-3">
                <Label className="w-32">Opacity</Label>
                <Slider
                  max={100}
                  min={0}
                  step={1}
                  value={[Math.round((preset.base.opacity || 1) * 100)]}
                  onValueChange={(v) => update("base.opacity", v[0] / 100)}
                />
                <Input
                  className="w-24"
                  type="number"
                  value={Math.round((preset.base.opacity || 1) * 100)}
                  onChange={(e) =>
                    update(
                      "base.opacity",
                      clamp(parseInt(e.target.value || "0"), 0, 100) / 100
                    )
                  }
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-32">Same geometry</Label>
                <Switch
                    checked={preset.base.sameGeometryAsMain}
                    onCheckedChange={(v) => update("base.sameGeometryAsMain", v)}
                  />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-32">Thickness ×</Label>
                <Slider
                  max={2}
                  min={0.25}
                  step={0.05}
                  value={[preset.base.thicknessScale || 1]}
                  onValueChange={(v) => update("base.thicknessScale", v[0])}
                />
                <Input
                  className="w-24"
                  type="number"
                  step={0.05}
                  value={preset.base.thicknessScale || 1}
                  onChange={(e) =>
                    update("base.thicknessScale", parseFloat(e.target.value || "1"))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Main Stroke */}
          <Card className="m-4 bg-neutral-900 border-neutral-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Main Stroke</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Label className="w-32">Fill</Label>
                <Select
                  value={preset.main.fillMode}
                  onValueChange={(v: any) => {
                    update("main.fillMode", v);
                    if (v.startsWith("gradient")) {
                      update("main.gradient.stops", getDefaultStops(v));
                    } else {
                      update("main.gradient.stops", getDefaultStops("solid"));
                    }
                  }}
                >

                  <SelectTrigger className="w-full max-w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="gradient2">2-point Gradient</SelectItem>
                    <SelectItem value="gradient3">3-point Gradient</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {preset.main.fillMode === "solid" ? (
                <ColorInput
                  label="Color"
                  value={preset.main.colorSolid}
                  onChange={(v) => update("main.colorSolid", v)}
                />
              ) : (
                <GradientEditor
                  title="Main Gradient"
                  stops={preset.main.gradient.stops}
                  onChange={(s) => update("main.gradient.stops", s)}
                />
              )}

              <div className="flex items-center gap-3">
                <Label className="w-32">Segmented</Label>
                <Switch
                  checked={preset.main.segmented}
                  onCheckedChange={(v) => update("main.segmented", v)}
                />
              </div>

              {preset.main.segmented && (
                <>
                  <div className="flex items-center gap-3">
                    <Label className="w-32">Segments</Label>
                    <Slider
                      max={100}
                      min={1}
                      step={1}
                      value={[preset.main.segments]}
                      onValueChange={(v) => update("main.segments", v[0])}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      value={preset.main.segments}
                      onChange={(e) =>
                        update("main.segments", parseInt(e.target.value || "0"))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="w-32">Gap</Label>
                    <Slider
                      max={30}
                      min={0}
                      step={1}
                      value={[preset.main.segmentGap]}
                      onValueChange={(v) => update("main.segmentGap", v[0])}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      value={preset.main.segmentGap}
                      onChange={(e) =>
                        update("main.segmentGap", parseInt(e.target.value || "0"))
                      }
                    />
                  </div>
                </>
              )}
              {/* Frame feature temporarily disabled */}
            </CardContent>
          </Card>

          {/* Warning Zones (temporarily inactive) */}
          <Card className="m-4 bg-neutral-900/70 border-neutral-800 opacity-60 pointer-events-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Warning Zones
                <span className="text-[11px] font-medium text-neutral-500">(temporarily disabled)</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <Tabs defaultValue="end">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="start">Start</TabsTrigger>
                  <TabsTrigger value="end">End</TabsTrigger>
                </TabsList>

                {/* --- START ZONE --- */}
                <TabsContent value="start" className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Label className="w-32">Enabled</Label>
                    <Switch disabled checked={preset.warnings?.start?.enabled ?? false} />
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="w-32">Length %</Label>
                    <Slider disabled max={50} min={0} step={1} value={[Math.round((preset.warnings?.start?.lengthPct ?? 0) * 100)]} />
                    <Input disabled className="w-24" type="number" value={Math.round((preset.warnings?.start?.lengthPct ?? 0) * 100)} />
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="w-32">Mode</Label>
                    <Select disabled value={preset.warnings?.start?.mode ?? "solid"}>
                      <SelectTrigger className="w-full max-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                    </Select>
                  </div>

                  {preset.warnings?.start?.mode === "solid" ? (
<ColorInput
  label="Color"
  value={preset.warnings?.start?.colorSolid ?? "#00E0FF"}
  onChange={() => {}}
/>
                  ) : (
                    <GradientEditor
                      title="Start Gradient"
                      stops={preset.warnings?.start?.gradient?.stops ?? []}
                      disabled
                    />
                  )}
                </TabsContent>

                {/* --- END ZONE --- */}
                <TabsContent value="end" className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Label className="w-32">Enabled</Label>
                    <Switch disabled checked={preset.warnings?.end?.enabled ?? false} />
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="w-32">Length %</Label>
                    <Slider disabled max={50} min={0} step={1} value={[Math.round((preset.warnings?.end?.lengthPct ?? 0) * 100)]} />
                    <Input disabled className="w-24" type="number" value={Math.round((preset.warnings?.end?.lengthPct ?? 0) * 100)} />
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="w-32">Mode</Label>
                    <Select disabled value={preset.warnings?.end?.mode ?? "solid"}>
                      <SelectTrigger className="w-full max-w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                    </Select>
                  </div>

                  {preset.warnings?.end?.mode === "solid" ? (
<ColorInput
  label="Color"
  value={preset.warnings?.end?.colorSolid ?? "#FF3B30"}
  onChange={() => {}}
/>

                  ) : (
                    <GradientEditor
                      title="End Gradient"
                      stops={preset.warnings?.end?.gradient?.stops ?? []}
                      disabled
                    />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>


          {/* Glow (Soft / Ring / Legacy). Color follows main; modes map to renderer fields if available. */}
          <Card className="m-4 mb-6 bg-neutral-900 border-neutral-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Glow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Label className="w-32">Enabled</Label>
                <Switch checked={preset.glow.enabled} onCheckedChange={(v) => update("glow.enabled", v)} />
              </div>

{/* Per-segment glow toggle */}
<div className="flex items-center gap-3 mt-2">
  <Label className="w-32">Per-segment glow</Label>
  <Switch
    checked={!!preset.glow.perSegment}
    onCheckedChange={(v) => update("glow.perSegment", v)}
    disabled={!preset.main?.segmented}
  />
  {!preset.main?.segmented && (
    <span className="text-xs text-neutral-500">
      Only available in segmented mode
    </span>
  )}
</div>



              <div className="flex items-center gap-3">
                <Label className="w-32">Mode</Label>
                <Select
                  value={(preset as any).glow?.mode ?? "soft"}
                  onValueChange={(v: any) => update("glow.mode", v)}
                >
                  <SelectTrigger className="w-full max-w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soft">Soft halo</SelectItem>
                    <SelectItem value="ring">Ring glow</SelectItem>
                    <SelectItem value="legacy">Legacy (double)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Soft halo options */}
              {(preset as any).glow?.mode !== "legacy" && (
                <>
                  <div className="flex items-center gap-3">
                    <Label className="w-32">Strength</Label>
                    <Slider
                      max={20}
                      min={0}
                      step={1}
                      value={[preset.glow.strength ?? 12]}
                      onValueChange={(v) => update("glow.strength", v[0])}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      value={preset.glow.strength ?? 12}
                      onChange={(e) =>
                        update("glow.strength", clamp(parseInt(e.target.value || "0"), 0, 20))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="w-32">Thickness ×</Label>
                    <Slider
                      max={20}
                      min={0}
                      step={0.5}
                      value={[preset.glow.thickness ?? 4]}
                      onValueChange={(v) => update("glow.thickness", v[0])}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      step={0.5}
                      value={preset.glow.thickness ?? 4}
                      onChange={(e) =>
                        update("glow.thickness", clamp(parseFloat(e.target.value || "0"), 0, 20))
                      }
                    />
                  </div>

                  {/* If your renderer supports inner/outer, these map to glow.haloInner / glow.haloOuter */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Halo inner</Label>
                      <Switch
                        checked={(preset as any).glow?.haloInner ?? true}
                        onCheckedChange={(v) => update("glow.haloInner", v)}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28">Halo outer</Label>
                      <Switch
                        checked={(preset as any).glow?.haloOuter ?? true}
                        onCheckedChange={(v) => update("glow.haloOuter", v)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Halo follows main stroke color and fades inward/outward when enabled.
                  </p>
                </>
              )}

              {/* Legacy double-ring options */}
              {(preset as any).glow?.mode === "legacy" && (
                <>
                  <div className="flex items-center gap-3">
                    <Label className="w-32">Legacy thickness ×</Label>
                    <Slider
                      max={40}
                      min={0}
                      step={0.5}
                      value={[((preset as any).glow?.legacyThickness ?? 8) as number]}
                      onValueChange={(v) => update("glow.legacyThickness", v[0])}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      step={0.5}
                      value={((preset as any).glow?.legacyThickness ?? 8) as number}
                      onChange={(e) =>
                        update(
                          "glow.legacyThickness",
                          clamp(parseFloat(e.target.value || "0"), 0, 40)
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="w-32">Strength</Label>
                    <Slider
                      max={20}
                      min={0}
                      step={1}
                      value={[preset.glow.strength ?? 12]}
                      onValueChange={(v) => update("glow.strength", v[0])}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      value={preset.glow.strength ?? 12}
                      onChange={(e) =>
                        update("glow.strength", clamp(parseInt(e.target.value || "0"), 0, 20))
                      }
                    />
                  </div>
                  <p className="text-xs text-neutral-400">
                    Legacy (double) renders additive ring strokes around the main path (follows main color).
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

{/* RIGHT – sticky; preview fits card; export below; both follow dark cards */}
      <div className="h-[calc(100vh-2rem)] sticky top-4 flex flex-col gap-4">
      <LivePreviewCard
        preset={preset}
        drawArcGauge={drawArcGauge}
        drawBarGauge={drawBarGauge}
        value01={preset.main?.segmented
          ? currentState / Math.max(1, preset.main?.segments ?? 1)
          : currentState / Math.max(1, totalStates - 1)}
      />


    <Card className="bg-neutral-900 border-neutral-800 flex-shrink-0">
  <CardHeader className="py-3">
    <CardTitle className="text-base">Export</CardTitle>
  </CardHeader>

  <CardContent className="space-y-4">
    {/* PNG prefix + states */}
    <div className="flex items-center gap-3 flex-wrap">
      <Label className="w-32">PNG name</Label>
      <Input
        className="w-40"
        value={preset.namePrefix}
        onChange={(e) => update("namePrefix", e.target.value)}
        placeholder="gauge"
      />
      <span className="text-xs text-neutral-500">
        (base name — state numbers will be appended)
      </span>

      {!preset.main?.segmented && (
        <div className="flex items-center gap-2 ml-auto">
          <Label>PNG states</Label>
          <Input
            type="number"
            min={10}
            max={101}
            className="w-20"
            value={preset.states ?? 16}
            onChange={(e) => {
              const val = Math.max(
                10,
                Math.min(101, parseInt(e.target.value) || 16)
              );
              update("states", val);
            }}
          />
        </div>
      )}

      {preset.main?.segmented && (
        <div className="ml-auto text-sm text-neutral-400">
          Total states: {preset.main?.segments ?? 1}
        </div>
      )}
    </div>

    {/* PNG size */}
    <div className="flex items-center gap-3 flex-wrap">
      <Label className="w-32">PNG size</Label>
      <Input
        className="w-24"
        type="number"
        value={expW}
        onChange={(e) => setW(Math.max(1, parseInt(e.target.value || "1")))}
      />
      <span>×</span>
      <Input
        className="w-24"
        type="number"
        value={expH}
        onChange={(e) => setH(Math.max(1, parseInt(e.target.value || "1")))}
      />

      <div className="flex items-center gap-2 ml-3">
        <Label>Keep aspect</Label>
        <Switch checked={keepAR} onCheckedChange={setKeepAR} />
      </div>

      <Button
        variant="ghost"
        onClick={() => {
          setExpW(preset.canvas.width);
          setExpH(preset.canvas.height);
        }}
      >
        Reset size
      </Button>
    </div>

    {/* Scrub slider */}
    <div className="flex items-center gap-3">
      <Label className="w-32">Scrub</Label>
      <Slider
        max={Math.max(
          1,
          preset.main?.segmented ? preset.main.segments : totalStates - 1
        )}
        min={0}
        step={1}
        value={[currentState]}
        onValueChange={(v) => setCurrentState(v[0])}
      />
      <div className="text-xs text-neutral-400">
        Total states: {totalStates} • Zero-pad: {totalStates >= 100 ? 3 : 2}
      </div>
    </div>

    {/* Export buttons */}
    <div className="flex flex-wrap gap-2">
      <Button onClick={doExportZip}>
        <Download className="w-4 h-4 mr-2" />
        Export ZIP
      </Button>
      <Button variant="secondary" onClick={doExportSingle}>
        <Download className="w-4 h-4 mr-2" />
        Export single PNG
      </Button>
      <Button
        variant="ghost"
        onClick={() =>
          setPreset({
            ...(defaultPreset as any),
            theme: "dark",
          } as any)
        }
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Reset
      </Button>
    </div>
  </CardContent>
</Card>
  </div>
</div>
</div>
);
}
