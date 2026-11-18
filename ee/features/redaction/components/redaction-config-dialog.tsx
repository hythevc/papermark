"use client";

import { useRouter } from "next/router";

import { useState } from "react";

import { useTeam } from "@/context/team-context";
import { useSWRConfig } from "swr";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { redactionCollectionUrl, redactionRequest } from "./redaction-client";

export function RedactionConfigDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
}) {
  const router = useRouter();
  const { currentTeam } = useTeam();
  const { mutate } = useSWRConfig();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  async function start() {
    if (pending || !currentTeam) return;
    setPending(true);
    setError(null);
    try {
      let jobId = createdJobId;
      if (!jobId) {
        const url = redactionCollectionUrl(currentTeam.id, documentId);
        const result = await redactionRequest<{ id: string }>(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        jobId = result.id;
        setCreatedJobId(jobId);
        void mutate(url).catch(() => {});
      }
      const navigated = await router.push(
        `/documents/${encodeURIComponent(documentId)}/redactions/${encodeURIComponent(jobId)}`,
      );
      if (!navigated)
        throw new Error(
          "Your draft was created. Select Open draft to continue.",
        );
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to start a redaction draft. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <DialogContent
        hideCloseButton={pending}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Redact a PDF</DialogTitle>
          <DialogDescription className="break-words">
            Select areas to remove from {documentName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            Create a manual draft, review every page, then apply your saved
            selections to a new flattened PDF. There is no automatic text
            detection.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              PDFs up to 20 pages and 20 MiB, with a 20 MiB output limit. Save
              up to 200 areas per draft.
            </li>
            <li>
              The new PDF contains all pages as images; text will no longer be
              searchable or selectable.
            </li>
            <li>
              Original versions and existing copies remain. Review which version
              your links share after applying.
            </li>
          </ul>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="min-h-11"
          >
            Cancel
          </Button>
          <Button
            onClick={start}
            disabled={!currentTeam || pending}
            loading={pending}
            className="min-h-11"
          >
            {pending
              ? "Preparing draft…"
              : createdJobId
                ? "Open draft"
                : "Create manual draft"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
