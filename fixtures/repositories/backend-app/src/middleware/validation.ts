import { z } from "zod";

export function validateBody(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.errors });
    }
    req.validatedBody = result.data;
    return next();
  };
}

export class ValidationPipe {
  transform(value: any) {
    return value;
  }
}
