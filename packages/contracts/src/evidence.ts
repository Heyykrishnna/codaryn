import { z } from "zod";

export const sourceEvidenceSchema = z
  .object({
    path: z.string().min(1),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  })
  .refine((value) => value.endLine >= value.startLine, {
    message: "End line must not precede start line",
  });

export type SourceEvidence = z.infer<typeof sourceEvidenceSchema>;

export const resolutionSchema = z.enum([
  "DIRECT",
  "RESOLVED",
  "INFERRED",
  "PARTIAL",
  "UNRESOLVED",
]);

export type Resolution = z.infer<typeof resolutionSchema>;
