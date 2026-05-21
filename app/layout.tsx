import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Word-Mesh — Mots fléchés collaboratifs",
  description: "Résolvez des grilles de mots fléchés en temps réel avec vos amis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {/* Global navigation */}
        <header className="border-border/60 sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-serif text-lg font-semibold">
              Word-Mesh
            </Link>
            <Link
              href="/grids"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Grilles
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
