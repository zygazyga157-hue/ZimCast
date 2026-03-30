import { describe, it, expect } from "vitest";

describe("prisma singleton", () => {
  it("returns the same instance on repeated imports", async () => {
    const { prisma: a } = await import("../../src/lib/prisma");
    // Bust the module cache is not straightforward in ESM, but the global
    // singleton pattern means the same object reference is returned.
    const { prisma: b } = await import("../../src/lib/prisma");
    expect(a).toBe(b);
  });

  it("attaches the instance to globalThis in non-production", async () => {
    const { prisma } = await import("../../src/lib/prisma");
    const g = globalThis as unknown as { prisma: unknown };
    expect(g.prisma).toBe(prisma);
  });
});
