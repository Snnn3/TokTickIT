import { ActionStatus, TicketStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  isActionTransitionAllowed,
  parseCreatePayload,
  parseEditPayload,
} from "../../src/routes/actions";
import { actionSnapshot } from "../../src/utils/action-snapshot";
import { isTransitionAllowed } from "../../src/utils/transitions";

function expectActionError(
  work: () => unknown,
  expected: { status: number; code: string }
) {
  let error: unknown;
  try {
    work();
  } catch (caught) {
    error = caught;
  }
  expect(error).toMatchObject(expected);
}

describe("U4-01 Action and Ticket domain boundaries", () => {
  it("accepts trimmed required Action text at its inclusive limits", () => {
    const payload = parseCreatePayload({
      title: ` ${"T".repeat(120)} `,
      details: ` ${"D".repeat(2000)} `,
      expectedTicketVersion: 1,
    });

    expect(payload.title).toBe("T".repeat(120));
    expect(payload.details).toBe("D".repeat(2000));
    expect(payload.expectedTicketVersion).toBe(1);
  });

  it("rejects blank/oversized Action text and invalid versions", () => {
    expectActionError(
      () =>
        parseCreatePayload({
          title: "  ",
          details: "Work",
          expectedTicketVersion: 1,
        }),
      { status: 400, code: "VALIDATION_ERROR" }
    );
    expectActionError(
      () =>
        parseCreatePayload({
          title: "x".repeat(121),
          details: "Work",
          expectedTicketVersion: 1,
        }),
      { status: 400, code: "VALIDATION_ERROR" }
    );
    expectActionError(
      () =>
        parseCreatePayload({
          title: "Work",
          details: "x".repeat(2001),
          expectedTicketVersion: 1,
        }),
      { status: 400, code: "VALIDATION_ERROR" }
    );
    expectActionError(
      () =>
        parseCreatePayload({
          title: "Work",
          details: "Work",
          expectedTicketVersion: 0,
        }),
      { status: 400, code: "VALIDATION_ERROR" }
    );
  });

  it("requires a create follow-up note and normalizes blank edited notes", () => {
    expectActionError(
      () =>
        parseCreatePayload({
          title: "Work",
          details: "Check it",
          expectedTicketVersion: 1,
          followUpRequired: true,
          followUpNote: "  ",
        }),
      { status: 400, code: "FOLLOW_UP_NOTE_REQUIRED" }
    );
    expect(
      parseEditPayload({
        expectedVersion: 1,
        expectedTicketVersion: 1,
        followUpRequired: true,
        followUpNote: "  ",
      })
    ).toMatchObject({ followUpRequired: true, followUpNote: null });
  });

  it("trims optional edit results and rejects an over-limit result", () => {
    expect(
      parseEditPayload({
        expectedVersion: 1,
        expectedTicketVersion: 1,
        result: "  Verified  ",
      }).result
    ).toBe("Verified");
    expectActionError(
      () =>
        parseEditPayload({
          expectedVersion: 1,
          expectedTicketVersion: 1,
          result: "x".repeat(2001),
        }),
      { status: 400, code: "VALIDATION_ERROR" }
    );
  });

  it("allows only the Action transition matrix edges", () => {
    const allowed: Record<ActionStatus, readonly ActionStatus[]> = {
      [ActionStatus.PLANNED]: [
        ActionStatus.IN_PROGRESS,
        ActionStatus.CANCELLED,
      ],
      [ActionStatus.IN_PROGRESS]: [
        ActionStatus.COMPLETED,
        ActionStatus.CANCELLED,
      ],
      [ActionStatus.COMPLETED]: [],
      [ActionStatus.CANCELLED]: [],
    };

    for (const from of Object.values(ActionStatus)) {
      for (const to of Object.values(ActionStatus)) {
        expect(isActionTransitionAllowed(from, to)).toBe(
          allowed[from].includes(to)
        );
      }
    }
  });

  it("allows only the Ticket transition matrix edges", () => {
    const allowed: Record<TicketStatus, readonly TicketStatus[]> = {
      [TicketStatus.NEW]: [TicketStatus.OPEN, TicketStatus.CANCELLED],
      [TicketStatus.OPEN]: [
        TicketStatus.IN_PROGRESS,
        TicketStatus.WAITING_FOR_REQUESTER,
        TicketStatus.CANCELLED,
      ],
      [TicketStatus.IN_PROGRESS]: [
        TicketStatus.WAITING_FOR_REQUESTER,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELLED,
      ],
      [TicketStatus.WAITING_FOR_REQUESTER]: [
        TicketStatus.IN_PROGRESS,
        TicketStatus.RESOLVED,
        TicketStatus.CANCELLED,
      ],
      [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPENED],
      [TicketStatus.REOPENED]: [
        TicketStatus.IN_PROGRESS,
        TicketStatus.WAITING_FOR_REQUESTER,
        TicketStatus.CANCELLED,
      ],
      [TicketStatus.CLOSED]: [],
      [TicketStatus.CANCELLED]: [],
    };

    for (const from of Object.values(TicketStatus)) {
      for (const to of Object.values(TicketStatus)) {
        expect(isTransitionAllowed(from, to)).toBe(allowed[from].includes(to));
      }
    }
  });

  it("serializes fixed Action timestamps in UTC and preserves a null completion", () => {
    const timestamp = new Date("2026-10-30T12:34:56.789Z");

    expect(
      actionSnapshot({
        title: "Work",
        details: "Inspect device",
        result: null,
        performedById: 5,
        assigneeId: null,
        status: ActionStatus.PLANNED,
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: null,
      })
    ).toMatchObject({
      createdAt: "2026-10-30T12:34:56.789Z",
      updatedAt: "2026-10-30T12:34:56.789Z",
      completedAt: null,
    });
  });
});
