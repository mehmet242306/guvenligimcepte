import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RiskNova",
    short_name: "RiskNova",
    description: "AI destekli ISG risk analizi ve operasyon platformu.",
    id: "/",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    background_color: "#0f172a",
    theme_color: "#0f172a",
    orientation: "portrait",
    categories: ["business", "productivity", "utilities"],
    lang: "tr",
    icons: [
      {
        src: "/logo/risknova-favicon-64.svg",
        sizes: "64x64",
        type: "image/svg+xml",
      },
      {
        src: "/logo/risknova-app-icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/logo/risknova-app-icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/logo/risknova-mail-symbol.png",
        sizes: "1000x1000",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo/risknova-mail-symbol.png",
        sizes: "1000x1000",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Risk analizi",
        short_name: "Risk",
        description: "Risk analizi modülünü aç",
        url: "/risk-analysis?source=pwa-shortcut",
        icons: [{ src: "/logo/risknova-favicon-64.svg", sizes: "64x64" }],
      },
      {
        name: "Dokümanlar",
        short_name: "Doküman",
        description: "Doküman çalışma alanını aç",
        url: "/documents?source=pwa-shortcut",
        icons: [{ src: "/logo/risknova-favicon-64.svg", sizes: "64x64" }],
      },
      {
        name: "Saha denetimi",
        short_name: "Denetim",
        description: "Saha denetimi modülünü aç",
        url: "/score-history?source=pwa-shortcut",
        icons: [{ src: "/logo/risknova-favicon-64.svg", sizes: "64x64" }],
      },
    ],
  };
}
