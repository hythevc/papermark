import { task } from "@trigger.dev/sdk";

import { sendDataroomInfoEmail } from "@/lib/emails/send-dataroom-info";
import { sendDataroomTrial24hReminderEmail } from "@/lib/emails/send-dataroom-trial-24h";
import { sendDataroomTrialEndEmail } from "@/lib/emails/send-dataroom-trial-end";
import prisma from "@/lib/prisma";

async function trialDeadline(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      plan: true,
      createdAt: true,
      trialStartedAt: true,
      trialEndsAt: true,
      datarooms: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });
  if (!team?.plan.split("+").includes("drtrial")) return null;
  return (
    team.trialEndsAt ??
    new Date(
      (
        team.trialStartedAt ??
        team.datarooms[0]?.createdAt ??
        team.createdAt
      ).getTime() +
        7 * 24 * 60 * 60 * 1000,
    )
  );
}

export const sendDataroomTrialInfoEmailTask = task({
  id: "send-dataroom-trial-info-email",
  run: async (payload: { to: string; useCase: string; name: string }) => {
    await sendDataroomInfoEmail(
      { user: { email: payload.to, name: payload.name } },
      payload.useCase,
    );
  },
});

export const sendDataroomTrial24hReminderEmailTask = task({
  id: "send-dataroom-trial-24h-reminder-email",
  run: async (payload: { to: string; name: string; teamId: string }) => {
    const deadline = await trialDeadline(payload.teamId);
    const remaining = deadline ? deadline.getTime() - Date.now() : 0;
    // Recheck persisted extensions/paid upgrades when the delayed job runs.
    if (remaining <= 0 || remaining > 24 * 60 * 60 * 1000) return;
    await sendDataroomTrial24hReminderEmail({
      email: payload.to,
      name: payload.name,
    });
  },
});

export const sendDataroomTrialExpiredEmailTask = task({
  id: "send-dataroom-trial-expired-email",
  run: async (payload: { to: string; name: string; teamId: string }) => {
    const deadline = await trialDeadline(payload.teamId);
    if (!deadline || deadline.getTime() > Date.now()) return;
    await sendDataroomTrialEndEmail({ email: payload.to, name: payload.name });
  },
});
