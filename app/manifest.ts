import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AVERO OS",
    short_name: "AVERO",
    description: "AVERO Business Operations Platform",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    orientation: "any",
    lang: "en",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/avero-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/avero-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Open AVERO",
        short_name: "AVERO",
        description: "Open the AVERO dashboard",
        url: "/",
        icons: [{ src: "/avero-icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      {
        name: "AI Agents",
        short_name: "AI Agents",
        description: "Open AVERO AI Agents",
        url: "/agents",
        icons: [{ src: "/avero-icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    ],
  };
}
