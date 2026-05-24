import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolio Council — your AI investment board",
  description:
    "A 5-agent adversarial review framework built on gitclaw. Agents argue every portfolio decision; the deliberation is committed to git as an immutable audit trail.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              background: "rgb(24 24 27)",
              border: "1px solid rgb(63 63 70)",
              color: "rgb(244 244 245)",
              fontFamily: "var(--font-geist-sans)",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
