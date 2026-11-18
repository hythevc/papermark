import { useCallback, useEffect, useId, useRef, useState } from "react";

import { Monitor, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";

import { getBrandingPreviewPath } from "./branding-editor-utils";

export function BrandingPreviewChrome({
  name,
  basePath,
  urlLabel,
  params,
}: {
  name: string;
  basePath: string;
  urlLabel: string;
  params: Record<string, string>;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latestParams = useRef(params);
  const [mobile, setMobile] = useState(false);
  const id = useId();
  const path = getBrandingPreviewPath(basePath);
  const sendParams = useCallback(() => {
    if (!path) return;
    frame.current?.contentWindow?.postMessage(
      { type: "roomline:branding-preview", params: latestParams.current },
      window.location.origin,
    );
  }, [path]);
  useEffect(() => {
    latestParams.current = params;
    sendParams();
  }, [params, sendParams]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === "roomline:branding-preview-ready"
      )
        sendParams();
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [sendParams]);
  return (
    <section
      className="flex h-full min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card"
      aria-label={`${name.replaceAll("-", " ")} preview`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/50 px-3 py-2">
        <span
          className="min-w-0 truncate text-xs text-muted-foreground"
          title={urlLabel}
        >
          {urlLabel}
        </span>
        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Preview width"
        >
          <Button
            type="button"
            variant={mobile ? "ghost" : "secondary"}
            size="icon"
            aria-label="Desktop preview"
            aria-pressed={!mobile}
            onClick={() => setMobile(false)}
          >
            <Monitor aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={mobile ? "secondary" : "ghost"}
            size="icon"
            aria-label="Mobile-width web preview"
            aria-pressed={mobile}
            onClick={() => setMobile(true)}
          >
            <Smartphone aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p
        id={`${id}-note`}
        className="border-b border-border px-3 py-2 text-xs text-muted-foreground"
      >
        Live appearance preview. Save branding to publish your changes.
      </p>
      <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-muted/30">
        {path ? (
          <iframe
            key={path}
            ref={frame}
            name={name}
            src={path}
            title={`${name.replaceAll("-", " ")} branding preview`}
            aria-describedby={`${id}-note`}
            referrerPolicy="same-origin"
            onLoad={sendParams}
            className={`min-h-[32rem] border-0 bg-background ${mobile ? "w-full max-w-[390px]" : "w-full"}`}
          />
        ) : (
          <p role="alert" className="p-6 text-sm text-destructive">
            This preview path is not supported.
          </p>
        )}
      </div>
    </section>
  );
}
