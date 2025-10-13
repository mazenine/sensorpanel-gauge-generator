import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rgbaToHexGuess } from "@/utils/color";
import type { GradientStop } from "@/types";

interface GradientEditorProps {
  title: string;
  stops: GradientStop[];
  onChange: (stops: GradientStop[]) => void;
  disabled?: boolean;
}

export function GradientEditor({ title, stops, onChange, disabled }: GradientEditorProps) {
  const updateStop = (index: number, patch: Partial<GradientStop>) => {
    const next = stops.map((stop, idx) => (idx === index ? { ...stop, ...patch } : stop));
    onChange(next);
  };

  return (
    <Card className="mt-2 bg-neutral-850 border-neutral-800">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stops.map((stop, index) => (
          <div key={index} className="grid grid-cols-5 items-center gap-2">
            <Label className="col-span-2">Stop {index + 1}</Label>
            <Input
              type="color"
              value={rgbaToHexGuess(stop.color)}
              onChange={(event) => updateStop(index, { color: event.target.value })}
              className="w-12 h-9 p-1"
              disabled={disabled}
            />
            <Input
              value={stop.color}
              onChange={(event) => updateStop(index, { color: event.target.value })}
              className="col-span-2"
              disabled={disabled}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}