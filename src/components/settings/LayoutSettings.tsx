import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { Preset } from "@/types";

type UpdatePreset = (path: string, value: unknown) => void;

interface LayoutSettingsProps {
  preset: Preset;
  onUpdate: UpdatePreset;
}

export function LayoutSettings({ preset, onUpdate }: LayoutSettingsProps) {
  return (
    <Card className="m-4 bg-neutral-900 border-neutral-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Layout</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="w-32">Mode</Label>
          <Select value={preset.mode} onValueChange={(value: Preset["mode"]) => onUpdate("mode", value)}>
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
                onValueChange={(value) => onUpdate("openingDirection", value)}
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
                onValueChange={(value) => onUpdate("arc.radius", value[0])}
              />
              <Input
                className="w-24"
                type="number"
                value={preset.arc.radius}
                onChange={(event) => onUpdate("arc.radius", parseInt(event.target.value || "0", 10))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Label className="w-32">Thickness</Label>
              <Slider
                max={160}
                min={4}
                step={1}
                value={[preset.arc.thickness]}
                onValueChange={(value) => onUpdate("arc.thickness", value[0])}
              />
              <Input
                className="w-24"
                type="number"
                value={preset.arc.thickness}
                onChange={(event) => onUpdate("arc.thickness", parseInt(event.target.value || "0", 10))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Label className="w-32">Round caps</Label>
              <Switch checked={preset.arc.roundCaps} onCheckedChange={(value) => onUpdate("arc.roundCaps", value)} />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Label className="w-32">Orientation</Label>
              <Select
                value={preset.bar.orientation}
                onValueChange={(value) => onUpdate("bar.orientation", value)}
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
              <Select value={preset.bar.direction} onValueChange={(value) => onUpdate("bar.direction", value)}>
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
                onValueChange={(value) => onUpdate("bar.length", value[0])}
              />
              <Input
                className="w-24"
                type="number"
                value={preset.bar.length}
                onChange={(event) => onUpdate("bar.length", parseInt(event.target.value || "0", 10))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Label className="w-32">Thickness</Label>
              <Slider
                max={160}
                min={4}
                step={1}
                value={[preset.bar.thickness]}
                onValueChange={(value) => onUpdate("bar.thickness", value[0])}
              />
              <Input
                className="w-24"
                type="number"
                value={preset.bar.thickness}
                onChange={(event) => onUpdate("bar.thickness", parseInt(event.target.value || "0", 10))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Label className="w-32">Corner radius</Label>
              <Slider
                max={80}
                min={0}
                step={1}
                value={[preset.bar.cornerRadius]}
                onValueChange={(value) => onUpdate("bar.cornerRadius", value[0])}
              />
              <Input
                className="w-24"
                type="number"
                value={preset.bar.cornerRadius}
                onChange={(event) => onUpdate("bar.cornerRadius", parseInt(event.target.value || "0", 10))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Label className="w-32">Square ends</Label>
              <Switch checked={preset.bar.squareEnds} onCheckedChange={(value) => onUpdate("bar.squareEnds", value)} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}