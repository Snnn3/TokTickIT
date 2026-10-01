import { describe, expect, it } from "vitest";
import { ActionStatus } from "@prisma/client";
import {
  SEED_ACTIONS,
  SEED_FIXTURE_CLOCK,
} from "../../prisma/action-seed-fixtures";

describe("Lab 4 Action Taken seed fixtures", () => {
  it("covers zero, one and many parent-child examples and every action status", () => {
    expect(SEED_ACTIONS).toHaveLength(8);

    const byTicket = new Map<string, Array<(typeof SEED_ACTIONS)[number]>>();
    for (const action of SEED_ACTIONS) {
      const actions = byTicket.get(action.ticketNumber) ?? [];
      actions.push(action);
      byTicket.set(action.ticketNumber, actions);
    }
    expect(byTicket.get("TKT-2026-SEED-02")).toHaveLength(1);
    expect(byTicket.get("TKT-2026-SEED-03")).toHaveLength(2);
    expect(byTicket.get("TKT-2026-SEED-04")).toHaveLength(2);
    expect(byTicket.has("TKT-2026-SEED-01")).toBe(false);
    expect(byTicket.has("TKT-2026-SEED-08")).toBe(false);

    expect(new Set(SEED_ACTIONS.map((action) => action.status))).toEqual(
      new Set(Object.values(ActionStatus))
    );
  });

  it("keeps completed, cancelled and follow-up fixture invariants explicit", () => {
    for (const action of SEED_ACTIONS) {
      if (action.status === ActionStatus.COMPLETED) {
        expect(action.result?.trim()).toBeTruthy();
        expect(action.completedAt).toBeTruthy();
      }
      if (action.status === ActionStatus.CANCELLED) {
        expect(action.completedAt).toBeUndefined();
      }
      if (action.followUpRequired) {
        expect(action.followUpNote?.trim()).toBeTruthy();
      }
    }
  });

  it("uses separate staff/admin performers and only active-staff assignees", () => {
    expect(
      SEED_ACTIONS.some(
        (action) => action.performedByEmail === "apinya.ratchada@example.com"
      )
    ).toBe(true);
    expect(
      SEED_ACTIONS.some(
        (action) =>
          action.performedByEmail !== action.assigneeEmail &&
          action.assigneeEmail !== null &&
          action.assigneeEmail !== undefined
      )
    ).toBe(true);
    expect(
      SEED_ACTIONS.every(
        (action) => action.assigneeEmail !== "suwanna.chaiyo@example.com"
      )
    ).toBe(true);
  });

  it("has a unique stable fixture key for each seeded action", () => {
    const keys = SEED_ACTIONS.map((action) => action.seedKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("includes outside, exact-boundary and inside-clock timestamps", () => {
    const fixtureTimes = SEED_ACTIONS.map((action) => action.createdAt);
    const sevenDayBoundary = "2026-09-24T12:00:00.000Z";
    expect(fixtureTimes.some((time) => time < sevenDayBoundary)).toBe(true);
    expect(fixtureTimes).toContain(sevenDayBoundary);
    expect(
      fixtureTimes.some(
        (time) => time > sevenDayBoundary && time <= SEED_FIXTURE_CLOCK
      )
    ).toBe(true);
    expect(
      SEED_ACTIONS.some((action) => action.updatedAt > SEED_FIXTURE_CLOCK)
    ).toBe(false);
  });
});
