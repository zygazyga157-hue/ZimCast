import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { RegisterSW } from "@/components/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZimCast — Live Sports & TV Streaming",
  description:
    "Stream live sports matches and ZTV right from Zimbabwe. Pay per match with EcoCash or PayPal.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#FF416C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider>{children}</SessionProvider>
        <Toaster theme="dark" position="top-right" richColors closeButton />
        <RegisterSW />
      </body>
    </html>
  );
}
