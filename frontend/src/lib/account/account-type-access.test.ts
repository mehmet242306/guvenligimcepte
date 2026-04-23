import { describe, expect, it } from "vitest";
import {
  hasAccountTypeAccess,
  readAllowedAccountTypesFromMetadata,
  resolveAllowedAccountTypes,
  setPrivilegedAccountTypeAccess,
} from "./account-type-access";

describe("readAllowedAccountTypesFromMetadata", () => {
  it("reads array metadata", () => {
    expect(readAllowedAccountTypesFromMetadata({ allowed_account_types: ["osgb", "enterprise"] })).toEqual([
      "osgb",
      "enterprise",
    ]);
  });

  it("reads boolean access maps", () => {
    expect(
      readAllowedAccountTypesFromMetadata({
        account_type_access: {
          osgb: true,
          enterprise: false,
        },
      }),
    ).toEqual(["osgb"]);
  });
});

describe("resolveAllowedAccountTypes", () => {
  it("always keeps individual open", () => {
    expect(resolveAllowedAccountTypes({})).toEqual(["individual"]);
  });

  it("adds privileged access from metadata", () => {
    expect(
      resolveAllowedAccountTypes({
        appMetadata: { allowed_account_types: ["enterprise"] },
      }),
    ).toEqual(["individual", "enterprise"]);
  });

  it("preserves the current account type", () => {
    expect(
      resolveAllowedAccountTypes({
        currentAccountType: "osgb",
      }),
    ).toEqual(["individual", "osgb"]);
  });
});

describe("setPrivilegedAccountTypeAccess", () => {
  it("enables and disables privileged account types", () => {
    const enabled = setPrivilegedAccountTypeAccess({}, "osgb", true);
    expect(enabled.allowed_account_types).toEqual(["individual", "osgb"]);

    const disabled = setPrivilegedAccountTypeAccess(enabled, "osgb", false);
    expect(disabled.allowed_account_types).toEqual(["individual"]);
  });
});

describe("hasAccountTypeAccess", () => {
  it("always allows individual and gates other types", () => {
    expect(hasAccountTypeAccess([], "individual")).toBe(true);
    expect(hasAccountTypeAccess(["individual"], "osgb")).toBe(false);
    expect(hasAccountTypeAccess(["individual", "osgb"], "osgb")).toBe(true);
  });
});
