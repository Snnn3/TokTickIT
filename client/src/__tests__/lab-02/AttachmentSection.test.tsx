import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AttachmentSection } from "../../components/AttachmentSection";
import type { AttachmentMetadata } from "../../types/ticket";

const mockAttachments: AttachmentMetadata[] = [
  {
    id: 101,
    ticketId: 10,
    filename: "active_doc.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024 * 50,
    uploadedAt: "2026-08-30T10:00:00.000Z",
    removedAt: null,
    removedReason: null,
  },
  {
    id: 102,
    ticketId: 10,
    filename: "old_screenshot.png",
    mimeType: "image/png",
    sizeBytes: 1024 * 120,
    uploadedAt: "2026-08-30T10:05:00.000Z",
    removedAt: "2026-08-30T11:00:00.000Z",
    removedReason: "Uploaded wrong document",
  },
];

describe("AttachmentSection Component (C-11..C-13, AC-07..AC-12, BR-13, BR-16, BR-17)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("C-13: performs client file pre-checks for invalid types and oversize >5MB (AC-07, AC-08)", async () => {
    render(
      <AttachmentSection
        ticketId={10}
        attachments={[]}
        requesterId={1}
      />,
    );

    const input = screen.getByTestId("add-attachment-input") as HTMLInputElement;

    // 1. Invalid file extension (.exe)
    const invalidFile = new File(["binary content"], "bad_file.exe", { type: "application/x-msdownload" });
    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(screen.getByText(/unsupported/i)).toBeInTheDocument();

    // 2. Oversize file (>5MB)
    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "oversize.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [bigFile] } });

    expect(screen.getByText(/exceeds/i)).toBeInTheDocument();
  });

  it("C-12: renders removed attachments with strikethrough, badge, reason caption, and disabled actions (AC-11)", async () => {
    render(
      <AttachmentSection
        ticketId={10}
        attachments={mockAttachments}
        requesterId={1}
      />,
    );

    // Active attachment: enabled actions
    const activeDownload = screen.getByTestId("download-button-101");
    const activeRemove = screen.getByTestId("remove-button-101");
    expect(activeDownload).not.toBeDisabled();
    expect(activeRemove).not.toBeDisabled();

    // Removed attachment: disabled actions, Removed badge, strikethrough, and reason
    const removedBadge = screen.getByTestId("removed-badge-102");
    expect(removedBadge).toHaveTextContent("Removed");

    const removedReason = screen.getByTestId("removed-reason-102");
    expect(removedReason).toHaveTextContent("Uploaded wrong document");

    const removedDownload = screen.getByTestId("download-button-102");
    const removedRemove = screen.getByTestId("remove-button-102");
    expect(removedDownload).toBeDisabled();
    expect(removedRemove).toBeDisabled();
  });

  it("C-11: requires non-empty reason to confirm soft removal and calls DELETE endpoint (AC-12, BR-17)", async () => {
    const onRemoved = vi.fn();

    render(
      <AttachmentSection
        ticketId={10}
        attachments={[mockAttachments[0]]}
        requesterId={1}
        onAttachmentRemoved={onRemoved}
      />,
    );

    // Click remove on active attachment
    fireEvent.click(screen.getByTestId("remove-button-101"));

    // Modal dialog opens
    expect(screen.getByTestId("remove-attachment-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove/i)).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("confirm-remove-button");
    const reasonInput = screen.getByTestId("removal-reason-input");

    // Empty reason keeps button disabled
    expect(confirmBtn).toBeDisabled();

    // Enter valid reason
    fireEvent.change(reasonInput, { target: { value: "No longer needed by IT" } });
    expect(confirmBtn).not.toBeDisabled();

    // Mock DELETE endpoint
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        removed: true,
        removedAt: "2026-08-30T12:00:00.000Z",
      }),
    } as Response);

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onRemoved).toHaveBeenCalledWith({
        attachmentId: 101,
        removedReason: "No longer needed by IT",
        removedAt: "2026-08-30T12:00:00.000Z",
      });
      expect(screen.queryByTestId("remove-attachment-dialog")).not.toBeInTheDocument();
    });
  });
});
