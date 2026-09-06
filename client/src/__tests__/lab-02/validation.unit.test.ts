import { describe, it, expect } from "vitest";
import {
  validateSummary,
  validateDescription,
  validateCategory,
  validateSystem,
  validatePriority,
  validateFile,
} from "../../utils/validation";

describe("Validation Utilities (U-02, BR-07, BR-08, BR-13)", () => {
  describe("validateSummary", () => {
    it("rejects empty or whitespace-only summary", () => {
      expect(validateSummary("")).toBe("Summary is required");
      expect(validateSummary("   ")).toBe("Summary is required");
    });

    it("accepts valid summary within 1..150 characters", () => {
      expect(validateSummary("Valid ticket summary")).toBeNull();
      expect(validateSummary("A".repeat(150))).toBeNull();
    });

    it("rejects summary exceeding 150 characters after trim", () => {
      expect(validateSummary("A".repeat(151))).toBe("Summary must not exceed 150 characters");
    });
  });

  describe("validateDescription", () => {
    it("rejects empty description", () => {
      expect(validateDescription("")).toBe("Description is required");
      expect(validateDescription("  \n  ")).toBe("Description is required");
    });

    it("accepts valid description within 1..5000 characters", () => {
      expect(validateDescription("Detailed issue report")).toBeNull();
      expect(validateDescription("B".repeat(5000))).toBeNull();
    });

    it("rejects description exceeding 5000 characters", () => {
      expect(validateDescription("B".repeat(5001))).toBe("Description must not exceed 5000 characters");
    });
  });

  describe("validateCategory, validateSystem, validatePriority", () => {
    it("validates required select fields", () => {
      expect(validateCategory("")).toBe("Category is required");
      expect(validateCategory("1")).toBeNull();

      expect(validateSystem("")).toBe("Related system is required");
      expect(validateSystem("2")).toBeNull();

      expect(validatePriority("")).toBe("Requested priority is required");
      expect(validatePriority("INVALID")).toBe("Requested priority is required");
      expect(validatePriority("LOW")).toBeNull();
      expect(validatePriority("MEDIUM")).toBeNull();
      expect(validatePriority("HIGH")).toBeNull();
    });
  });

  describe("validateFile", () => {
    it("accepts valid allowed files <= 5 MB", () => {
      const validFile = new File(["dummy content"], "evidence.png", {
        type: "image/png",
      });
      expect(validateFile(validFile)).toBeNull();
    });

    it("rejects files exceeding 5 MB", () => {
      const largeFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.png", {
        type: "image/png",
      });
      expect(validateFile(largeFile)).toContain("exceeds maximum allowed size");
    });

    it("rejects disallowed file extensions or mime types", () => {
      const exeFile = new File(["dummy"], "malware.exe", {
        type: "application/x-msdownload",
      });
      expect(validateFile(exeFile)).toContain("unsupported format");
    });
  });
});
