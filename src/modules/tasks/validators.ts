import { z } from "zod";

export const taskCreateSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(1200).optional().or(z.literal("")),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(1200).optional().nullable(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});
