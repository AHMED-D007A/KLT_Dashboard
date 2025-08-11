import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ServiceWorkerRegistration from "@/components/service-worker-registration";
import OfflineIndicator from "@/components/offline-indicator";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KLT Dashboard",
  description: "Keploy's Load Testing Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <ServiceWorkerRegistration />
        <OfflineIndicator />
        {children}
      </body>
    </html>
  );
}