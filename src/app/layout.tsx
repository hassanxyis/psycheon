import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const description =
  "A supportive community for mental wellbeing, and in-clinic consultations with qualified psychologists.";

export const metadata: Metadata = {
  // Without this, Next resolves opengraph-image.png against localhost and warns
  // at build time. getSiteUrl() is the same origin the auth redirects use.
  metadataBase: new URL(getSiteUrl()),
  title: "Psychéon — psychology community & clinic booking",
  description,
  openGraph: {
    title: "Psychéon — psychology community & clinic booking",
    description,
    siteName: "Psychéon",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <Toaster />
      </body>
    </html>
  );
}
