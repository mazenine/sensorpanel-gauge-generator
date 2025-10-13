import { Download, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { Preset } from "@/types";

type UpdatePreset = (path: string, value: unknown) => void;

interface ExportPanelProps {
  preset: Preset;
  totalStates: number;
  currentState: number;
  onCurrentStateChange: (value: number) => void;
  exportWidth: number;
  exportHeight: number;
  keepAspect: boolean;
  onToggleAspect: (value: boolean) => void;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onResetSize: () => void;
  onExportZip: () => Promise<void> | void;
  onExportSingle: () => Promise<void> | void;
  onResetPreset: () => void;
  onUpdate: UpdatePreset;
}

export function ExportPanel({
  preset,
  totalStates,
  currentState,
  onCurrentStateChange,
  exportWidth,
  exportHeight,
  keepAspect,
  onToggleAspect,
  onWidthChange,
  onHeightChange,
  onResetSize,
  onExportZip,
  onExportSingle,
  onResetPreset,
  onUpdate,
}: ExportPanelProps) {
  return (
    <Card className="bg-neutral-900 border-neutral-800 flex-shrink-0">
      <CardHeader className="py-3">
        <CardTitle className="text-base">Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="w-32">PNG name</Label>
          <Input
            className="w-40"
            value={preset.namePrefix}
            onChange={(event) => onUpdate("namePrefix", event.target.value)}
            placeholder="gauge"
          />
          <span className="text-xs text-neutral-500">(base name — state numbers will be appended)</span>

          {!preset.main.segmented && (
            <div className="flex items-center gap-2 ml-auto">
              <Label>PNG states</Label>
              <Input
                type="number"
                min={10}
                max={101}
                className="w-20"
                value={preset.states ?? 16}
                onChange={(event) => {
                  const parsed = parseInt(event.target.value || "0", 10);
                  const clamped = Math.max(10, Math.min(101, Number.isNaN(parsed) ? 16 : parsed));
                  onUpdate("states", clamped);
                }}
              />
            </div>
          )}

          {preset.main.segmented && (
            <div className="ml-auto text-sm text-neutral-400">Total states: {preset.main.segments ?? 1}</div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Label className="w-32">PNG size</Label>
          <Input
            className="w-24"
            type="number"
            value={exportWidth}
            onChange={(event) => onWidthChange(Math.max(1, parseInt(event.target.value || "1", 10)))}
          />
          <span>×</span>
          <Input
            className="w-24"
            type="number"
            value={exportHeight}
            onChange={(event) => onHeightChange(Math.max(1, parseInt(event.target.value || "1", 10)))}
          />

          <div className="flex items-center gap-2 ml-3">
            <Label>Keep aspect</Label>
            <Switch checked={keepAspect} onCheckedChange={onToggleAspect} />
          </div>

          <Button variant="ghost" onClick={onResetSize}>
            Reset size
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Label className="w-32">Scrub</Label>
          <Slider
            max={Math.max(1, preset.main.segmented ? preset.main.segments : totalStates - 1)}
            min={0}
            step={1}
            value={[currentState]}
            onValueChange={(value) => onCurrentStateChange(value[0])}
          />
          <div className="text-xs text-neutral-400">
            Total states: {totalStates} • Zero-pad: {totalStates >= 100 ? 3 : 2}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={onExportZip}>
            <Download className="w-4 h-4 mr-2" />
            Export ZIP
          </Button>
          <Button variant="secondary" onClick={onExportSingle}>
            <Download className="w-4 h-4 mr-2" />
            Export single PNG
          </Button>
          <Button variant="ghost" onClick={onResetPreset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}