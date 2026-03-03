import type { Metadata } from "next";
import { Sora, DM_Sans } from "next/font/google";
import "./globals.css";
import "./layout.css";
import { AuthProvider } from "../contexts/AuthContext";
import { MSWProvider } from "../mocks/MSWProvider";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eventos FADE UFPE",
  description: "Sistema de gerenciamento de eventos da FADE UFPE",
  icons: {
    icon: "/public/assets/fade_logo.png",
  },
};

const isMockEnabled = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${sora.variable} ${dmSans.variable}`}>
      <body>
        {isMockEnabled ? (
          <MSWProvider>
            <AuthProvider>{children}</AuthProvider>
          </MSWProvider>
        ) : (
          <AuthProvider>{children}</AuthProvider>
        )}
      </body>
    </html>
  );
}