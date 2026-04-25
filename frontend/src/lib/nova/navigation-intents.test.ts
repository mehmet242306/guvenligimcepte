import { describe, expect, it } from "vitest";

import { normalizeNovaNavigationText, resolveNovaNavigationIntent } from "./navigation-intents";

describe("resolveNovaNavigationIntent", () => {
  it("routes generic document questions to the ISG library documentation section", () => {
    const intent = resolveNovaNavigationIntent("dok\u00fcman lar nerde");

    expect(intent?.navigation.destination).toBe("isg_library_documents");
    expect(intent?.navigation.url).toBe("/isg-library?section=documentation");
  });

  it("routes short procedure replies to the ISG library documentation section", () => {
    const intent = resolveNovaNavigationIntent("prosed\u00fcr");

    expect(intent?.navigation.destination).toBe("isg_library_documents");
    expect(intent?.navigation.url).toBe("/isg-library?section=documentation");
  });

  it("keeps personal document requests in the saved documents module", () => {
    const intent = resolveNovaNavigationIntent("dokumanlarim nerede");

    expect(intent?.navigation.destination).toBe("documents");
    expect(intent?.navigation.url).toBe("/documents");
  });

  it("still routes core modules by natural page questions", () => {
    const intent = resolveNovaNavigationIntent("risk analizi nerde");

    expect(intent?.navigation.destination).toBe("risk_analysis");
    expect(intent?.navigation.url).toBe("/risk-analysis");
  });

  it("normalizes Turkish spelling and spacing for routing", () => {
    expect(normalizeNovaNavigationText("Dokumanlar nerede?")).toBe("dokumanlar nerede?");
  });
});
