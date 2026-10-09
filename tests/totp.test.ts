import { describe, expect, it } from "vitest";

import { generateTOTP, normalizeBase32, PERIOD_SECONDS } from "../lib/totp";

describe("TOTP generator", () => {
  it("uses a 120-second period", () => {
    expect(PERIOD_SECONDS).toBe(120);
  });

  it("matches the RFC 4226 HOTP vectors for consecutive 120-second windows", () => {
    const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

    expect(generateTOTP(secret, 0)).toBe("755224");
    expect(generateTOTP(secret, 119_999)).toBe("755224");
    expect(generateTOTP(secret, 120_000)).toBe("287082");
    expect(generateTOTP(secret, 240_000)).toBe("359152");
  });

  it("normalizes spaces, dashes and lowercase secrets", () => {
    expect(normalizeBase32(" gezd-gnbv gy3tqojq ")).toBe("GEZD GNBVGY3TQOJQ".replace(/\s/g, ""));
  });
});
