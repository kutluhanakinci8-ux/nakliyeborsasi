import { describe, expect, it } from "vitest";
import {
  formatMailContactPhoneForDisplay,
  normalizeMailContactPhone,
} from "./mailPhone.util";

describe("mailPhone", () => {
  it("normalizes Turkish mobile to E.164", () => {
    expect(normalizeMailContactPhone("0532 111 22 33")).toBe("+905321112233");
  });

  it("formats E.164 for display", () => {
    expect(formatMailContactPhoneForDisplay("+905321112233")).toContain("532");
  });
});
