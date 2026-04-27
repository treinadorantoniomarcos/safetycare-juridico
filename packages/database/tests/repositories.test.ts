import { describe, expect, it, vi } from "vitest";
import { AuditLogRepository } from "../src/repositories/audit-log-repository";
import { CaseRepository } from "../src/repositories/case-repository";

describe("AuditLogRepository", () => {
  it("clamps limit and builds action query", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ orderBy }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));

    const db = {
      select
    } as unknown as ConstructorParameters<typeof AuditLogRepository>[0];

    const repository = new AuditLogRepository(db);
    await repository.listByAction("sla.escalation_triggered", new Date("2026-04-26T00:00:00.000Z"), 0);

    expect(select).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledTimes(1);
    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(limit).toHaveBeenCalledWith(100);
  });
});

describe("CaseRepository", () => {
  it("returns empty list without querying when statuses are empty", async () => {
    const select = vi.fn();
    const db = {
      select
    } as unknown as ConstructorParameters<typeof CaseRepository>[0];

    const repository = new CaseRepository(db);
    const result = await repository.listByLegalStatuses([], 50);

    expect(result).toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });

  it("clamps limit when querying by legal statuses", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const orderBy = vi.fn(() => ({ limit }));
    const where = vi.fn(() => ({ orderBy }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));

    const db = {
      select
    } as unknown as ConstructorParameters<typeof CaseRepository>[0];

    const repository = new CaseRepository(db);
    await repository.listByLegalStatuses(["conversion_pending"], 1000);

    expect(limit).toHaveBeenCalledWith(200);
  });
});
