"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { useDisablePullToRefresh } from "@/lib/hooks/use-disable-pull-to-refresh";

import { Button } from "@/components/ui/button";

import {
  type MaskBounds,
  type MaskPoint,
  getReadingMaskPoint,
  getReadingMaskWindow,
} from "./reading-mask";

/**
 * A presentation aid for an already-authorized viewer, not an access boundary.
 * The document remains in the browser; this cannot prevent capture or copying.
 */
export function ConfidentialViewOverlay({
  navbarAbove = true,
  rotation = 0,
}: {
  navbarAbove?: boolean;
  rotation?: number;
}) {
  const maskRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const instructionsId = useId();
  const [revealed, setRevealed] = useState(false);
  const [bounds, setBounds] = useState<MaskBounds>({ width: 0, height: 0 });
  const [center, setCenter] = useState<MaskPoint>({ x: 0, y: 0 });
  useDisablePullToRefresh();

  const cover = useCallback(() => setRevealed(false), []);

  useEffect(() => {
    const mask = maskRef.current;
    if (!mask) return;
    const measure = () => {
      setBounds({ width: mask.clientWidth, height: mask.clientHeight });
      // Resize/rotation should never reveal a stale area of the document.
      cover();
    };
    const observer = new ResizeObserver(measure);
    observer.observe(mask);
    measure();
    window.addEventListener("blur", cover);
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") cover();
    };
    const onPointerOut = (event: PointerEvent) => {
      // A touch pointer emits pointerout after every completed tap; it has
      // not left the viewer. Window blur/visibility still cover on app exit.
      if (event.pointerType !== "touch" && !event.relatedTarget) cover();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") cover();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pointerout", onPointerOut);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      observer.disconnect();
      window.removeEventListener("blur", cover);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [cover, rotation]);

  useEffect(() => {
    if (!revealed) return;
    const move = (event: PointerEvent) => {
      const mask = maskRef.current;
      if (!mask) return;
      const rect = mask.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        cover();
        return;
      }
      // Keep the keyboard window steady while using the mask controls.
      if (
        event.target instanceof Element &&
        event.target.closest("[data-mask-controls]")
      )
        return;
      setCenter(
        getReadingMaskPoint(
          { x: event.clientX, y: event.clientY },
          rect,
          rotation,
        ),
      );
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [revealed, rotation, cover]);

  const aperture = getReadingMaskWindow(bounds, center);
  const right = aperture.left + aperture.width;
  const bottom = aperture.top + aperture.height;
  const opaque = "absolute bg-background";

  return (
    // The parent already establishes the viewer viewport below its navbar.
    // Keeping this local also allows native/pseudo-fullscreen and rotation.
    <div
      ref={maskRef}
      className="pointer-events-none absolute inset-0 z-40 overflow-hidden"
      data-confidential-reading-mask
      data-navbar-above={navbarAbove}
    >
      {!revealed ? (
        <div className={`${opaque} inset-0`} />
      ) : (
        <>
          <div
            className={opaque}
            style={{ left: 0, top: 0, right: 0, height: aperture.top }}
          />
          <div
            className={opaque}
            style={{ left: 0, top: bottom, right: 0, bottom: 0 }}
          />
          <div
            className={opaque}
            style={{
              left: 0,
              top: aperture.top,
              width: aperture.left,
              height: aperture.height,
            }}
          />
          <div
            className={opaque}
            style={{
              left: right,
              top: aperture.top,
              right: 0,
              height: aperture.height,
            }}
          />
        </>
      )}
      <div
        ref={windowRef}
        tabIndex={revealed ? 0 : -1}
        role="region"
        aria-label="Document reading window"
        aria-describedby={instructionsId}
        className="absolute rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        style={{
          left: aperture.left,
          top: aperture.top,
          width: aperture.width,
          height: aperture.height,
        }}
        onBlur={(event) => {
          if (
            event.relatedTarget &&
            !event.currentTarget.parentElement?.contains(event.relatedTarget)
          )
            cover();
        }}
        onKeyDown={(event) => {
          const moves: Record<string, MaskPoint> = {
            ArrowUp: { x: 0, y: -40 },
            ArrowDown: { x: 0, y: 40 },
            ArrowLeft: { x: -40, y: 0 },
            ArrowRight: { x: 40, y: 0 },
          };
          if (event.key === "Escape") {
            event.preventDefault();
            cover();
            toggleRef.current?.focus();
          } else if (moves[event.key]) {
            event.preventDefault();
            const delta = moves[event.key];
            setCenter((previous) => ({
              x: Math.max(0, Math.min(bounds.width, previous.x + delta.x)),
              y: Math.max(0, Math.min(bounds.height, previous.y + delta.y)),
            }));
          }
        }}
      />
      <div
        data-mask-controls
        className="pointer-events-auto absolute bottom-[max(1rem,env(safe-area-inset-bottom,0px))] left-1/2 flex w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 flex-col items-center gap-2 rounded-lg border border-border bg-background p-3 text-center text-foreground shadow-lg"
      >
        <p className="text-sm font-medium">Confidential reading mask</p>
        <p id={instructionsId} className="text-xs text-muted-foreground">
          Move your pointer or use Move up/down to read. Keyboard: use arrow
          keys in the reading window; Escape covers it. Screenshots and copying
          remain possible.
        </p>
        <Button
          ref={toggleRef}
          type="button"
          className="min-h-11"
          aria-pressed={revealed}
          onClick={() => {
            if (revealed) {
              cover();
              return;
            }
            setCenter({ x: bounds.width / 2, y: bounds.height / 3 });
            setRevealed(true);
            windowRef.current?.focus();
          }}
        >
          {revealed ? "Cover document" : "Start reading"}
        </Button>
        <div className="flex gap-2">
          {[-1, 1].map((direction) => (
            <Button
              key={direction}
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={!revealed}
              onClick={() =>
                setCenter((previous) => ({
                  ...previous,
                  y: Math.max(
                    0,
                    Math.min(bounds.height, previous.y + direction * 80),
                  ),
                }))
              }
            >
              {direction < 0 ? "Move up" : "Move down"}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
