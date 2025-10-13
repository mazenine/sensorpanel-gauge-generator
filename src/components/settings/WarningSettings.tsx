import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Preset } from "@/types";
import { ColorInput } from "../inputs/ColorInput";
import { GradientEditor } from "../inputs/GradientEditor";

type UpdatePreset = (path: string, value: unknown) => void;

interface WarningSettingsProps {
  preset: Preset;
  onUpdate: UpdatePreset;
}

const disabledProps = { disabled: true } as const;

export function WarningSettings({ preset, onUpdate }: WarningSettingsProps) {
  return (
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

          <TabsContent value="start" className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="w-32">Enabled</Label>
              <Switch checked={preset.warnings?.start?.enabled ?? false} {...disabledProps} />
            </div>

            <div className="flex items-center gap-3">
              <Label className="w-32">Length %</Label>
              <Slider
                max={50}
                min={0}
                step={1}
                value={[Math.round((preset.warnings?.start?.lengthPct ?? 0) * 100)]}
                {...disabledProps}
              />
              <Input
                className="w-24"
                type="number"
                value={Math.round((preset.warnings?.start?.lengthPct ?? 0) * 100)}
                {...disabledProps}
              />
            </div>

            <div className="flex items-center gap-3">
              <Label className="w-32">Mode</Label>
              <Select value={preset.warnings?.start?.mode ?? "solid"} {...disabledProps}>
                <SelectTrigger className="w-full max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>

            {preset.warnings?.start?.mode === "solid" ? (
              <ColorInput
                label="Color"
                value={preset.warnings?.start?.colorSolid ?? "#FF3B30"}
                onChange={(value) => onUpdate("warnings.start.colorSolid", value)}
                disabled
              />
            ) : (
              <GradientEditor
                title="Start Gradient"
                stops={preset.warnings?.start?.gradient?.stops ?? []}
                onChange={() => {}}
                disabled
              />
            )}
          </TabsContent>

          <TabsContent value="end" className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="w-32">Enabled</Label>
              <Switch checked={preset.warnings?.end?.enabled ?? false} {...disabledProps} />
            </div>

            <div className="flex items-center gap-3">
              <Label className="w-32">Length %</Label>
              <Slider
                max={50}
                min={0}
                step={1}
                value={[Math.round((preset.warnings?.end?.lengthPct ?? 0) * 100)]}
                {...disabledProps}
              />
              <Input
                className="w-24"
                type="number"
                value={Math.round((preset.warnings?.end?.lengthPct ?? 0) * 100)}
                {...disabledProps}
              />
            </div>

            <div className="flex items-center gap-3">
              <Label className="w-32">Mode</Label>
              <Select value={preset.warnings?.end?.mode ?? "solid"} {...disabledProps}>
                <SelectTrigger className="w-full max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>

            {preset.warnings?.end?.mode === "solid" ? (
              <ColorInput
                label="Color"
                value={preset.warnings?.end?.colorSolid ?? "#FF3B30"}
                onChange={(value) => onUpdate("warnings.end.colorSolid", value)}
                disabled
              />
            ) : (
              <GradientEditor
                title="End Gradient"
                stops={preset.warnings?.end?.gradient?.stops ?? []}
                onChange={() => {}}
                disabled
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}