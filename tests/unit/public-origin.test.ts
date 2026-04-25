import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { choosePublicOrigin } from "../../src/lib/public-origin";

const OLD_ENV = { ...process.env };

describe("choosePublicOrigin", () => {
  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it("returns the candidate when it is allowlisted", () => {
    process.env.PUBLIC_APP_ORIGINS = "http://localhost:3000,http://10.0.0.5:3000";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(choosePublicOrigin("http://10.0.0.5:3000")).toBe("http://10.0.0.5:3000");
  });

  it("never returns 0.0.0.0 and falls back", () => {
    process.env.PUBLIC_APP_ORIGINS = "http://localhost:3000";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(choosePublicOrigin("http://0.0.0.0:3000")).toBe("http://localhost:3000");
  });
});

