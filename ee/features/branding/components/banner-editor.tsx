import { type ReactNode, useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { parseBrandMediaUrl } from "./branding-editor-utils";

type BannerEditorProps = {
  banner: string | null;
  setBanner: (value: string | null) => void;
  setBannerBlobUrl: (value: string | null) => void;
  dropZone: ReactNode;
  sizeHint?: string;
  defaultBannerImage?: string;
  onUrlApplied?: () => void;
  disabled?: boolean;
};

export function BannerEditor({
  banner,
  setBanner,
  setBannerBlobUrl,
  dropZone,
  sizeHint,
  defaultBannerImage,
  onUrlApplied,
  disabled = false,
}: BannerEditorProps) {
  const id = useId();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setUrl(banner && /^https?:\/\//i.test(banner) ? banner : "");
    setError(null);
  }, [banner]);
  const replaceBanner = (value: string | null) => {
    if (disabled) return;
    setBannerBlobUrl(null);
    setBanner(value);
    setError(null);
  };
  const applyUrl = () => {
    if (disabled) return;
    const parsed = parseBrandMediaUrl(url);
    if (!parsed) {
      setError("Enter a complete HTTP or HTTPS image, video, or YouTube URL.");
      return;
    }
    replaceBanner(parsed);
    onUrlApplied?.();
  };
  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-3"
      onDropCapture={(event) => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onClickCapture={(event) => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <legend className="mb-3 text-sm font-medium">
        Banner{" "}
        <span className="font-normal text-muted-foreground">{sizeHint}</span>
      </legend>
      {dropZone}
      <div className="space-y-2">
        <Label htmlFor={`${id}-url`}>Or use a media URL</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`${id}-url`}
            type="url"
            value={url}
            disabled={disabled}
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            placeholder="https://example.com/banner.jpg"
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || !url.trim()}
            onClick={applyUrl}
          >
            Apply URL
          </Button>
        </div>
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          Changes appear in the preview. Save branding to apply them to
          visitors.
        </p>
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="text-xs text-destructive"
          >
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {defaultBannerImage && banner !== defaultBannerImage && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => replaceBanner(defaultBannerImage)}
          >
            Use default banner
          </Button>
        )}
        {banner && banner !== "no-banner" && banner !== defaultBannerImage && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => replaceBanner(null)}
          >
            Clear custom banner
          </Button>
        )}
      </div>
    </fieldset>
  );
}
