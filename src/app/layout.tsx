import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Aparté",
  description: "Choisissez un film à deux, sans y passer 30 minutes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <header className="border-b border-ink/15 bg-paper">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
            <Link
              href="/"
              className="font-display text-xl tracking-tight"
            >
              Apart<span className="text-accent">é</span>
            </Link>
            <Link
              href="/history"
              className="text-xs font-medium uppercase tracking-[0.15em] text-ink/50 transition-colors hover:text-ink"
            >
              Historique
            </Link>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
