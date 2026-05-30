import type { Metadata } from "next";
import "./globals.css";
import "reactflow/dist/style.css";
import { Providers } from "@/components/providers";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

const META_TITLE       = "AutomateOS - WhatsApp Automation Platform for Indian Businesses";
const META_DESCRIPTION = "AutomateOS is India's leading WhatsApp automation platform. Build chatbots, run campaigns, manage contacts, book appointments, and handle support - all from one dashboard. 14-day free trial, no credit card needed.";

export const metadata: Metadata = {
  title: { default: META_TITLE, template: `%s - ${APP_NAME}` },
  description: META_DESCRIPTION,
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "black-translucent" },
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#0b0d12" },
  ],
  formatDetection: { telephone: false },
  openGraph: { title: META_TITLE, description: META_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: META_TITLE, description: META_DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
