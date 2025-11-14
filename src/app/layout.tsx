import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SmartShop AI - AI-Powered Product Analysis",
  description: "Get AI-powered insights, reviews, and analysis for any Amazon or Flipkart product. Make smarter shopping decisions with comprehensive product summaries.",
  keywords: ["product analysis", "AI shopping", "Amazon", "Flipkart", "product reviews", "smart shopping"],
  authors: [{ name: "SmartShop AI" }],
  openGraph: {
    title: "SmartShop AI - AI-Powered Product Analysis",
    description: "Get AI-powered insights on any e-commerce product",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
