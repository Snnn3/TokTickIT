export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_ATTACHMENTS = 5;

export function validateSummary(summary: string): string | null {
  const trimmed = summary ? summary.trim() : "";
  if (!trimmed) {
    return "Summary is required";
  }
  if (trimmed.length > 150) {
    return "Summary must not exceed 150 characters";
  }
  return null;
}

export function validateDescription(description: string): string | null {
  const trimmed = description ? description.trim() : "";
  if (!trimmed) {
    return "Description is required";
  }
  if (trimmed.length > 5000) {
    return "Description must not exceed 5000 characters";
  }
  return null;
}

export function validateCategory(categoryId: string | number): string | null {
  if (!categoryId || String(categoryId).trim() === "") {
    return "Category is required";
  }
  return null;
}

export function validateSystem(systemId: string | number): string | null {
  if (!systemId || String(systemId).trim() === "") {
    return "Related system is required";
  }
  return null;
}

export function validatePriority(priority: string): string | null {
  if (!priority || !["LOW", "MEDIUM", "HIGH"].includes(priority)) {
    return "Requested priority is required";
  }
  return null;
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File "${file.name}" exceeds maximum allowed size of 5 MB`;
  }

  const lowerName = file.name.toLowerCase();
  const hasExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!ALLOWED_MIME_TYPES.includes(file.type) && !hasExt) {
    return `File "${file.name}" has an unsupported format. Allowed types: JPG, PNG, WEBP, PDF`;
  }

  return null;
}
