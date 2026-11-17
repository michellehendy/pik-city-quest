import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: { default: "PIK CITY QUEST", template: "%s · PIK CITY QUEST" },
  description: "Explore PIK. Complete quests. Collect experiences. The interactive tourism game for Pantai Indah Kapuk by PIK Tourism Board.",
  applicationName: "PIK CITY QUEST",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PIK CITY QUEST", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-icon.png" },
  openGraph: { title: "PIK CITY QUEST", description: "Explore PIK. Complete quests. Collect experiences.", siteName: "PIK Tourism", type: "website" },
};
export const viewport: Viewport = { themeColor: "#087088", width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
