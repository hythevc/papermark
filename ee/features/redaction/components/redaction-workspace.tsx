"use client";

import Link from "next/link";

import {
  FormEvent,
  PointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { useTeam } from "@/context/team-context";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MousePointer2Icon,
} from "lucide-react";
import useSWR, { useSWRConfig } from "swr";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  RedactionJobResponse,
  RedactionRegion,
  rectangleFromPoints,
  redactionCollectionUrl,
  redactionRequest,
  redactionStatusLabels,
  validateRegion,
} from "./redaction-client";
import { RedactionConfigDialog } from "./redaction-config-dialog";

type RegionCoordinates = Pick<RedactionRegion, "x" | "y" | "width" | "height">;
type DraftFields = Record<keyof RegionCoordinates, string>;
type DragSelection = {
  pointerId: number;
  bounds: DOMRect;
  start: { x: number; y: number };
  rectangle: RegionCoordinates;
};
const defaultDraft: DraftFields = {
  x: "10",
  y: "10",
  width: "20",
  height: "10",
};
const coordinateLabels: Record<keyof RegionCoordinates, string> = {
  x: "Left (%)",
  y: "Top (%)",
  width: "Width (%)",
  height: "Height (%)",
};

function rectangleStyle(region: RegionCoordinates) {
  return {
    left: `${region.x / 10}%`,
    top: `${region.y / 10}%`,
    width: `${region.width / 10}%`,
    height: `${region.height / 10}%`,
  };
}

