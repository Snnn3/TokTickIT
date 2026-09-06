export function parsePositiveIntParam(paramValue: string | string[] | undefined): number | null {
  const raw = Array.isArray(paramValue) ? paramValue[0] : paramValue;
  const trimmed = String(raw || "").trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const id = parseInt(trimmed, 10);
  return id > 0 ? id : null;
}

export function serializeAttachment(att: {
  id: number;
  ticketId: number;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date | string;
  removedAt: Date | string | null;
  removedReason: string | null;
}) {
  return {
    id: att.id,
    ticketId: att.ticketId,
    filename: att.filename,
    mimeType: att.mimeType,
    sizeBytes: att.sizeBytes,
    uploadedAt: att.uploadedAt,
    removedAt: att.removedAt,
    removedReason: att.removedReason,
  };
}
