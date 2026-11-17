"use client";

import { useState } from "react";

import { ScanEyeIcon } from "lucide-react";

import { useFeatureFlags } from "@/lib/hooks/use-feature-flags";

import { Button } from "@/components/ui/button";

import { RedactionConfigDialog } from "./redaction-config-dialog";

export function RedactionLauncher({
  documentId,
  documentName,
  documentType,
}: {
  documentId: string;
  documentName: string;
  documentType: string;
}) {
  const [open, setOpen] = useState(false);
  const { isFeatureEnabled } = useFeatureFlags();
  if (documentType !== "pdf" || !isFeatureEnabled("redaction")) return null;

  return (
    <>
      <Button
        variant="outline"
        className="min-h-11 whitespace-nowrap"
        onClick={() => setOpen(true)}
      >
        <ScanEyeIcon aria-hidden className="h-4 w-4" />
        Redact PDF
      </Button>
      {open ? (
        <RedactionConfigDialog
          open={open}
          onOpenChange={setOpen}
          documentId={documentId}
          documentName={documentName}
        />
      ) : null}
    </>
  );
}
