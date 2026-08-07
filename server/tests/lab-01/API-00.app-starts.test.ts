import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app";

describe("App foundation", () => {
  it("serves the TokTickIT API service", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ service: "TokTickIT API" });
  });
});
