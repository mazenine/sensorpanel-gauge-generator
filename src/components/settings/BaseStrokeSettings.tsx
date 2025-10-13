import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { clamp } from "@/renderUtils";
import type { Preset } from "@/types";
import { ColorInput } from "../inputs/ColorInput";

type UpdatePreset = (path: string, value: unknown) => void;

interface BaseStrokeSettingsProps {
  preset: Preset;
  onUpdate: UpdatePreset;
}

export function BaseStrokeSettings({ preset, onUpdate }: BaseStrokeSettingsProps) {
  return (
    <Card className="m-4 bg-neutral-900 border-neutral-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Base Stroke</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Label className="w-32">Enabled</Label>
          <Switch checked={preset.base.enabled} onCheckedChange={(value) => onUpdate("base.enabled", value)} />
        </div>

        <ColorInput
          label="Color"
          value={preset.base.color}
          onChange={(value) => onUpdate("base.color", value)}
        />

        <div className="flex items-center gap-3">
          <Label className="w-32">Opacity</Label>
          <Slider
            max={100}
            min={0}
            step={1}
            value={[Math.round((preset.base.opacity || 1) * 100)]}
            onValueChange={(value) => onUpdate("base.opacity", value[0] / 100)}
          />
          <Input
            className="w-24"
            type="number"
            value={Math.round((preset.base.opacity || 1) * 100)}
            onChange={(event) =>
              onUpdate(
                "base.opacity",
                clamp(parseInt(event.target.value || "0", 10), 0, 100) / 100
              )
            }
          />
        </div>

        <div className="flex items-center gap-3">
          <Label className="w-32">Same geometry</Label>
          <Switch
            checked={preset.base.sameGeometryAsMain}
            onCheckedChange={(value) => onUpdate("base.sameGeometryAsMain", value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Label className="w-32">Thickness ×</Label>
          <Slider
            max={2}
            min={0.25}
            step={0.05}
            value={[preset.base.thicknessScale || 1]}
            onValueChange={(value) => onUpdate("base.thicknessScale", value[0])}
          />
          <Input
            className="w-24"
            type="number"
            step={0.05}
            value={preset.base.thicknessScale || 1}
            onChange={(event) =>
              onUpdate("base.thicknessScale", parseFloat(event.target.value || "1"))
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}