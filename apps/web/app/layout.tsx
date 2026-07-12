import type { Metadata, Viewport } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Dianis Outfit",
  description: "Tu asistente personal de estilo",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#B89B5E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body className={`${inter.variable} ${playfair.variable} font-sans overflow-x-hidden w-full`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
