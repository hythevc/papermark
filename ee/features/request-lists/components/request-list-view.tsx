"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";

import { useTeam } from "@/context/team-context";
import { ClipboardListIcon, PlusIcon } from "lucide-react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import type { AdminRequestListResponse, AdminRequestTask } from "../lib/admin";
import {
  createTaskSchema,
  taskStatusSchema,
  taskTypeSchema,
  updateTaskSchema,
} from "../lib/schemas";
import type { TaskAssignmentInput } from "../lib/schemas";

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Awaiting review",
  COMPLETED: "Completed",
};
const typeLabels: Record<string, string> = {
  TODO: "To do",
  UPLOAD: "Upload files",
  ACKNOWLEDGE: "Acknowledge",
};
const selectClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok)
    throw new Error(
      body?.error ?? body?.message ?? "Unable to load the request list.",
    );
  return body as T;
}

function otherAssignments(task?: AdminRequestTask): TaskAssignmentInput[] {
  return (task?.assignments ?? []).flatMap<TaskAssignmentInput>(
    (assignment) => {
      if (assignment.viewerId) return [{ viewerId: assignment.viewerId }];
      if (assignment.groupId) return [{ groupId: assignment.groupId }];
      if (assignment.linkId) return [{ linkId: assignment.linkId }];
      return [];
    },
  );
}

