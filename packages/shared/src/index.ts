import { z } from "zod";
export type { Database } from "./database.types";

export const organizationRoleSchema = z.enum(["admin", "scout", "strategist", "master", "developer"]);
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;

export const matchTypeSchema = z.enum(["qualification", "playoff", "practice"]);
export const submissionStatusSchema = z.enum(["draft", "submitted", "corrected", "invalid"]);
export const assignmentTypeSchema = z.enum(["objective", "subjective", "pit", "strategist"]);
export const assignmentStatusSchema = z.enum(["pending", "in_progress", "complete", "skipped"]);

export const formFieldSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(160),
  type: z.enum(["counter", "boolean", "select", "rating", "notes"]),
  required: z.boolean().default(false),
  options: z.array(z.string().max(80)).optional(),
  section: z.enum(["auto", "teleop", "endgame", "notes"]),
  helpText: z.string().max(300).optional(),
});

export const formDefinitionSchema = z.object({
  title: z.string().min(1).max(100),
  gameYear: z.number().int().min(2020).max(2100),
  fields: z.array(formFieldSchema).min(1).max(100),
});
export type FormDefinition = z.infer<typeof formDefinitionSchema>;

export const matchSubmissionSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  matchId: z.string().uuid(),
  teamId: z.string().uuid(),
  assignmentId: z.string().uuid().nullable(),
  formVersion: z.number().int().positive(),
  payload: z.record(z.string(), z.unknown()),
  status: submissionStatusSchema,
  revision: z.number().int().nonnegative(),
});
export type MatchSubmission = z.infer<typeof matchSubmissionSchema>;

export const DEFAULT_2026_FORM: FormDefinition = {
  title: "REBUILT Match Scout",
  gameYear: 2026,
  fields: [
    { id: "auto_fuel", label: "Fuel scored", type: "counter", required: true, section: "auto" },
    { id: "auto_mobility", label: "Left starting zone", type: "boolean", required: true, section: "auto" },
    { id: "teleop_fuel", label: "Fuel scored", type: "counter", required: true, section: "teleop" },
    { id: "collection", label: "Primary collection", type: "select", options: ["Floor", "Depot", "Outpost / Chute", "Mixed"], required: true, section: "teleop" },
    { id: "climb", label: "Tower result", type: "select", options: ["None", "Rung 1", "Rung 2", "Rung 3"], required: true, section: "endgame" },
    { id: "defense", label: "Defense impact", type: "rating", required: false, section: "notes" },
    { id: "notes", label: "Scout notes", type: "notes", required: false, section: "notes" }
  ]
};
