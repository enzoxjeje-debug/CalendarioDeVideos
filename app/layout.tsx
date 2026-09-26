import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VideoCal · Calendario compartido de videos",
  description:
    "Calendario colaborativo para dos personas: asignen en rojo los videos pendientes, confirmen en verde los que ya están listos y consulten el estado de cada día de un vistazo.",
  applicationName: "VideoCal",
  keywords: [
    "calendario",
    "videos",
    "GGDROP",
    "LLAVEDROP",
    "contenido",
    "colaborativo",
    "GSAP",
  ],
  authors: [{ name: "VideoCal" }],
  openGraph: {
    title: "VideoCal · Calendario compartido de videos",
    description:
      "Rojo: video asignado. Verde: video listo. Sin color: día libre. Un calendario para organizar quién publica qué video cada día.",
    type: "website",
    locale: "es_ES",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#05060d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${mono.variable}`}>
      <body>
        <a
          href="#calendario"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-brand-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Ir al calendario
        </a>
        {children}
      </body>
    </html>
  );
}
