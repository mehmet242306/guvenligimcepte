import { describe, expect, it } from "vitest";
import {
  resolveNovaPublicSiteNavigationIntent,
  resolveNovaSiteMapOverviewIntent,
  resolveNovaProductHelpIntent,
} from "./site-map";

describe("resolveNovaSiteMapOverviewIntent", () => {
  it("returns a map for overview questions", () => {
    const r = resolveNovaSiteMapOverviewIntent("site haritası var mı");
    expect(r).toBeTruthy();
    expect(r).toContain("Paketler");
  });

  it("returns null for unrelated text", () => {
    expect(resolveNovaSiteMapOverviewIntent("merhaba")).toBeNull();
  });
});

describe("resolveNovaPublicSiteNavigationIntent", () => {
  it("routes pricing questions", () => {
    const r = resolveNovaPublicSiteNavigationIntent("paketler nerede");
    expect(r?.navigation?.url).toBe("/pricing");
  });

  it("routes osgb page", () => {
    const r = resolveNovaPublicSiteNavigationIntent("osgb teklif sayfasına git");
    expect(r?.navigation?.url).toBe("/cozumler/osgb");
  });
});

describe("resolveNovaProductHelpIntent", () => {
  it("suggests register for signup", () => {
    const r = resolveNovaProductHelpIntent("nasıl kayıt olurum");
    expect(r?.navigation?.url).toBe("/register");
  });
});
