import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.avero.os",
  appName: "AVERO",
  webDir: "mobile-shell",
  server: {
    url: "https://avero-dashboard-avero5.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
