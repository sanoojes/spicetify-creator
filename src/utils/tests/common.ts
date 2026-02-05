import { describe, expect, it } from "vitest";
import { normalizePosix } from "@/utils/common";

describe("normalizePosix", () => {
  const std = "this/is/going/forward";
  it("normalizes windows", () => {
    const stdWindows = "this\\is\\going\\forward";
    expect(normalizePosix(stdWindows)).toEqual(std);
  });
  it("normalizes unix", () => {
    expect(normalizePosix(std)).toEqual(std);
  });
});