export function RedactionWorkspace({
  documentId,
  documentName,
  jobId,
}: {
  documentId: string;
  documentName: string;
  jobId: string;
}) {
  const id = useId();
  const { currentTeam } = useTeam();
  const { mutate: mutateCache } = useSWRConfig();
  const collection = currentTeam
    ? redactionCollectionUrl(currentTeam.id, documentId)
    : null;
  const url = collection ? `${collection}/${encodeURIComponent(jobId)}` : null;
  const {
    data,
    error: loadError,
    isLoading,
    mutate,
  } = useSWR<RedactionJobResponse>(
    url,
    (key: string) => redactionRequest<RedactionJobResponse>(key),
    {
      refreshInterval: (result) =>
        result?.job.status === "APPLYING" ? 2500 : 0,
    },
  );
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<DraftFields>(defaultDraft);
  const [dirty, setDirty] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [selection, setSelection] = useState<DragSelection | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageAttempt, setImageAttempt] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newDraftOpen, setNewDraftOpen] = useState(false);
  const [revalidationPending, setRevalidationPending] = useState(false);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const editingAllowed = data?.job.status === "REVIEW";
  const applying = pending === "apply" || data?.job.status === "APPLYING";
  const busy = !!pending || applying;
  const readonly = !editingAllowed || busy;
  const activeRegions =
    data?.regions.filter((region) => region.status !== "DECLINED") ?? [];
  const pageRegions = activeRegions.filter(
    (region) => region.pageNumber === page,
  );
  const draftRectangle = Object.fromEntries(
    Object.entries(draft).map(([key, value]) => [
      key,
      value.trim() ? Number(value) * 10 : NaN,
    ]),
  ) as RegionCoordinates;
  const validDraft = validateRegion(draftRectangle);

  useEffect(() => {
    setPage(1);
    setDraft(defaultDraft);
    setDirty(false);
    setDrawing(false);
    setSelection(null);
    setImageLoaded(false);
    setImageFailed(false);
    setImageAttempt(0);
    setError(null);
    setConfirmOpen(false);
    setNewDraftOpen(false);
    setRevalidationPending(false);
  }, [jobId]);

  useEffect(() => {
    if (!dirty || pending === "apply") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  function reportError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorMessage.current?.focus());
  }

  function choosePage(next: number) {
    if (pending || !data || next < 1 || next > data.numPages || next === page)
      return;
    if (
      dirty &&
      !window.confirm("Discard the unsaved area before changing page?")
    )
      return;
    setPage(next);
    setDraft(defaultDraft);
    setDirty(false);
    setDrawing(false);
    setSelection(null);
    setImageLoaded(false);
    setImageFailed(false);
    setError(null);
  }

  function point(event: PointerEvent<HTMLDivElement>, bounds: DOMRect) {
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 1000,
      y: ((event.clientY - bounds.top) / bounds.height) * 1000,
    };
  }

  function startSelection(event: PointerEvent<HTMLDivElement>) {
    if (!drawing || readonly || !imageLoaded || event.button !== 0) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const start = point(event, bounds);
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelection({
      pointerId: event.pointerId,
      bounds,
      start,
      rectangle: rectangleFromPoints(start, start),
    });
  }

  function moveSelection(event: PointerEvent<HTMLDivElement>) {
    if (!selection || selection.pointerId !== event.pointerId) return;
    setSelection({
      ...selection,
      rectangle: rectangleFromPoints(
        selection.start,
        point(event, selection.bounds),
      ),
    });
  }

  function finishSelection(event: PointerEvent<HTMLDivElement>) {
    if (!selection || selection.pointerId !== event.pointerId) return;
    const rectangle = rectangleFromPoints(
      selection.start,
      point(event, selection.bounds),
    );
    setSelection(null);
    setDrawing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (rectangle.width < 1 || rectangle.height < 1) {
      reportError(
        "Draw an area with a visible width and height, or enter its position below.",
      );
      return;
    }
    const left = Number((rectangle.x / 10).toFixed(2));
    const top = Number((rectangle.y / 10).toFixed(2));
    setDraft({
      x: left.toFixed(2),
      y: top.toFixed(2),
      width: Math.min(
        Number((rectangle.width / 10).toFixed(2)),
        100 - left,
      ).toFixed(2),
      height: Math.min(
        Number((rectangle.height / 10).toFixed(2)),
        100 - top,
      ).toFixed(2),
    });
    setDirty(true);
    setError(null);
    setAnnouncement("Area selected. Review its position, then save it.");
  }

  async function saveRegion(event: FormEvent) {
    event.preventDefault();
    if (!url || readonly || !dirty) return;
    if (!validDraft) {
      reportError(
        "Enter an area inside the page. Its left plus width and top plus height must each be 100% or less.",
      );
      return;
    }
    if (activeRegions.length >= 200) {
      reportError(
        "This draft has 200 saved areas. Remove an area before adding another.",
      );
      return;
    }
    setPending("save");
    setError(null);
    try {
      const result = await redactionRequest<{ region: RedactionRegion }>(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          pageNumber: page,
          ...draftRectangle,
        }),
      });
      await mutate(
        (current) =>
          current
            ? { ...current, regions: [...current.regions, result.region] }
            : current,
        { revalidate: false },
      );
      setDirty(false);
      setDrawing(false);
      setAnnouncement(`Area saved on page ${page}.`);
    } catch (cause) {
      reportError(
        cause instanceof Error
          ? cause.message
          : "Unable to save this area. Try again.",
      );
    } finally {
      setPending(null);
    }
  }

  async function removeRegion(region: RedactionRegion) {
    if (!url || readonly) return;
    setPending(region.id);
    setError(null);
    try {
      await redactionRequest(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", regionId: region.id }),
      });
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                regions: current.regions.filter(
                  (item) => item.id !== region.id,
                ),
              }
            : current,
        { revalidate: false },
      );
      setAnnouncement(`Area removed from page ${region.pageNumber}.`);
    } catch (cause) {
      reportError(
        cause instanceof Error
          ? cause.message
          : "Unable to remove this area. Try again.",
      );
    } finally {
      setPending(null);
    }
  }

  async function apply() {
    if (!url || readonly || dirty || !activeRegions.length) return;
    setPending("apply");
    setError(null);
    try {
      const result = await redactionRequest<{
        versionId: string;
        jobId: string;
        revalidationPending?: boolean;
      }>(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply" }),
      });
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                job: {
                  ...current.job,
                  status: "APPLIED",
                  resultVersionId: result.versionId,
                  error: null,
                },
                regions: current.regions.map((region) => ({
                  ...region,
                  status: "APPLIED",
                })),
              }
            : current,
        { revalidate: false },
      );
      setConfirmOpen(false);
      setRevalidationPending(result.revalidationPending === true);
      setAnnouncement(
        "A new flattened PDF version was created. Review the output and your shared links.",
      );
      if (collection) void mutateCache(collection).catch(() => {});
      if (currentTeam) {
        const documentUrl = `/api/teams/${currentTeam.id}/documents/${documentId}`;
        void Promise.allSettled([
          mutateCache(documentUrl),
          mutateCache(`${documentUrl}/overview`),
        ]);
      }
    } catch (cause) {
      setConfirmOpen(false);
      reportError(
        cause instanceof Error
          ? cause.message
          : "Unable to apply these areas. Your saved selections are still available.",
      );
      void mutate().catch(() => {});
    } finally {
      setPending(null);
    }
  }

  const backLink = (
    <Link
      href={`/documents/${encodeURIComponent(documentId)}`}
      onClick={(event) => {
        if (
          dirty &&
          !window.confirm("Discard your unsaved area and leave this draft?")
        )
          event.preventDefault();
      }}
      className="inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeftIcon aria-hidden className="h-4 w-4" />
      Back to document
    </Link>
  );
  if (isLoading || !currentTeam)
    return (
      <div className="space-y-4 p-6">
        {backLink}
        <p role="status" className="text-sm text-muted-foreground">
          Loading redaction draft…
        </p>
      </div>
    );
  if (loadError || !data)
    return (
      <div className="space-y-4 p-6">
        {backLink}
        <div role="alert" className="space-y-3 rounded-lg border p-6">
          <p className="text-sm">
            {loadError?.message ?? "Unable to load this redaction draft."}
          </p>
          <Button
            variant="outline"
            onClick={() => mutate()}
            className="min-h-11"
          >
            Try again
          </Button>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 p-4 pb-10 sm:p-6 lg:p-8">
      {backLink}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="break-words text-2xl font-semibold">Redact PDF</h1>
          <p className="break-words text-sm text-muted-foreground">
            {documentName} ·{" "}
            {redactionStatusLabels[data.job.status] ?? data.job.status}
          </p>
        </div>
        <Button
          className="min-h-11"
          onClick={() => setConfirmOpen(true)}
          disabled={readonly || dirty || !activeRegions.length}
          loading={pending === "apply"}
        >
          {applying ? "Applying…" : "Review and apply"}
        </Button>
      </header>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {data.job.status === "APPLIED" ? (
        <div
          role="status"
          className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm"
        >
          <p className="font-medium">
            A new flattened PDF version was created.
          </p>
          <p>
            Open the document to review the result and check which version your
            shared links use. Original versions and existing copies remain
            available.
          </p>
        </div>
      ) : (
        <p className="rounded-lg border bg-muted/40 p-4 text-sm leading-relaxed">
          Select areas on the source preview, then save each area. Applying
          creates a flattened PDF of every page; its text will no longer be
          searchable or selectable. Original versions and copies remain.
        </p>
      )}
      {revalidationPending ? (
        <p role="status" className="rounded-lg border bg-muted/40 p-4 text-sm">
          The new PDF is saved. Shared pages could not be refreshed
          automatically; verify existing links and refresh them before sharing
          again.
        </p>
      ) : null}
      {applying ? (
        <p role="status" className="rounded-lg border p-4 text-sm">
          Applying saved areas may take a moment. Keep this page open until it
          finishes.
        </p>
      ) : null}
      {data.job.status === "FAILED" ? (
        <div
          role="alert"
          className="space-y-3 rounded-lg border border-destructive/30 p-4 text-sm"
        >
          <p>
            This redacted copy could not be completed. The previous primary
            version is unchanged. Your saved areas remain available for review;
            create a new draft from the current version to try again.
          </p>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => setNewDraftOpen(true)}
          >
            Create a new draft
          </Button>
        </div>
      ) : null}
      {error ? (
        <p
          ref={errorMessage}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {error}
        </p>
      ) : null}
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          className="min-w-0 space-y-4"
          aria-labelledby={`${id}-preview-title`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={`${id}-preview-title`} className="text-base font-semibold">
              Source preview
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label="Previous page"
                disabled={page <= 1 || !!pending}
                onClick={() => choosePage(page - 1)}
              >
                <ChevronLeftIcon aria-hidden className="h-4 w-4" />
              </Button>
              <Label htmlFor={`${id}-page`} className="sr-only">
                Preview page
              </Label>
              <select
                id={`${id}-page`}
                name="page"
                className="h-11 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={page}
                disabled={!!pending}
                onChange={(event) => choosePage(Number(event.target.value))}
              >
                {Array.from({ length: data.numPages }, (_, index) => (
                  <option key={index + 1} value={index + 1}>
                    Page {index + 1} of {data.numPages}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label="Next page"
                disabled={page >= data.numPages || !!pending}
                onClick={() => choosePage(page + 1)}
              >
                <ChevronRightIcon aria-hidden className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={drawing ? "secondary" : "outline"}
              disabled={readonly || !imageLoaded || activeRegions.length >= 200}
              aria-pressed={drawing}
              className="min-h-11"
              onClick={() => {
                setDrawing(!drawing);
                setSelection(null);
              }}
            >
              <MousePointer2Icon aria-hidden className="h-4 w-4" />
              {drawing ? "Cancel drawing" : "Draw an area"}
            </Button>
            <p className="text-sm text-muted-foreground">
              {drawing
                ? "Drag across the page. Press Escape to cancel."
                : "Use drawing or enter a position in the form."}
            </p>
          </div>
          {imageFailed ? (
            <div role="alert" className="space-y-3 rounded-lg border p-6">
              <p className="text-sm">
                Unable to load this source page. Try loading it again before
                selecting an area.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setImageFailed(false);
                  setImageLoaded(false);
                  setImageAttempt(imageAttempt + 1);
                }}
                className="min-h-11"
              >
                Reload page preview
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border bg-muted/50 p-2 sm:p-4">
              {!imageLoaded ? (
                <p
                  role="status"
                  className="p-4 text-center text-sm text-muted-foreground"
                >
                  Loading page preview…
                </p>
              ) : null}
              <div
                className={`relative mx-auto select-none bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${drawing ? "cursor-crosshair" : ""}`}
                style={{ touchAction: drawing ? "none" : "auto" }}
                role="group"
                aria-label={`Source page ${page}. Use the area form to make a keyboard selection.`}
                tabIndex={0}
                onPointerDown={startSelection}
                onPointerMove={moveSelection}
                onPointerUp={finishSelection}
                onPointerCancel={() => setSelection(null)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setDrawing(false);
                    setSelection(null);
                  }
                }}
              >
                {/* A same-origin authenticated PNG, not a public document URL. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`${page}-${imageAttempt}`}
                  src={`${url}/page/${page}?attempt=${imageAttempt}`}
                  width={1000}
                  height={1400}
                  alt={`Source PDF page ${page}; selected areas are overlaid. Use the position form for keyboard selection.`}
                  draggable={false}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setImageFailed(true);
                    setImageLoaded(false);
                  }}
                  className="block h-auto w-full"
                />
                {imageLoaded
                  ? pageRegions.map((region, index) => (
                      <div
                        key={region.id}
                        aria-hidden
                        className="pointer-events-none absolute border border-white bg-black"
                        style={rectangleStyle(region)}
                      >
                        <span className="absolute left-0 top-0 bg-black px-1 text-xs text-white">
                          {index + 1}
                        </span>
                      </div>
                    ))
                  : null}
                {imageLoaded && (selection || (dirty && validDraft)) ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute border-2 border-primary bg-primary/30"
                    style={rectangleStyle(
                      selection?.rectangle ?? draftRectangle,
                    )}
                  />
                ) : null}
              </div>
            </div>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">
            This preview overlays your selections on the source. Review the
            generated PDF after applying; saved selections alone do not change a
            shared file.
          </p>
        </section>
        <aside className="min-w-0 space-y-5" aria-label="Redaction areas">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2 className="text-base">Add an area on page {page}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={saveRegion}>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Positions are percentages from the top-left corner of the full
                  page. Width and height must stay within the page.
                </p>
                <fieldset
                  disabled={readonly}
                  className="grid grid-cols-2 gap-4"
                >
                  {(
                    Object.keys(coordinateLabels) as (keyof RegionCoordinates)[]
                  ).map((field) => (
                    <div key={field} className="space-y-2">
                      <Label htmlFor={`${id}-${field}`}>
                        {coordinateLabels[field]}
                      </Label>
                      <Input
                        id={`${id}-${field}`}
                        name={field}
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        required
                        value={draft[field]}
                        onChange={(event) => {
                          setDraft({ ...draft, [field]: event.target.value });
                          setDirty(true);
                        }}
                        autoComplete="off"
                        className="min-h-11"
                      />
                    </div>
                  ))}
                </fieldset>
                <Button
                  type="submit"
                  disabled={readonly || !dirty || activeRegions.length >= 200}
                  loading={pending === "save"}
                  className="min-h-11 w-full"
                >
                  Save area
                </Button>
                {dirty ? (
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <p className="text-muted-foreground">
                      This area is not saved yet.
                    </p>
                    <Button
                      variant="ghost"
                      type="button"
                      disabled={!!pending}
                      className="min-h-11"
                      onClick={() => {
                        setDirty(false);
                        setDraft(defaultDraft);
                        setDrawing(false);
                        setSelection(null);
                      }}
                    >
                      Discard
                    </Button>
                  </div>
                ) : null}
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2 className="text-base">Saved areas</h2>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {pageRegions.length} on this page · {activeRegions.length} of
                200 total
              </p>
            </CardHeader>
            <CardContent>
              {!pageRegions.length ? (
                <p className="text-sm text-muted-foreground">
                  No saved areas on page {page}.
                </p>
              ) : (
                <ol className="divide-y">
                  {pageRegions.map((region, index) => (
                    <li key={region.id} className="space-y-2 py-3 first:pt-0">
                      <p className="text-sm font-medium">Area {index + 1}</p>
                      <p className="text-sm text-muted-foreground">
                        Left {(region.x / 10).toFixed(1)}%, top{" "}
                        {(region.y / 10).toFixed(1)}% ·{" "}
                        {(region.width / 10).toFixed(1)}% wide ×{" "}
                        {(region.height / 10).toFixed(1)}% high
                      </p>
                      {editingAllowed ? (
                        <Button
                          variant="outline"
                          className="min-h-11"
                          disabled={readonly}
                          loading={pending === region.id}
                          onClick={() => removeRegion(region)}
                        >
                          Remove area {index + 1}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
      <Dialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (pending !== "apply") setConfirmOpen(next);
        }}
      >
        <DialogContent
          hideCloseButton={pending === "apply"}
          onEscapeKeyDown={(event) => {
            if (pending === "apply") event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (pending === "apply") event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              Apply {activeRegions.length} saved area
              {activeRegions.length === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription className="break-words">
              Create a new flattened PDF version of {documentName} with these
              selected areas removed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm leading-relaxed">
            <p>
              Review every source page before continuing. All pages will become
              images, so text will no longer be searchable or selectable.
            </p>
            <p>
              Original versions and existing copies remain. Review the result
              and the version shared by each link after applying.
            </p>
            <p className="text-muted-foreground">
              Processing is limited to 20 pages, 20 MiB input and 20 MiB output.
              Keep this page open until it finishes.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending === "apply"}
              onClick={() => setConfirmOpen(false)}
              className="min-h-11"
            >
              Keep reviewing
            </Button>
            <Button
              disabled={readonly || dirty || !activeRegions.length}
              loading={pending === "apply"}
              onClick={apply}
              className="min-h-11"
            >
              {pending === "apply" ? "Creating PDF…" : "Apply to new PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {newDraftOpen ? (
        <RedactionConfigDialog
          key={jobId}
          open={newDraftOpen}
          onOpenChange={setNewDraftOpen}
          documentId={documentId}
          documentName={documentName}
        />
      ) : null}
    </div>
  );
}
