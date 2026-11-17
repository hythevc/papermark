import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import {
  isBrandImageSource,
  parseBrandMediaUrl,
  validateBrandImageFile,
} from "./branding-editor-utils";

function PreviewImageField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
}) {
  const id = useId();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reader = useRef<FileReader | null>(null);
  useEffect(() => {
    setUrl(value && /^https?:\/\//i.test(value) ? value : "");
    setError(null);
  }, [value]);
  useEffect(() => {
    const cancel = () => {
      const pending = reader.current;
      reader.current = null;
      pending?.abort();
    };
    if (disabled) cancel();
    return cancel;
  }, [disabled]);
  const replaceImage = (nextValue: string | null) => {
    if (disabled) return;
    const pending = reader.current;
    reader.current = null;
    pending?.abort();
    onChange(nextValue);
    setError(null);
  };
  const selectFile = (file: File | undefined) => {
    if (!file || disabled) return;
    const validation = validateBrandImageFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    reader.current?.abort();
    const next = new FileReader();
    reader.current = next;
    next.onerror = () => {
      if (reader.current === next)
        setError("The image could not be read. Choose it again.");
    };
    next.onload = () => {
      if (reader.current === next && typeof next.result === "string") {
        reader.current = null;
        onChange(next.result);
        setError(null);
      }
    };
    next.readAsDataURL(file);
  };
  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-file`}>{label}</Label>
      {isBrandImageSource(value) && (
        <img
          src={value}
          alt={`${label} preview`}
          className="max-h-32 max-w-full rounded-md border border-border object-contain"
        />
      )}
      <Input
        id={`${id}-file`}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/x-icon,image/vnd.microsoft.icon"
        disabled={disabled}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        onChange={(event) => {
          selectFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        Image files up to 2 MB. Selected files upload when you save branding.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label={`${label} URL`}
          type="url"
          value={url}
          placeholder="https://example.com/image.png"
          disabled={disabled}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || !url.trim()}
          onClick={() => {
            if (disabled) return;
            const parsed = parseBrandMediaUrl(url);
            if (!parsed) {
              setError("Enter a complete HTTP or HTTPS image URL.");
              return;
            }
            replaceImage(parsed);
          }}
        >
          Apply URL
        </Button>
      </div>
      {value && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => replaceImage(null)}
        >
          Remove {label.toLowerCase()}
        </Button>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

type BrandingLinkPreviewFormProps = {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  imageUrl: string | null;
  onImageChange: (value: string | null) => void;
  faviconUrl: string | null;
  onFaviconChange: (value: string | null) => void;
  inheritanceHint?: string;
  disabled?: boolean;
};

export function BrandingLinkPreviewForm({
  enabled,
  onEnabledChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  imageUrl,
  onImageChange,
  faviconUrl,
  onFaviconChange,
  inheritanceHint,
  disabled = false,
}: BrandingLinkPreviewFormProps) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label htmlFor={`${id}-enabled`}>Custom link preview</Label>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Choose how shared links appear in messaging and social apps.
          </p>
        </div>
        <Switch
          id={`${id}-enabled`}
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(value) => {
            if (!disabled) onEnabledChange(value);
          }}
        />
      </div>
      {inheritanceHint && (
        <p className="text-xs leading-5 text-muted-foreground">
          {inheritanceHint}
        </p>
      )}
      {enabled && (
        <fieldset disabled={disabled} className="min-w-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${id}-title`}>Preview title</Label>
            <Input
              id={`${id}-title`}
              value={title}
              disabled={disabled}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Your shared documents"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-description`}>Preview description</Label>
            <Textarea
              id={`${id}-description`}
              value={description}
              disabled={disabled}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="A short introduction to the materials"
              rows={3}
            />
          </div>
          <PreviewImageField
            label="Preview image"
            value={imageUrl}
            onChange={onImageChange}
            disabled={disabled}
          />
          <PreviewImageField
            label="Favicon"
            value={faviconUrl}
            onChange={onFaviconChange}
            disabled={disabled}
          />
        </fieldset>
      )}
    </div>
  );
}
