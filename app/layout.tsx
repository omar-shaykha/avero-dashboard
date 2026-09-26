import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/app/components/LanguageProvider";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import HelpChatBubble from "@/app/components/HelpChatBubble";
import PWARegister from "@/app/components/PWARegister";
import PresenceHeartbeat from "@/app/components/PresenceHeartbeat";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AVERO OS",
  description: "AVERO Business Operations Platform",
  applicationName: "AVERO OS",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/avero-icon.svg",
    apple: "/avero-icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "AVERO",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider><LanguageProvider><PWARegister /><PresenceHeartbeat />{children}<HelpChatBubble /></LanguageProvider></ThemeProvider>
      </body>
    </html>
  );
}
