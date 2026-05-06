import { describe, expect, it } from "vitest";
import {
  extractMentionKeys,
  extractTaskRefs,
  slugifyTaskTitle,
} from "@/lib/content-references";

describe("content references", () => {
  it("extracts normalized user mentions", () => {
    expect(
      extractMentionKeys("Ship with @Aarav, @mira.member and @ops-lead_today."),
    ).toEqual(["aarav", "mira.member", "ops-lead_today"]);
  });

  it("extracts task references", () => {
    expect(
      extractTaskRefs("Link #seed-task-chat and #review-task_42 before handoff."),
    ).toEqual(["seed-task-chat", "review-task_42"]);
  });

  it("slugifies task titles for #task-title matching", () => {
    expect(slugifyTaskTitle("Review Task-Level Chat UX")).toBe(
      "review-task-level-chat-ux",
    );
  });
});
