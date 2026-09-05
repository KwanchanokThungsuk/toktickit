import type { Response } from "express";

export const INTERNAL_ERROR_RESPONSE = {
  error: {
    code: "INTERNAL_ERROR",
    message: "Internal server error",
  },
} as const;

export function internalServerError(
  res: Response,
  context: string,
  error: unknown,
) {
  console.error(context, error);
  return res.status(500).json(INTERNAL_ERROR_RESPONSE);
}
