import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LivePreviewCard } from "@/components/LivePreviewCard";
import { BaseStrokeSettings } from "@/components/settings/BaseStrokeSettings";
import { ExportPanel } from "@/components/settings/ExportPanel";
import { GlowSettings } from "@/components/settings/GlowSettings";
import { LayoutSettings } from "@/components/settings/LayoutSettings";
import { MainStrokeSettings } from "@/components/settings/MainStrokeSettings";
import { WarningSettings } from "@/components/settings/WarningSettings";
import { useLocalPreset } from "@/hooks/useLocalPreset";
import { defaultPreset } from "./presets";
import { drawArcGauge, drawBarGauge } from "./renderUtils";
import { effectiveExportStates, exportZip, renderStateBlob } from "./exportUtils";
import type { Preset } from "./types";

const STORAGE_KEY = "aida64-gauge-preset";

type UpdatePreset = (path: string, value: unknown) => void;

function clonePreset(preset: Preset): Preset {
  if (typeof structuredClone === "function") {
    return structuredClone(preset);
  }
  return JSON.parse(JSON.stringify(preset));
}

function createInitialPreset(): Preset {
  const base = clonePreset(defaultPreset);
  return {
    ...base,
    theme: "dark",
    glow: {
      ...(base.glow as any),
      enabled: base.glow?.enabled ?? true,
      strength: base.glow?.strength ?? 12,
      thickness: base.glow?.thickness ?? 4,
      mode: base.glow?.mode ?? "soft",
      haloInner: base.glow?.haloInner ?? true,
      haloOuter: base.glow?.haloOuter ?? true,
      legacyOuterThickness: base.glow?.legacyOuterThickness ?? 8,
    },
  } as Preset;
}

export default function App() {
  const [preset, setPreset] = useLocalPreset<Preset>(STORAGE_KEY, createInitialPreset());

  const [currentState, setCurrentState] = useState(0.75);
  const [exportWidth, setExportWidth] = useState(preset.canvas.width);
  const [exportHeight, setExportHeight] = useState(preset.canvas.height);
  const [keepAspect, setKeepAspect] = useState(true);
  const aspectRatio = useRef(preset.canvas.width / Math.max(1, preset.canvas.height));

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    return () => root.classList.remove("dark");
  }, []);

  useEffect(() => {
    aspectRatio.current = preset.canvas.width / Math.max(1, preset.canvas.height);
    setExportWidth(preset.canvas.width);
    setExportHeight(preset.canvas.height);
  }, [preset.canvas.width, preset.canvas.height]); 

  const totalStates = useMemo(() => effectiveExportStates(preset as any), [preset]);

  const updatePreset = useCallback<UpdatePreset>(
    (path, value) => {
      setPreset((prev) => {
        const copy = clonePreset(prev);
        const parts = path.split(".");
        let cursor: any = copy;
        for (let i = 0; i < parts.length - 1; i += 1) {
          const key = parts[i];
          if (cursor[key] == null || typeof cursor[key] !== "object") {
            cursor[key] = {};
          }
          cursor = cursor[key];
        }
        cursor[parts[parts.length - 1]] = value;
        return copy;
      });
    },
    [setPreset]
  );

  const setWidth = useCallback(
    (width: number) => {
      setExportWidth(width);
      if (keepAspect) {
        setExportHeight(Math.max(1, Math.round(width / Math.max(aspectRatio.current, 0.0001))));
      }
    },
    [keepAspect]
  );
  
  const setHeight = useCallback(
    (height: number) => {
      setExportHeight(height);
      if (keepAspect) {
        setExportWidth(Math.max(1, Math.round(height * aspectRatio.current)));
      }
    },
    [keepAspect]
  );

  const getExportPreset = useCallback(
    () => ({
      ...preset,
      canvas: { ...preset.canvas, width: exportWidth, height: exportHeight },
    }),
    [preset, exportWidth, exportHeight]
  );

  const exportZipBundle = useCallback(async () => {
    const bin = await exportZip(getExportPreset() as any);
    const anchor = document.createElement("a");
    const url = URL.createObjectURL(bin);
    anchor.href = url;
    anchor.download = `${preset.namePrefix}_states_${totalStates}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [getExportPreset, preset.namePrefix, totalStates]);

  const exportSingleState = useCallback(async () => {
    const blob = await renderStateBlob(getExportPreset() as any, currentState, totalStates);
    if (!blob) return;
    const anchor = document.createElement("a");
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = `${preset.namePrefix}_single.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [getExportPreset, currentState, preset.namePrefix, totalStates]);

  const resetPreset = useCallback(() => {
    setPreset(createInitialPreset());
  }, [setPreset]);

  const previewValue = useMemo(() => {
    if (preset.main?.segmented) {
      return currentState / Math.max(1, preset.main.segments ?? 1);
    }
    return currentState / Math.max(1, totalStates - 1);
  }, [preset.main, currentState, totalStates]);

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-4 p-4">
        <div className="h-[calc(100vh-2rem)] overflow-y-auto overflow-x-hidden rounded-lg bg-neutral-925 border border-neutral-800">
          <div className="sticky top-0 z-10 -mx-4 -mt-4 px-4 pt-4 pb-3 bg-neutral-925/95 backdrop-blur border-b border-neutral-800">
            <h1 className="text-lg font-semibold">Gauge Generator for AIDA64 SensorPanel</h1>
            <p className="text-xs text-neutral-400">Design & export multi-state PNG gauges</p>
          </div>

          <LayoutSettings preset={preset} onUpdate={updatePreset} />
          <BaseStrokeSettings preset={preset} onUpdate={updatePreset} />
          <MainStrokeSettings preset={preset} onUpdate={updatePreset} />
          <WarningSettings preset={preset} onUpdate={updatePreset} />
          <GlowSettings preset={preset} onUpdate={updatePreset} />
        </div>

        <div className="h-[calc(100vh-2rem)] sticky top-4 flex flex-col gap-4">
          <LivePreviewCard
            preset={preset}
            drawArcGauge={drawArcGauge}
            drawBarGauge={drawBarGauge}
            value01={previewValue}
          />

          <ExportPanel
            preset={preset}
            totalStates={totalStates}
            currentState={currentState}
            onCurrentStateChange={setCurrentState}
            exportWidth={exportWidth}
            exportHeight={exportHeight}
            keepAspect={keepAspect}
            onToggleAspect={setKeepAspect}
            onWidthChange={setWidth}
            onHeightChange={setHeight}
            onResetSize={() => {
              setExportWidth(preset.canvas.width);
              setExportHeight(preset.canvas.height);
            }}
            onExportZip={exportZipBundle}
            onExportSingle={exportSingleState}
            onResetPreset={resetPreset}
            onUpdate={updatePreset}
          />
        </div>
      </div>
    </div>
  );
}
