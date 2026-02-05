import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { dist, replace } from "@/utils/fs";

describe("utils/fs", () => {
  describe("replace", () => {
    it("replaces all keys in the record", () => {
      const content = "Hello {{name}}";
      const kv = { "{{name}}": "Name" };
      expect(replace(content, kv)).toBe("Hello Name");
    });
  });

  describe("dist", () => {
    it("add dist/ when URL does not include dist", () => {
      const mockUrl = "file:///project/src/index.ts";
      const result = dist("templates", mockUrl);
      expect(result).toBe(fileURLToPath("file:///project/src/dist/templates"));
    });
  });
});
