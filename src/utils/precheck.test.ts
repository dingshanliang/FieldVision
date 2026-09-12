import { describe, expect, it } from "vitest";
import { isRecoverable, precheckIssues } from "./precheck";

describe("precheckIssues", () => {
  it("passes for a ready overview state", () => {
    expect(precheckIssues("overview", true, true)).toEqual([]);
  });

  it("passes mid-demo valid chapters", () => {
    expect(precheckIssues("drone-scan", true, true)).toEqual([]);
    expect(precheckIssues("irrigation", true, true)).toEqual([]);
  });

  it("flags assets not ready", () => {
    expect(precheckIssues("overview", false, true)).toContain("三维场景加载中");
  });

  it("flags canvas not ready", () => {
    expect(precheckIssues("overview", true, false)).toContain("画布未就绪");
  });

  it("flags an unknown chapter as drift", () => {
    const issues = precheckIssues("wibble", true, true);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("章节状态异常");
  });
});

describe("isRecoverable", () => {
  it("treats a bad-chapter issue as recoverable by reset", () => {
    expect(isRecoverable(["章节状态异常（wibble）"])).toBe(true);
  });

  it("treats canvas/asset problems as not auto-recoverable", () => {
    expect(isRecoverable(["画布未就绪"])).toBe(false);
    expect(isRecoverable(["三维场景加载中"])).toBe(false);
    expect(isRecoverable(["章节状态异常（wibble）", "画布未就绪"])).toBe(false);
  });
});
