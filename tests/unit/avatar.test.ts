import { describe, it, expect } from "vitest";
import { generateAvatar, type AvatarInput } from "@/lib/avatar";

describe("generateAvatar", () => {
  const base: AvatarInput = {
    name: "Tatenda Moyo",
    email: "tatenda@example.com",
    interests: ["Sports", "Music"],
  };

  it("returns svg string, dataUrl, initials, and animationClass", () => {
    const result = generateAvatar(base);
    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("</svg>");
    expect(result.dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(result.initials).toBe("TM");
    expect(result.animationClass).toMatch(/^avatar-vibe-/);
  });

  it("is deterministic — same input yields same output", () => {
    const a = generateAvatar(base);
    const b = generateAvatar(base);
    expect(a.svg).toBe(b.svg);
    expect(a.dataUrl).toBe(b.dataUrl);
  });

  it("produces different output for different emails", () => {
    const a = generateAvatar({ ...base, email: "a@example.com" });
    const b = generateAvatar({ ...base, email: "b@example.com" });
    expect(a.svg).not.toBe(b.svg);
  });

  it("extracts single initial from email when name is missing", () => {
    const result = generateAvatar({ email: "john@example.com" });
    expect(result.initials).toBe("J");
  });

  it("extracts two initials from a full name", () => {
    const result = generateAvatar({ name: "Rudo Kuda", email: "rudo@example.com" });
    expect(result.initials).toBe("RK");
  });

  it("falls back to 'U' when both name and email are empty", () => {
    const result = generateAvatar({});
    expect(result.initials).toBe("U");
  });

  it("includes motif badge when interests contain a known interest", () => {
    const sports = generateAvatar({ ...base, interests: ["Sports"] });
    expect(sports.svg).toContain("Interest motif badge");
    expect(sports.svg).toContain("polygon"); // football hexagon

    const music = generateAvatar({ ...base, interests: ["Music"] });
    expect(music.svg).toContain("Interest motif badge");
  });

  it("omits motif badge when no known interests match", () => {
    const result = generateAvatar({ ...base, interests: ["Cooking"] });
    expect(result.svg).not.toContain("Interest motif badge");
  });

  it("selects correct vibe animation class for interest categories", () => {
    const sports = generateAvatar({ ...base, interests: ["Sports"] });
    expect(sports.animationClass).toBe("avatar-vibe-energetic");

    const news = generateAvatar({ ...base, interests: ["News"] });
    expect(news.animationClass).toBe("avatar-vibe-steady");

    const music = generateAvatar({ ...base, interests: ["Music"] });
    expect(music.animationClass).toBe("avatar-vibe-rhythmic");

    const gaming = generateAvatar({ ...base, interests: ["Gaming"] });
    expect(gaming.animationClass).toBe("avatar-vibe-energetic");

    const food = generateAvatar({ ...base, interests: ["Food"] });
    expect(food.animationClass).toBe("avatar-vibe-warm");

    const tech = generateAvatar({ ...base, interests: ["Tech"] });
    expect(tech.animationClass).toBe("avatar-vibe-precise");
  });

  it("renders motif badges for new interest types", () => {
    const newInterests = ["Gaming", "Travel", "Food", "Tech", "Fashion", "Fitness", "Art"];
    for (const interest of newInterests) {
      const result = generateAvatar({ ...base, interests: [interest] });
      expect(result.svg).toContain("Interest motif badge");
    }
  });

  it("falls back to a deterministic vibe when no known interests match", () => {
    const result = generateAvatar({ ...base, interests: ["Cooking"] });
    expect(result.animationClass).toMatch(/^avatar-vibe-/);
  });

  it("changes motif when primary interest changes", () => {
    const sports = generateAvatar({ ...base, interests: ["Sports"] });
    const news = generateAvatar({ ...base, interests: ["News"] });
    // The motif SVG fragments differ between Sports and News
    expect(sports.svg).not.toBe(news.svg);
  });

  it("produces valid SVG with required elements", () => {
    const result = generateAvatar(base);
    // Outer ring
    expect(result.svg).toContain('r="48"');
    // Inner fill
    expect(result.svg).toContain('r="46"');
    // Gradient definition
    expect(result.svg).toContain("linearGradient");
    // Glow filter
    expect(result.svg).toContain("feGaussianBlur");
    // Initials text
    expect(result.svg).toContain(">TM</text>");
  });

  it("encodes data URL correctly", () => {
    const result = generateAvatar(base);
    const b64 = result.dataUrl.replace("data:image/svg+xml;base64,", "");
    const decoded = Buffer.from(b64, "base64").toString("utf-8");
    expect(decoded).toBe(result.svg);
  });
});
