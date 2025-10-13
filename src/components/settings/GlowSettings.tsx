import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { clamp } from "@/renderUtils";
import type { Preset } from "@/types";

type UpdatePreset = (path: string, value: unknown) => void;

interface GlowSettingsPanelProps {
  preset: Preset;
  onUpdate: UpdatePreset;
}

function GlowSettings({ preset, onUpdate }: GlowSettingsPanelProps) {
  const glow = (preset.glow ?? {}) as any;
  const segmented = preset.main?.segmented;

  return (
    <Card className="m-4 mb-6 bg-neutral-900 border-neutral-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Glow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Label className="w-32">Enabled</Label>
          <Switch checked={glow.enabled} onCheckedChange={(value) => onUpdate("glow.enabled", value)} />
        </div>

        <div className="flex items-center gap-3 mt-2">
          <Label className="w-32">Per-segment glow</Label>
          <Switch
            checked={!!glow.perSegment}
            onCheckedChange={(value) => onUpdate("glow.perSegment", value)}
            disabled={!segmented}
          />
          {!segmented && (
            <span className="text-xs text-neutral-500">Only available in segmented mode</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Label className="w-32">Mode</Label>
          <Select
            value={glow.mode ?? "soft"}
            onValueChange={(value) => onUpdate("glow.mode", value)}
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

        {glow.mode !== "legacy" && (
          <>
            <div className="flex items-center gap-3">
              <Label className="w-32">Strength</Label>
              <Slider
                max={20}
                min={0}
                step={1}
                value={[glow.strength ?? 12]}
                onValueChange={(value) => onUpdate("glow.strength", value[0])}
              />
              <Input
                className="w-24"
                type="number"
                value={glow.strength ?? 12}
                onChange={(event) =>
                  onUpdate("glow.strength", clamp(parseInt(event.target.value || "0", 10), 0, 20))
                }
              />
            </div>

            <div className="flex items-center gap-3">
              <Label className="w-32">Thickness ×</Label>
              <Slider
                max={20}
                min={0}
                step={0.5}
                value={[glow.thickness ?? 4]}
                onValueChange={(value) => onUpdate("glow.thickness", value[0])}
              />
              <Input
                className="w-24"
                type="number"
                step={0.5}
                value={glow.thickness ?? 4}
                onChange={(event) =>
                  onUpdate("glow.thickness", clamp(parseFloat(event.target.value || "0"), 0, 20))
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-3">
                <Label className="w-28">Halo inner</Label>
                <Switch
                  checked={glow.haloInner ?? true}
                  onCheckedChange={(value) => onUpdate("glow.haloInner", value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="w-28">Halo outer</Label>
                <Switch
                  checked={glow.haloOuter ?? true}
                  onCheckedChange={(value) => onUpdate("glow.haloOuter", value)}
                />
              </div>
            </div>
            <p className="text-xs text-neutral-400">
              Halo follows main stroke color and fades inward/outward when enabled.
            </p>
          </>
        )}

        {glow.mode === "legacy" && (
          <>
            <div className="flex items-center gap-3">
              <Label className="w-32">Legacy thickness ×</Label>
              <Slider
                max={40}
                min={0}
                step={0.5}
                value={[glow.legacyOuterThickness ?? 8]}
                onValueChange={(value) => onUpdate("glow.legacyOuterThickness", value[0])}
              />
              <Input
                className="w-24"
                type="number"
                step={0.5}
                value={glow.legacyOuterThickness ?? 8}
                onChange={(event) =>
                  onUpdate(
                    "glow.legacyOuterThickness",
                    clamp(parseFloat(event.target.value || "0"), 0, 40)
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
                value={[glow.strength ?? 12]}
                onValueChange={(value) => onUpdate("glow.strength", value[0])}
              />
              <Input
                className="w-24"
                type="number"
                value={glow.strength ?? 12}
                onChange={(event) =>
                  onUpdate("glow.strength", clamp(parseInt(event.target.value || "0", 10), 0, 20))
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
  );
}

export { GlowSettings };
export type { GlowSettingsPanelProps as GlowSettingsProps };
export default GlowSettings;