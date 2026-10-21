import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/sobriety_tracker",
    name: "Sobriety Tracker",
    short_name: "Sobriety",
    description: "A free, private sobriety and addiction recovery tracker.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["health", "lifestyle", "medical"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Daily check-in", url: "/check-in", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Get help now", url: "/help", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
