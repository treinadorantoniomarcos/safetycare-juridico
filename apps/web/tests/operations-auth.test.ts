import { afterEach, describe, expect, it, vi } from "vitest";
import { hasOperationsAccess } from "../src/lib/operations-auth";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hasOperationsAccess", () => {
  it("allows access in test environment when api key is not configured", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("OPERATIONS_API_KEY", undefined);

    const request = new Request("http://localhost/api/intake/queue");

    expect(hasOperationsAccess(request)).toBe(true);
  });

  it("denies access outside test environment when api key is not configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OPERATIONS_API_KEY", undefined);

    const request = new Request("http://localhost/api/intake/queue");

    expect(hasOperationsAccess(request)).toBe(false);
  });

  it("allows access when configured key matches request header", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OPERATIONS_API_KEY", "ops-key");

    const request = new Request("http://localhost/api/intake/queue", {
      headers: {
        "x-ops-api-key": "ops-key"
      }
    });

    expect(hasOperationsAccess(request)).toBe(true);
  });

  it("denies access when configured key does not match request header", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OPERATIONS_API_KEY", "ops-key");

    const request = new Request("http://localhost/api/intake/queue", {
      headers: {
        "x-ops-api-key": "other-key"
      }
    });

    expect(hasOperationsAccess(request)).toBe(false);
  });
});
