import { describe, expect, it } from "vitest";
import { isSerializationConflict } from "../../src/utils/serializable-transaction";

describe("serialization conflict detection", () => {
  it("recognizes Prisma transaction conflicts and PostgreSQL serialization failures from raw locks", () => {
    expect(isSerializationConflict({ code: "P2034" })).toBe(true);
    expect(
      isSerializationConflict({ code: "P2010", meta: { code: "40001" } })
    ).toBe(true);
    expect(
      isSerializationConflict({ code: "P2010", meta: { code: "23505" } })
    ).toBe(false);
    expect(isSerializationConflict({ code: "P2025" })).toBe(false);
  });
});
