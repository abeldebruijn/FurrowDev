import { describe, expect, it } from "vite-plus/test";

import { getWorkOSUserDisplayName } from "../lib/zero/user-display-name";
import { isValidRoadmapParentVersion } from "../lib/zero/roadmap";

describe("getWorkOSUserDisplayName", () => {
  it("prefers first and last name", () => {
    expect(
      getWorkOSUserDisplayName({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.com",
      }),
    ).toBe("Ada Lovelace");
  });

  it("falls back to email", () => {
    expect(
      getWorkOSUserDisplayName({
        email: "person@example.com",
      }),
    ).toBe("person@example.com");
  });
});

describe("isValidRoadmapParentVersion", () => {
  it("rejects children behind parent", () => {
    expect(
      isValidRoadmapParentVersion(
        { majorVersion: 1, minorVersion: 0 },
        { majorVersion: 0, minorVersion: 9 },
      ),
    ).toBe(false);
  });

  it("rejects same version as parent", () => {
    expect(
      isValidRoadmapParentVersion(
        { majorVersion: 1, minorVersion: 0 },
        { majorVersion: 1, minorVersion: 0 },
      ),
    ).toBe(false);
  });

  it("accepts later minor in same major", () => {
    expect(
      isValidRoadmapParentVersion(
        { majorVersion: 1, minorVersion: 0 },
        { majorVersion: 1, minorVersion: 1 },
      ),
    ).toBe(true);
  });
});
