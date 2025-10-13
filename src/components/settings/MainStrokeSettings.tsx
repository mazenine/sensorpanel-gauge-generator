import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { Preset } from "@/types";
import { ColorInput } from "../inputs/ColorInput";
import { GradientEditor } from "../inputs/GradientEditor";
import { getDefaultStops } from "@/utils/gradients";

type UpdatePreset = (path: string, value: unknown) => void;

interface MainStrokeSettingsProps {
  preset: Preset;
  onUpdate: UpdatePreset;
}

export function MainStrokeSettings({ preset, onUpdate }: MainStrokeSettingsProps) {
  const handleFillChange = (mode: Preset["main"]["fillMode"]) => {
    onUpdate("main.fillMode", mode);
    if (mode.startsWith("gradient")) {
      onUpdate("main.gradient.stops", getDefaultStops(mode));
    } else {
      onUpdate("main.gradient.stops", getDefaultStops("solid"));
    }
  };

  return (
    <Card className="m-4 bg-neutral-900 border-neutral-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Main Stroke</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Label className="w-32">Fill</Label>
          <Select value={preset.main.fillMode} onValueChange={handleFillChange}>
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
            onChange={(value) => onUpdate("main.colorSolid", value)}
          />
        ) : (
          <GradientEditor
            title="Main Gradient"
            stops={preset.main.gradient.stops}
            onChange={(stops) => onUpdate("main.gradient.stops", stops)}
          />
        )}

        <div className="flex items-center gap-3">
          <Label className="w-32">Segmented</Label>
          <Switch checked={preset.main.segmented} onCheckedChange={(value) => onUpdate("main.segmented", value)} />
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
                onValueChange={(value) => onUpdate("main.segments", value[0])}
              />
              <Input
                className="w-24"
                type="number"
                value={preset.main.segments}
                onChange={(event) => onUpdate("main.segments", parseInt(event.target.value || "0", 10))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="w-32">Gap</Label>
              <Slider
                max={30}
                min={0}
                step={1}
                value={[preset.main.segmentGap]}
                onValueChange={(value) => onUpdate("main.segmentGap", value[0])}
              />
              <Input
                className="w-24"
                type="number"
                value={preset.main.segmentGap}
                onChange={(event) => onUpdate("main.segmentGap", parseInt(event.target.value || "0", 10))}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}