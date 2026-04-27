import { describe, expect, it, vi } from "vitest";

const { getCaseReviewQueueMock } = vi.hoisted(() => ({
  getCaseReviewQueueMock: vi.fn()
}));

vi.mock("../src/features/intake/get-case-review-queue", () => ({
  getCaseReviewQueue: getCaseReviewQueueMock
}));

import { GET } from "../app/api/intake/cases/queue/route";

describe("GET /api/intake/cases/queue", () => {
  it("returns the review and conversion queue", async () => {
    getCaseReviewQueueMock.mockResolvedValueOnce({
      statuses: [
        "human_triage_pending",
        "human_review_required",
        "conversion_pending",
        "score_rejected"
      ],
      total: 2,
      summary: [
        {
          status: "human_triage_pending",
          total: 0
        },
        {
          status: "human_review_required",
          total: 1
        },
        {
          status: "conversion_pending",
          total: 1
        },
        {
          status: "score_rejected",
          total: 0
        }
      ],
      cases: [
        {
          id: "case-1",
          caseType: "hospital_failure",
          priority: "high",
          urgency: "critical",
          commercialStatus: "triaged",
          legalStatus: "human_review_required",
          updatedAt: new Date("2026-04-25T12:00:00.000Z")
        },
        {
          id: "case-2",
          caseType: "medication_error",
          priority: "medium",
          urgency: "high",
          commercialStatus: "conversion_pending",
          legalStatus: "conversion_pending",
          updatedAt: new Date("2026-04-25T13:00:00.000Z")
        }
      ]
    });

    const response = await GET(new Request("http://localhost/api/intake/cases/queue?limit=10"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getCaseReviewQueueMock).toHaveBeenCalledWith(10);
    expect(body.total).toBe(2);
    expect(body.summary).toHaveLength(4);
    expect(body.cases).toHaveLength(2);
    expect(body.correlationId).toEqual(expect.any(String));
  });

  it("returns 500 when the queue is unavailable", async () => {
    getCaseReviewQueueMock.mockRejectedValueOnce(new Error("db_down"));

    const response = await GET(new Request("http://localhost/api/intake/cases/queue"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("case_queue_unavailable");
    expect(body.correlationId).toEqual(expect.any(String));
  });
});