function TaskEditor({
  task,
  pending,
  onSave,
  onCancel,
}: {
  task?: AdminRequestTask;
  pending: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [type, setType] = useState(task?.type ?? "TODO");
  const [status, setStatus] = useState(task?.status ?? "OPEN");
  const [category, setCategory] = useState(task?.category ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const [emails, setEmails] = useState(
    task?.assignments
      .flatMap((assignment) => (assignment.email ? [assignment.email] : []))
      .join("\n") ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const preservedTargets = otherAssignments(task);
  const dirty =
    title !== (task?.title ?? "") ||
    description !== (task?.description ?? "") ||
    type !== (task?.type ?? "TODO") ||
    status !== (task?.status ?? "OPEN") ||
    category !== (task?.category ?? "") ||
    dueDate !== (task?.dueDate?.slice(0, 10) ?? "") ||
    emails !==
      (task?.assignments
        .flatMap((assignment) => (assignment.email ? [assignment.email] : []))
        .join("\n") ?? "");

  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorMessage.current?.focus());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    const assignments = [
      ...preservedTargets,
      ...Array.from(
        new Set(
          emails
            .split(/[\s,;]+/)
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean),
        ),
      ).map((email) => ({ email })),
    ];
    const fields = {
      title,
      description: description.trim() || null,
      type,
      category: category.trim() || null,
      dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : null,
      assignments,
    };
    const result = task
      ? updateTaskSchema.safeParse({ ...fields, taskId: task.id, status })
      : createTaskSchema.safeParse(fields);
    if (!result.success) {
      showError(
        result.error.issues[0]?.message ?? "Check the request details.",
      );
      return;
    }
    try {
      await onSave(result.data);
    } catch (cause) {
      showError(
        cause instanceof Error
          ? cause.message
          : "Unable to save this request. Try again.",
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h4
            ref={heading}
            tabIndex={-1}
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {task ? "Edit request" : "New request"}
          </h4>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={submit}
          className="space-y-5"
          aria-describedby={error ? `${id}-error` : undefined}
        >
          <fieldset disabled={pending} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor={`${id}-title`}>Request title</Label>
              <Input
                id={`${id}-title`}
                name="title"
                autoComplete="off"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={255}
                required
                className="min-h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-description`}>
                Instructions{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id={`${id}-description`}
                name="description"
                autoComplete="off"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={10000}
                rows={3}
                placeholder="Describe what is needed and what a complete response includes."
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${id}-type`}>Response type</Label>
                <select
                  id={`${id}-type`}
                  name="type"
                  className={selectClass}
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  {taskTypeSchema.options.map((value) => (
                    <option key={value} value={value}>
                      {typeLabels[value]}
                    </option>
                  ))}
                </select>
              </div>
              {task ? (
                <div className="space-y-2">
                  <Label htmlFor={`${id}-status`}>Status</Label>
                  <select
                    id={`${id}-status`}
                    name="status"
                    className={selectClass}
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {taskStatusSchema.options.map((value) => (
                      <option key={value} value={value}>
                        {statusLabels[value]}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor={`${id}-category`}>
                  Category{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id={`${id}-category`}
                  name="category"
                  autoComplete="off"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  maxLength={120}
                  placeholder="Financial, legal, product…"
                  className="min-h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${id}-due`}>
                  Due date{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Input
                  id={`${id}-due`}
                  name="dueDate"
                  autoComplete="off"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="min-h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-emails`}>
                Assign by email{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id={`${id}-emails`}
                name="assigneeEmails"
                autoComplete="off"
                value={emails}
                onChange={(event) => setEmails(event.target.value)}
                rows={2}
                placeholder="Add one email address per line"
                aria-describedby={`${id}-assignment-help`}
                autoCapitalize="none"
                spellCheck={false}
              />
              <p
                id={`${id}-assignment-help`}
                className="text-sm text-muted-foreground"
              >
                Assigned visitors must verify their email to respond. No
                invitation email is sent from this form.
                {preservedTargets.length > 0
                  ? ` ${preservedTargets.length} existing visitor, group, or link assignment${preservedTargets.length === 1 ? " is" : "s are"} also retained.`
                  : ""}
              </p>
            </div>
          </fieldset>
          {error ? (
            <p
              id={`${id}-error`}
              ref={errorMessage}
              tabIndex={-1}
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={pending}
              loading={pending}
              className="min-h-11"
            >
              {task ? "Save changes" : "Create request"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm("Discard your unsaved request changes?")
                )
                  onCancel();
              }}
              className="min-h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function RequestListView({ dataroomId }: { dataroomId: string }) {
  const team = useTeam();
  const teamId = team?.currentTeam?.id;
  const url = teamId
    ? `/api/teams/${teamId}/datarooms/${dataroomId}/request-list`
    : null;
  const { data, error, isLoading, mutate } = useSWR<AdminRequestListResponse>(
    url,
    (key: string) => request<AdminRequestListResponse>(key),
  );
  const [editor, setEditor] = useState<AdminRequestTask | "new" | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const addButton = useRef<HTMLButtonElement>(null);

  async function save(body: Record<string, unknown>) {
    if (!url || pending) return;
    setPending("editor");
    setActionError(null);
    try {
      const result = await request<{ task: AdminRequestTask }>(url, {
        method: editor === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                tasks:
                  editor === "new"
                    ? [...current.tasks, result.task]
                    : current.tasks.map((task) =>
                        task.id === result.task.id ? result.task : task,
                      ),
              }
            : current,
        { revalidate: false },
      );
      setEditor(null);
      setAnnouncement(
        editor === "new" ? "Request created." : "Request updated.",
      );
      requestAnimationFrame(() => addButton.current?.focus());
    } finally {
      setPending(null);
    }
  }

  async function changeTask(
    task: AdminRequestTask,
    method: "PATCH" | "DELETE",
  ) {
    if (!url || pending) return;
    if (
      method === "DELETE" &&
      !window.confirm(
        `Delete “${task.title}”? Its assignments and activity will be removed. Uploaded files will stay in the data room.`,
      )
    )
      return;
    setPending(task.id);
    setActionError(null);
    try {
      const result = await request<{ task: AdminRequestTask } | null>(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          ...(method === "PATCH" && {
            status: task.status === "COMPLETED" ? "OPEN" : "COMPLETED",
          }),
        }),
      });
      await mutate(
        (current) =>
          current
            ? {
                ...current,
                tasks:
                  method === "DELETE"
                    ? current.tasks.filter((item) => item.id !== task.id)
                    : current.tasks.map((item) =>
                        item.id === task.id && result ? result.task : item,
                      ),
              }
            : current,
        { revalidate: false },
      );
      setAnnouncement(
        method === "DELETE" ? "Request deleted." : "Request status updated.",
      );
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "Unable to update this request. Try again.",
      );
    } finally {
      setPending(null);
    }
  }

  if (isLoading || !teamId)
    return (
      <div
        role="status"
        className="rounded-lg border p-6 text-sm text-muted-foreground"
      >
        Loading requests…
      </div>
    );
  if (error || !data)
    return (
      <div role="alert" className="space-y-3 rounded-lg border p-6">
        <p className="text-sm">
          {error?.message ?? "Unable to load requests."}
        </p>
        <Button variant="outline" onClick={() => mutate()} className="min-h-11">
          Try again
        </Button>
      </div>
    );

  const completed = data.tasks.filter(
    (task) => task.status === "COMPLETED",
  ).length;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data.tasks.length} request{data.tasks.length === 1 ? "" : "s"} ·{" "}
          {completed} completed
        </p>
        {data.canWrite && !editor ? (
          <Button
            ref={addButton}
            onClick={() => setEditor("new")}
            className="min-h-11 gap-2"
          >
            <PlusIcon aria-hidden className="h-4 w-4" />
            New request
          </Button>
        ) : null}
      </div>
      {!data.requestListEnabled ? (
        <p className="rounded-lg border bg-muted/40 p-4 text-sm">
          Requests are hidden from visitors. Enable the request list in this
          data room’s settings when it is ready.
        </p>
      ) : null}
      {!data.canWrite ? (
        <p className="rounded-lg border bg-muted/40 p-4 text-sm">
          This request list is read-only. Changes require room editing
          permission and an unfrozen data room.
        </p>
      ) : null}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {actionError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive"
        >
          {actionError}
        </p>
      ) : null}
      {editor && data.canWrite ? (
        <TaskEditor
          key={editor === "new" ? "new" : editor.id}
          task={editor === "new" ? undefined : editor}
          pending={pending === "editor"}
          onSave={save}
          onCancel={() => {
            setEditor(null);
            addButton.current?.focus();
          }}
        />
      ) : null}
      {!data.tasks.length ? (
        <div className="rounded-lg border border-dashed px-6 py-12 text-center">
          <ClipboardListIcon
            aria-hidden
            className="mx-auto mb-4 h-7 w-7 text-muted-foreground"
          />
          <h4 className="text-base font-semibold">
            A clear place for outstanding requests
          </h4>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Create a request, describe the response you need, and assign it to a
            visitor. Responses submitted by visitors stay open for your review.
          </p>
        </div>
      ) : (
        <ol className="divide-y rounded-lg border bg-card">
          {data.tasks.map((task) => (
            <li key={task.id} className="space-y-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <h4 className="break-words text-base font-semibold">
                    {task.title}
                  </h4>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span>{statusLabels[task.status] ?? task.status}</span>
                    <span>{typeLabels[task.type] ?? task.type}</span>
                    {task.category ? (
                      <span className="break-words">{task.category}</span>
                    ) : null}
                    {task.dueDate ? (
                      <span>Due {formatDate(task.dueDate)}</span>
                    ) : null}
                  </div>
                </div>
                {data.canWrite ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={!!pending || !!editor}
                      onClick={() => setEditor(task)}
                    >
                      Edit<span className="sr-only"> {task.title}</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={!!pending || !!editor}
                      onClick={() => changeTask(task, "PATCH")}
                    >
                      {task.status === "COMPLETED"
                        ? "Reopen"
                        : "Mark completed"}
                      <span className="sr-only"> {task.title}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="min-h-11 text-destructive hover:text-destructive"
                      disabled={!!pending || !!editor}
                      onClick={() => changeTask(task, "DELETE")}
                    >
                      Delete<span className="sr-only"> {task.title}</span>
                    </Button>
                  </div>
                ) : null}
              </div>
              {task.description ? (
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {task.description}
                </p>
              ) : null}
              <p className="break-words text-sm text-muted-foreground">
                {task.assignments.length
                  ? `Assigned to ${task.assignments.map((assignment) => assignment.email ?? (assignment.viewerId ? "a visitor" : assignment.groupId ? "a visitor group" : "visitors on a shared link")).join(", ")}`
                  : "Unassigned — visitors cannot see this request yet."}
              </p>
              {task.uploads.length ? (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Uploaded files</h5>
                  <ul className="space-y-1 text-sm">
                    {task.uploads.map((upload) => (
                      <li key={upload.id} className="break-words">
                        {upload.originalFilename ?? upload.document.name}{" "}
                        <span className="text-muted-foreground">
                          · {formatDate(upload.uploadedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {task.activities.length ? (
                <details className="text-sm">
                  <summary className="min-h-11 cursor-pointer py-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Recent activity
                  </summary>
                  <ol className="space-y-3 border-l pl-4 text-muted-foreground">
                    {task.activities.map((activity) => (
                      <li key={activity.id}>
                        <span className="font-medium text-foreground">
                          {activity.user?.name ??
                            activity.user?.email ??
                            activity.viewer?.email ??
                            "Former member"}
                        </span>{" "}
                        {activity.type === "STATUS_CHANGED"
                          ? `changed the status to ${statusLabels[activity.toStatus ?? ""] ?? activity.toStatus}.`
                          : activity.type === "CREATED"
                            ? "created the request."
                            : activity.type === "ASSIGNED"
                              ? "updated assignments."
                              : activity.type === "UPLOADED"
                                ? "uploaded a file."
                                : "added a comment."}
                        {activity.comment ? (
                          <p className="mt-1 whitespace-pre-wrap break-words text-foreground">
                            {activity.comment}
                          </p>
                        ) : null}
                        <time
                          dateTime={activity.createdAt}
                          className="mt-1 block text-xs"
                        >
                          {formatDate(activity.createdAt)}
                        </time>
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
