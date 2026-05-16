import { describe, expect, it } from "vitest";
import {
  messageIndicatesSettledAction,
  messageRequestsConfirmation,
  shouldShowNovaConfirmationChoices,
} from "./confirmation";

describe("nova confirmation helpers", () => {
  it("detects Turkish confirmation prompts", () => {
    expect(
      messageRequestsConfirmation("Onaylıyor musunuz? Evet veya Onayla yazmanız yeterli."),
    ).toBe(true);
  });

  it("shows choices only for pending_confirmation", () => {
    expect(
      shouldShowNovaConfirmationChoices("Plan hazir.", {
        action_run_id: "run-1",
        action_name: "create_training_plan",
        execution_status: "pending_confirmation",
      }),
    ).toBe(true);
    expect(
      shouldShowNovaConfirmationChoices("Plan hazir.", {
        action_run_id: "run-1",
        execution_status: "queued",
      }),
    ).toBe(false);
  });

  it("hides choices after settled messages", () => {
    expect(messageIndicatesSettledAction("Egitim plani kuyruga alindi.")).toBe(true);
    expect(
      shouldShowNovaConfirmationChoices("Egitim plani kuyruga alindi.", {
        action_run_id: "run-1",
        execution_status: "queued",
      }),
    ).toBe(false);
  });
});
