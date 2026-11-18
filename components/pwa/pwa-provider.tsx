"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { isPwaApplicationOrigin } from "@/lib/pwa";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type PwaState = {
  eligible: boolean;
  installed: boolean;
  canPrompt: boolean;
  prompting: boolean;
  status: string;
  requestInstall: () => Promise<void>;
};
const PwaContext = createContext<PwaState>({
  eligible: false,
  installed: false,
  canPrompt: false,
  prompting: false,
  status: "",
  requestInstall: async () => {},
});

export function PwaProvider({ children }: { children: ReactNode }) {
  const [eligible, setEligible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [ready, setReady] = useState(false);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [prompting, setPrompting] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (
      window.parent !== window ||
      !window.isSecureContext ||
      !isPwaApplicationOrigin(window.location.origin)
    )
      return;
    setEligible(true);
    const standalone = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () =>
      setInstalled(
        standalone.matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone ===
            true,
      );
    updateInstalled();
    const beforeInstall = (event: Event) => {
      const candidate = event as Partial<InstallPromptEvent>;
      if (typeof candidate.prompt !== "function" || !candidate.userChoice)
        return;
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const appInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setStatus(
        "Roomline was installed. Open it from your home screen or app launcher.",
      );
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);
    standalone.addEventListener("change", updateInstalled);
    let active = true;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          if (active) setReady(true);
        })
        .catch(() => {
          if (active)
            setStatus(
              "Installation could not be prepared. Reconnect and reload this page, or use Roomline in your browser.",
            );
        });
    } else {
      setStatus(
        "This browser does not support Roomline installation. You can keep using the web app.",
      );
    }
    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
      standalone.removeEventListener("change", updateInstalled);
    };
  }, []);

  const requestInstall = useCallback(async () => {
    if (!promptEvent || prompting || !ready || installed) return;
    setPrompting(true);
    setStatus("");
    try {
      await promptEvent.prompt();
      const result = await promptEvent.userChoice;
      setStatus(
        result.outcome === "accepted"
          ? "Installation requested. Follow your browser’s instructions to finish."
          : "Installation dismissed. You can install later from your browser’s menu.",
      );
    } catch {
      setStatus(
        "Installation could not start. Try your browser’s install menu or reload this page.",
      );
    } finally {
      setPromptEvent(null);
      setPrompting(false);
    }
  }, [promptEvent, prompting, ready, installed]);

  return (
    <PwaContext.Provider
      value={{
        eligible,
        installed,
        canPrompt: Boolean(ready && promptEvent && !installed),
        prompting,
        status,
        requestInstall,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwaInstall() {
  return useContext(PwaContext);
}
