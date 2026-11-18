import { ImageIcon, Link2 } from "lucide-react";

import { isBrandImageSource } from "./branding-editor-utils";

export function BrandingSocialPreviewReadonly({
  title,
  description,
  image,
  favicon,
}: {
  title?: string | null;
  description?: string | null;
  image?: string | null;
  favicon?: string | null;
}) {
  return (
    <figure
      className="w-full overflow-hidden rounded-xl border border-border bg-card text-card-foreground"
      aria-label="Social link preview"
    >
      {isBrandImageSource(image) ? (
        <img
          src={image}
          alt="Selected social preview"
          className="aspect-[1.91/1] w-full object-cover"
        />
      ) : (
        <div className="flex aspect-[1.91/1] flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
          <ImageIcon aria-hidden="true" className="h-8 w-8" />
          <span className="text-xs">No preview image selected</span>
        </div>
      )}
      <figcaption className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isBrandImageSource(favicon) ? (
            <img src={favicon} alt="" className="h-4 w-4 object-contain" />
          ) : (
            <Link2 aria-hidden="true" className="h-4 w-4" />
          )}
          Shared link preview
        </div>
        <p className="break-words font-semibold">
          {title?.trim() || "Your link title"}
        </p>
        <p className="break-words text-sm text-muted-foreground">
          {description?.trim() ||
            "A short description helps people understand what they are opening."}
        </p>
        <p className="pt-2 text-xs text-muted-foreground">
          Appearance varies by messaging and social platform.
        </p>
      </figcaption>
    </figure>
  );
}
