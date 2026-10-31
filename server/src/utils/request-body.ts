import type { Request } from "express";

export function hasRequestBody(req: Request): boolean {
  const contentLength = Number(req.get("content-length") ?? 0);
  const hasFramedBody =
    contentLength > 0 || req.get("transfer-encoding") !== undefined;

  return req.body !== undefined || hasFramedBody;
}
