import { useId, useState } from "react";

import { Plus, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const DRAFT_TEAM_BRAND_ID = "__draft_team_brand__";
type BrandOption = { id: string; name: string };

export function nextTeamBrandName(
  brands: readonly Pick<BrandOption, "name">[],
): string {
  const names = new Set(brands.map(({ name }) => name.trim().toLowerCase()));
  let suffix = 1;
  while (names.has(`brand ${suffix}`)) suffix++;
  return `Brand ${suffix}`;
}

type TeamBrandSwitcherProps = {
  brands: readonly BrandOption[];
  selectedBrandId: string | null;
  defaultBrandId: string | null;
  brandName: string;
  onBrandNameChange: (value: string) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onSetDefault: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  disabled?: boolean;
};

export function TeamBrandSwitcher({
  brands,
  selectedBrandId,
  defaultBrandId,
  brandName,
  onBrandNameChange,
  onSelect,
  onCreate,
  onSetDefault,
  onDelete,
  disabled = false,
}: TeamBrandSwitcherProps) {
  const id = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<"default" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = selectedBrandId ?? defaultBrandId ?? brands[0]?.id ?? "";
  const isDraft = selected === DRAFT_TEAM_BRAND_ID;
  const busy = disabled || pending !== null;
  const runAction = async (action: "default" | "delete") => {
    if (
      busy ||
      !selected ||
      (action === "default" && (isDraft || selected === defaultBrandId))
    )
      return;
    setPending(action);
    setError(null);
    try {
      await (action === "default" ? onSetDefault() : onDelete());
      if (action === "delete") setConfirmOpen(false);
    } catch {
      setError(
        `The brand could not be ${action === "default" ? "set as default" : "deleted"}. Please try again.`,
      );
    } finally {
      setPending(null);
    }
  };
  return (
    <section
      aria-label="Team brand selection"
      className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor={`${id}-select`}>Team brand</Label>
          <Select
            value={selected}
            disabled={busy}
            onValueChange={(value) => {
              if (!busy) {
                setError(null);
                onSelect(value);
              }
            }}
          >
            <SelectTrigger id={`${id}-select`}>
              <SelectValue placeholder="Choose a brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                  {brand.id === defaultBrandId ? " (default)" : ""}
                </SelectItem>
              ))}
              {isDraft && (
                <SelectItem value={DRAFT_TEAM_BRAND_ID}>
                  New brand · unsaved
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            if (!busy) {
              setError(null);
              onCreate();
            }
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          New brand
        </Button>
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={`${id}-name`}>Brand name</Label>
          {isDraft ? (
            <Badge variant="outline">Unsaved</Badge>
          ) : selected && selected === defaultBrandId ? (
            <Badge variant="secondary">Default</Badge>
          ) : null}
        </div>
        <Input
          id={`${id}-name`}
          value={brandName}
          disabled={busy}
          onChange={(event) => {
            if (!busy) onBrandNameChange(event.target.value);
          }}
          placeholder="Brand name"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || !selected || isDraft || selected === defaultBrandId}
          loading={pending === "default"}
          onClick={() => void runAction("default")}
        >
          <Star aria-hidden="true" className="h-4 w-4" />
          Set as default
        </Button>
        <Dialog
          open={confirmOpen}
          onOpenChange={(open) => {
            if (!busy) {
              setConfirmOpen(open);
              setError(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !selected}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              {isDraft ? "Discard draft" : "Delete brand"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {isDraft ? "Discard this draft?" : "Delete this brand?"}
              </DialogTitle>
              <DialogDescription>
                {isDraft
                  ? "Your unsaved branding changes will be discarded."
                  : `Delete “${brandName}”? This cannot be undone. Review the selected brand before continuing.`}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                loading={pending === "delete"}
                onClick={() => void runAction("delete")}
              >
                {isDraft ? "Discard draft" : "Delete brand"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {error && !confirmOpen && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        The default brand is inherited by links and rooms without their own
        branding. Save to apply changes to the brand name and appearance.
      </p>
    </section>
  );
}
