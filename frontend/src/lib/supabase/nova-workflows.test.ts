import { describe, expect, it } from "vitest";

import { hasOrganizationWideNovaAccess } from "./nova-workflows";
import type { AccountContextResponse } from "@/lib/account/account-api";

function makeAccount(
  overrides: Partial<AccountContextResponse["context"]> = {},
): AccountContextResponse {
  return {
    ok: true,
    context: {
      userId: "user-1",
      isPlatformAdmin: false,
      organizationId: "org-1",
      organizationName: "Org",
      accountType: "individual",
      allowedAccountTypes: ["individual"],
      membershipRole: "owner",
      currentPlanCode: null,
      osgbUmbrellas: [],
      managedProfessionals: [],
      ...overrides,
    },
    surface: "standard",
    redirectPath: "/dashboard",
    usage: null,
  };
}

describe("hasOrganizationWideNovaAccess", () => {
  it("does not grant org-wide Nova access to individual accounts", () => {
    expect(hasOrganizationWideNovaAccess(makeAccount({ accountType: "individual" }))).toBe(false);
  });

  it("does not grant org-wide Nova access to platform admins in widget scope", () => {
    expect(
      hasOrganizationWideNovaAccess(
        makeAccount({ isPlatformAdmin: true, accountType: "enterprise", membershipRole: "owner" }),
      ),
    ).toBe(false);
  });

  it("grants org-wide access to enterprise admins", () => {
    expect(
      hasOrganizationWideNovaAccess(
        makeAccount({ accountType: "enterprise", membershipRole: "admin" }),
      ),
    ).toBe(true);
  });
});
