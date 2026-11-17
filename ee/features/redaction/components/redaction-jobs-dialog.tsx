"use client";

import Link from "next/link";

import { useTeam } from "@/context/team-context";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  RedactionJobSummary,
  redactionCollectionUrl,
  redactionRequest,
  redactionStatusLabels,
} from "./redaction-client";

export function RedactionJobsDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  onStartNew,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  onStartNew: () => void;
}) {
  const { currentTeam } = useTeam();
  const url =
    open && currentTeam
      ? redactionCollectionUrl(currentTeam.id, documentId)
      : null;
  const { data, error, isLoading, mutate } = useSWR<{
    jobs: RedactionJobSummary[];
  }>(
    url,
    (key: string) => redactionRequest<{ jobs: RedactionJobSummary[] }>(key),
    {
      refreshInterval: (result) =>
        result?.jobs.some((job) =>
          ["PENDING", "DETECTING", "APPLYING"].includes(job.status),
        )
          ? 2500
          : 0,
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Redaction drafts</DialogTitle>
          <DialogDescription className="break-words">
            Review drafts and applied redactions for {documentName}.
          </DialogDescription>
        </DialogHeader>
        {isLoading || !currentTeam ? (
          <p role="status" className="py-6 text-sm text-muted-foreground">
            Loading redaction drafts…
          </p>
        ) : error ? (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-destructive">{error.message}</p>
            <Button
              variant="outline"
              onClick={() => mutate()}
              className="min-h-11"
            >
              Try again
            </Button>
          </div>
        ) : !data?.jobs.length ? (
          <div className="rounded-lg border border-dashed p-6 text-sm">
            <p className="font-medium">No redaction drafts yet</p>
            <p className="mt-2 text-muted-foreground">
              Start a manual draft to select the parts of a PDF you want to
              remove.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data.jobs.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {redactionStatusLabels[job.status] ?? job.status}
                  </p>
                  <time
                    className="mt-1 block text-muted-foreground"
                    dateTime={job.createdAt}
                  >
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(job.createdAt))}
                  </time>
                </div>
                <Button variant="outline" asChild className="min-h-11">
                  <Link
                    href={`/documents/${encodeURIComponent(documentId)}/redactions/${encodeURIComponent(job.id)}`}
                    onClick={() => onOpenChange(false)}
                  >
                    {job.status === "APPLIED"
                      ? "View applied draft"
                      : "Open draft"}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="min-h-11"
          >
            Close
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onStartNew();
            }}
            disabled={!currentTeam}
            className="min-h-11"
          >
            New manual draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
