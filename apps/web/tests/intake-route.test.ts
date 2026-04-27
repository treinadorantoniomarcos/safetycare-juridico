import { ZodError } from "zod";
import { describe, expect, it, vi } from "vitest";

const { createCaseFromIntakeMock } = vi.hoisted(() => ({
  createCaseFromIntakeMock: vi.fn()
}));

vi.mock("../src/features/intake/create-case-from-intake", () => ({
  createCaseFromIntake: createCaseFromIntakeMock
}));

import { POST } from "../app/api/intake/lead/route";

describe("POST /api/intake/lead", () => {
  it("creates a case for a valid payload", async () => {
    createCaseFromIntakeMock.mockResolvedValueOnce({
      caseId: "11111111-1111-4111-8111-111111111111",
      workflowJobId: "22222222-2222-4222-8222-222222222222"
    });

    const request = new Request("http://localhost/api/intake/lead", {
      method: "POST",
      body: JSON.stringify({
        source: "form",
        name: "Maria",
        phone: "11999999999",
        message: "Sai do hospital pior do que entrei e preciso de ajuda."
      }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.status).toBe("accepted");
    expect(body.caseId).toBe("11111111-1111-4111-8111-111111111111");
    expect(body.workflowJobId).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("returns 400 for invalid payload", async () => {
    createCaseFromIntakeMock.mockRejectedValueOnce(new ZodError([]));

    const request = new Request("http://localhost/api/intake/lead", {
      method: "POST",
      body: JSON.stringify({
        source: "form",
        message: "curta"
      }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 500 when case creation fails", async () => {
    createCaseFromIntakeMock.mockRejectedValueOnce(new Error("db_down"));

    const request = new Request("http://localhost/api/intake/lead", {
      method: "POST",
      body: JSON.stringify({
        source: "form",
        name: "Maria",
        phone: "11999999999",
        message: "Sai do hospital pior do que entrei e preciso de ajuda."
      }),
      headers: {
        "content-type": "application/json"
      }
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
