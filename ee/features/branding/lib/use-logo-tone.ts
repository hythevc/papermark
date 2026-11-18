"use client";
import { type SyntheticEvent, useEffect, useState } from "react";

export type LogoTone = "light" | "dark";
export function logoToneFromPixels(pixels: Uint8ClampedArray): LogoTone {
  let brightness = 0,
    weight = 0;
  for (let n = 0; n < pixels.length; n += 4) {
    const alpha = pixels[n + 3] / 255;
    if (alpha < 0.05) continue;
    brightness +=
      (0.2126 * pixels[n] + 0.7152 * pixels[n + 1] + 0.0722 * pixels[n + 2]) *
      alpha;
    weight += alpha;
  }
  return weight && brightness / weight > 170 ? "light" : "dark";
}
export function useLogoTone(src: string) {
  const [tone, setTone] = useState<LogoTone>("dark");
  useEffect(() => setTone("dark"), [src]);
  const onLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 32, 32);
      setTone(logoToneFromPixels(ctx.getImageData(0, 0, 32, 32).data));
    } catch {
      setTone("dark");
    }
  };
  return {
    tone,
    imgProps: {
      crossOrigin: "anonymous" as const,
      onLoad,
      onError: () => setTone("dark"),
    },
  };
}
