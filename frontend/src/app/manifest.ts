import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RiskNova",
    short_name: "RiskNova",
    description: "AI destekli İSG risk analizi ve operasyon platformu.",
    id: "/",
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    orientation: "portrait",
    categories: ["business", "productivity", "utilities"],
    lang: "tr",
    icons: [
      {
        src: "/logo/risknova-app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo/risknova-app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo/risknova-app-icon-512.png",
        sizes: "512x512",
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
        icons: [{ src: "/logo/risknova-shortcut-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Dokümanlar",
        short_name: "Doküman",
        description: "Doküman çalışma alanını aç",
        url: "/documents?source=pwa-shortcut",
        icons: [{ src: "/logo/risknova-shortcut-96.png", sizes: "96x96", type: "image/png" }],
      },
      {
        name: "Saha denetimi",
        short_name: "Denetim",
        description: "Saha denetimi modülünü aç",
        url: "/score-history?source=pwa-shortcut",
        icons: [{ src: "/logo/risknova-shortcut-96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}
