import type { Metadata } from "next";
import { Quicksand, Nunito, Archivo, Inter, Playfair_Display, Baloo_2, Mulish } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({ variable: "--font-quicksand", subsets: ["latin"], weight: ["500", "600", "700"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], weight: ["400", "700", "900"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "600", "700"] });
const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["500", "600", "700"] });
const mulish = Mulish({ variable: "--font-mulish", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trade Website Generator",
  description: "Generate a custom website for your trade business in minutes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${quicksand.variable} ${nunito.variable} ${archivo.variable} ${inter.variable} ${playfair.variable} ${baloo.variable} ${mulish.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
