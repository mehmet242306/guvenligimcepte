import { describe, expect, it } from "vitest";
import {
  messageRequestsConfirmation,
  shouldShowNovaConfirmationChoices,
} from "./confirmation";

describe("nova confirmation helpers", () => {
  it("detects Turkish confirmation prompts", () => {
    expect(
      messageRequestsConfirmation("Onaylıyor musunuz? Evet veya Onayla yazmanız yeterli."),
    ).toBe(true);
  });

  it("shows choices when action_run_id is present", () => {
    expect(
      shouldShowNovaConfirmationChoices("Plan hazir.", {
        action_run_id: "run-1",
        action_name: "create_training_plan",
      }),
    ).toBe(true);
  });
});
