import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Empleos FUNDAP", template: "%s · Empleos FUNDAP" },
  description: "Trabaja en FUNDAP: vacantes en microcrédito, educación, salud y más en Guatemala.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-GT" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
