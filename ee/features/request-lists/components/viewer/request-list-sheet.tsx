import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ViewerUploadComponent } from "@/components/viewer-upload-component";

import { useViewerRequestList } from "../../lib/swr/use-viewer-request-list";
import type { ViewerRequestTask } from "../../lib/types";

function RequestTaskCard({
  task,
  readOnly,
  linkId,
  dataroomId,
  viewerId,
  update,
}: {
  task: ViewerRequestTask;
  readOnly: boolean;
  linkId: string;
  dataroomId: string;
  viewerId: string;
  update: (
    taskId: string,
    payload: { status?: "IN_PROGRESS" | "SUBMITTED"; comment?: string },
  ) => Promise<void>;
}) {
  const { t } = useTranslation("dataroom");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completed = task.status === "COMPLETED";

  async function save(status?: "IN_PROGRESS" | "SUBMITTED") {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await update(task.id, {
        status,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      setComment("");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to update request. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="space-y-4 rounded-lg border border-border bg-card p-4"
      aria-labelledby={`request-${task.id}`}
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3
            id={`request-${task.id}`}
            className="text-base font-semibold text-foreground"
          >
            {task.title}
          </h3>
          <span className="rounded bg-muted px-2 py-1 text-sm text-muted-foreground">
            {t(`requestList.status.${task.status}`, task.status)}
          </span>
        </div>
        {task.category && (
          <p className="mt-1 text-sm text-muted-foreground">{task.category}</p>
        )}
        {task.dueDate && (
          <p className="mt-2 text-sm text-muted-foreground">
            {t("requestList.due", {
              date: new Date(task.dueDate).toLocaleDateString(),
              defaultValue: "Due {{date}}",
            })}
          </p>
        )}
        {task.description && (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {task.description}
          </p>
        )}
      </div>
      {task.type === "UPLOAD" && !completed && !readOnly && (
        <ViewerUploadComponent
          viewerData={{ id: viewerId, linkId, dataroomId }}
          teamId="visitor-upload"
          folderId={task.uploadFolderId ?? undefined}
          taskId={task.id}
          onUploadSuccess={() => {
            void update(task.id, {});
          }}
        />
      )}
      {task.uploads.length > 0 && (
        <div>
          <h4 className="text-sm font-medium">
            {t("requestList.uploadsHeading", "Your files")}
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {task.uploads.map((upload) => (
              <li key={upload.id}>{upload.name}</li>
            ))}
          </ul>
        </div>
      )}
      {completed && (
        <p className="text-sm text-muted-foreground">
          {t("requestList.lockedByHost", "Marked completed by the host")}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor={`comment-${task.id}`}>
          {t("requestList.commentPlaceholderLocked", "Add a comment")}
        </Label>
        <Textarea
          id={`comment-${task.id}`}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={4000}
          disabled={saving || readOnly}
          rows={2}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="min-h-11"
          variant="outline"
          disabled={saving || readOnly || !comment.trim()}
          loading={saving}
          onClick={() => save()}
        >
          {t("requestList.submitComment", "Add comment")}
        </Button>
        {!completed && !readOnly && task.status === "OPEN" && (
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            variant="outline"
            disabled={saving || readOnly}
            onClick={() => save("IN_PROGRESS")}
          >
            {t("requestList.status.IN_PROGRESS", "In progress")}
          </Button>
        )}
        {!completed &&
          !readOnly &&
          task.status !== "SUBMITTED" &&
          task.type !== "UPLOAD" && (
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              disabled={saving || readOnly}
              onClick={() => save("SUBMITTED")}
            >
              {task.type === "ACKNOWLEDGE"
                ? "Acknowledge"
                : "Submit for review"}
            </Button>
          )}
      </div>
      {task.activities.length > 0 && (
        <details className="border-t border-border pt-3">
          <summary className="min-h-11 cursor-pointer text-sm font-medium">
            {t("requestList.activityHeading", "Activity")}
          </summary>
          <ul className="space-y-3 text-sm text-muted-foreground">
            {task.activities.map((activity) => (
              <li key={activity.id}>
                <span className="font-medium text-foreground">
                  {activity.actor === "You"
                    ? t("requestList.activity.you", "You")
                    : "Host"}
                </span>{" "}
                {activity.comment ||
                  (activity.toStatus
                    ? `set status to ${t(`requestList.status.${activity.toStatus}`, activity.toStatus)}`
                    : activity.type === "UPLOADED"
                      ? "uploaded a file"
                      : "updated the request")}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export function RequestListSheet({
  linkId,
  dataroomId,
  viewerId,
  isOpen,
  onOpenChange,
}: {
  linkId: string;
  dataroomId: string;
  viewId?: string;
  viewerId?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("dataroom");
  const { enabled, readOnly, tasks, teamId, error, loading, mutate, url } =
    useViewerRequestList({ linkId, dataroomId, viewerId });
  async function update(
    taskId: string,
    payload: { status?: "IN_PROGRESS" | "SUBMITTED"; comment?: string },
  ) {
    if (payload.status || payload.comment) {
      const response = await fetch(
        `/api/links/${encodeURIComponent(linkId)}/request-list`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataroomId, taskId, ...payload }),
        },
      );
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "Unable to update request.");
      }
    }
    await mutate();
  }
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl [&_[data-slot=sheet-close]]:h-11 [&_[data-slot=sheet-close]]:w-11">
        <SheetHeader>
          <SheetTitle>{t("requestList.title", "Request List")}</SheetTitle>
          <SheetDescription>
            {t(
              "requestList.summaryEmpty",
              "Requests assigned to you appear here.",
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {readOnly && (
            <p className="text-sm text-muted-foreground">
              This room is closed to changes. You can still review your requests
              and activity.
            </p>
          )}
          {loading && <p role="status">Loading requests…</p>}
          {error && (
            <div role="alert" className="space-y-3">
              <p>Unable to load requests. Check your access and try again.</p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => mutate()}
              >
                Try again
              </Button>
            </div>
          )}
          {!loading && !error && (!enabled || !tasks.length) && (
            <p className="text-sm text-muted-foreground">
              {t(
                "requestList.emptyDescription",
                "No requests are assigned to you right now.",
              )}
            </p>
          )}
          {!error &&
            teamId &&
            viewerId &&
            url &&
            tasks.map((task) => (
              <RequestTaskCard
                readOnly={readOnly}
                key={task.id}
                task={task}
                linkId={linkId}
                dataroomId={dataroomId}
                viewerId={viewerId}
                update={update}
              />
            ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
