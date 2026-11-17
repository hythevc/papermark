import { z } from "zod";

export const taskTypeSchema = z.enum(["TODO", "UPLOAD", "ACKNOWLEDGE"]);
export const taskStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "SUBMITTED",
  "COMPLETED",
]);

const identifier = z.string().trim().min(1).max(255);

// The database stores four nullable targets; enforce the exclusive target at
// the boundary rather than interpreting an ambiguous assignment later.
export const taskAssignmentSchema = z
  .object({
    viewerId: identifier.optional(),
    groupId: identifier.optional(),
    linkId: identifier.optional(),
    email: z.string().trim().toLowerCase().email().max(320).optional(),
  })
  .strict()
  .refine(
    (assignment) => Object.values(assignment).filter(Boolean).length === 1,
    {
      message: "Choose exactly one assignment target.",
    },
  );

export type TaskAssignmentInput = z.infer<typeof taskAssignmentSchema>;
export type TaskType = z.infer<typeof taskTypeSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export function assignmentKey(assignment: TaskAssignmentInput): string {
  const target = ["viewerId", "groupId", "linkId", "email"].find(
    (key) => assignment[key as keyof TaskAssignmentInput],
  ) as keyof TaskAssignmentInput;
  return `${target}:${assignment[target]}`;
}

const assignmentsSchema = z
  .array(taskAssignmentSchema)
  .max(200, "Use at most 200 assignments per request.")
  .refine(
    (assignments) =>
      new Set(assignments.map(assignmentKey)).size === assignments.length,
    { message: "Each assignment target must be unique." },
  );

const taskFields = {
  title: z.string().trim().min(1, "Enter a request title.").max(255),
  description: z.string().trim().max(10000).nullable().optional(),
  type: taskTypeSchema,
  category: z.string().trim().max(120).nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  uploadFolderId: identifier.nullable().optional(),
  assignments: assignmentsSchema.optional(),
};

export const createTaskSchema = z
  .object({ ...taskFields, type: taskTypeSchema.default("TODO") })
  .strict()
  .refine((task) => !task.uploadFolderId || task.type === "UPLOAD", {
    message: "Only upload requests can have a destination folder.",
    path: ["uploadFolderId"],
  });

export const updateTaskSchema = z
  .object({
    taskId: identifier,
    title: taskFields.title.optional(),
    description: taskFields.description,
    type: taskTypeSchema.optional(),
    category: taskFields.category,
    dueDate: taskFields.dueDate,
    uploadFolderId: taskFields.uploadFolderId,
    assignments: assignmentsSchema.optional(),
    status: taskStatusSchema.optional(),
  })
  .strict()
  .refine((task) => Object.keys(task).some((key) => key !== "taskId"), {
    message: "Choose a request field to update.",
  })
  .refine(
    (task) => !task.uploadFolderId || !task.type || task.type === "UPLOAD",
    {
      message: "Only upload requests can have a destination folder.",
      path: ["uploadFolderId"],
    },
  );

export const deleteTaskSchema = z.object({ taskId: identifier }).strict();
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
