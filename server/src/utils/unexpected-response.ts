import type { Response } from "express";

export function sendUnexpectedError(
  response: Response,
  message: string
): Response {
  return response.status(500).json({
    error: {
      code: "UNEXPECTED",
      message,
    },
  });
}
