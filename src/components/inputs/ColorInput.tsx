import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rgbaToHexGuess } from "@/utils/color";

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ColorInput({ label, value, onChange, disabled }: ColorInputProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="w-32">{label}</Label>
      <Input
        type="color"
        value={rgbaToHexGuess(value)}
        onChange={(event) => onChange(event.target.value)}
        className="w-12 h-9 p-1"
        disabled={disabled}
      />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex-1"
        disabled={disabled}
      />
    </div>
  );
}