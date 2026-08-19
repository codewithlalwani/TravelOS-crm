import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import { ClientBootEffects } from "@/components/ClientBootEffects";
import "./globals.css";

const heading = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flight Connect | Travel Tech CRM",
  description: "Booking authorization, payments, ticketing and invoicing in one screen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ClientBootEffects />
        <div className="flex-1">{children}</div>
        <footer className="px-4 py-3 text-center text-xs text-muted-foreground">
          Powered by Rinnovar Technologies
        </footer>
      </body>
    </html>
  );
}
