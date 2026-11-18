"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

import { usePwaInstall } from "./pwa-provider";

export function PwaInstallButton() {
  const { canPrompt, prompting, installed, status, requestInstall } =
    usePwaInstall();
  return (
    <div className="space-y-3">
      {canPrompt && (
        <Button
          type="button"
          size="lg"
          loading={prompting}
          onClick={() => void requestInstall()}
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Install Roomline
        </Button>
      )}
      <p
        role="status"
        aria-live="polite"
        className="max-w-prose text-sm text-muted-foreground"
      >
        {status ||
          (installed
            ? "You are using the installed Roomline app."
            : canPrompt
              ? "Your browser supports installing Roomline on this device."
              : "If an install button is not shown, follow the browser steps below. Installation options vary by browser.")}
      </p>
    </div>
  );
}
