import { useId } from "react";

import type {
  DataroomLayoutCardId,
  DataroomViewerLayoutPreset,
} from "@/ee/features/branding/lib/dataroom-viewer-layout";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const presets: {
  id: DataroomLayoutCardId;
  label: string;
  description: string;
}[] = [
  {
    id: "STANDARD",
    label: "Standard",
    description: "Cards with folder navigation",
  },
  {
    id: "STRICT",
    label: "Strict",
    description: "A compact list without a banner",
  },
  {
    id: "MODERN",
    label: "Modern",
    description: "A compact list with a split header",
  },
  {
    id: "NOTION",
    label: "Notion",
    description: "A grid with an editorial header",
  },
];

export function DataroomLayoutPresetCards({
  selectedPreset,
  onSelect,
  disabled = false,
}: {
  selectedPreset: DataroomViewerLayoutPreset;
  onSelect: (value: DataroomLayoutCardId) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <RadioGroup
      value={selectedPreset}
      aria-label="Data room layout preset"
      disabled={disabled}
      onValueChange={(value) => {
        if (!disabled) {
          const preset = presets.find((item) => item.id === value);
          if (preset) onSelect(preset.id);
        }
      }}
      className="grid grid-cols-2 gap-3"
    >
      {presets.map((preset) => (
        <Label
          key={preset.id}
          htmlFor={`${id}-${preset.id}`}
          className={`flex min-w-0 cursor-pointer flex-col gap-3 rounded-lg border p-3 ${selectedPreset === preset.id ? "border-primary bg-primary/5" : "border-border bg-card"} ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-primary/60"}`}
        >
          <div
            aria-hidden="true"
            className="flex h-16 overflow-hidden rounded-md border border-border bg-background"
          >
            {preset.id === "STANDARD" && (
              <span className="w-1/4 border-r border-border bg-muted" />
            )}
            <span className="flex flex-1 flex-col gap-1 p-2">
              <span
                className={`${preset.id === "STRICT" ? "h-1" : "h-4"} rounded-sm bg-primary/20`}
              />
              <span
                className={`grid flex-1 gap-1 ${preset.id === "NOTION" ? "grid-cols-3" : "grid-cols-1"}`}
              >
                {[1, 2, 3].map((item) => (
                  <span key={item} className="rounded-sm bg-muted" />
                ))}
              </span>
            </span>
          </div>
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{preset.label}</span>
            <RadioGroupItem
              id={`${id}-${preset.id}`}
              value={preset.id}
              disabled={disabled}
            />
          </span>
          <span className="text-xs font-normal leading-5 text-muted-foreground">
            {preset.description}
          </span>
        </Label>
      ))}
    </RadioGroup>
  );
}
