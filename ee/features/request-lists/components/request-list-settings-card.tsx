"use client";

import { useEffect, useId, useState } from "react";

import { useSWRConfig } from "swr";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function RequestListSettingsCard({
  dataroomId,
  teamId,
  requestListEnabled,
}: {
  dataroomId: string;
  teamId: string;
  requestListEnabled: boolean;
}) {
  const id = useId();
  const { mutate } = useSWRConfig();
  const [enabled, setEnabled] = useState(requestListEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setEnabled(requestListEnabled);
  }, [requestListEnabled]);

  async function toggle(checked: boolean) {
    if (pending) return;
    setPending(true);
    setSaved(false);
    setError(null);
    try {
      const url = `/api/teams/${teamId}/datarooms/${dataroomId}`;
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestListEnabled: checked }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body?.error ??
            body?.message ??
            "Unable to change request-list visibility.",
        );
      setEnabled(checked);
      setSaved(true);
      await Promise.allSettled([mutate(url), mutate(`${url}/request-list`)]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to change request-list visibility. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request list</CardTitle>
        <CardDescription>
          Give verified visitors a focused list of requests assigned to them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex min-h-11 items-center justify-between gap-6">
          <Label htmlFor={id} className="cursor-pointer py-3">
            Show assigned requests to visitors
          </Label>
          <div className="flex min-h-11 items-center">
            <Switch
              id={id}
              checked={enabled}
              disabled={pending}
              onCheckedChange={toggle}
              aria-describedby={`${id}-help`}
            />
          </div>
        </div>
        <p
          id={`${id}-help`}
          className="text-sm leading-relaxed text-muted-foreground"
        >
          Visitors must verify their email and have a matching assignment to
          read or respond to a request. Turning this off hides requests and
          keeps your existing list.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <p role="status" className="text-sm text-muted-foreground">
          {pending
            ? "Saving visibility…"
            : saved
              ? "Request-list visibility saved."
              : ""}
        </p>
      </CardContent>
    </Card>
  );
}
