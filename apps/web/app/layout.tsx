import type { Metadata } from "next";
import { Inter, DM_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: {
    default: "QueueFlow — Distributed Job Queue",
    template: "%s | QueueFlow",
  },
  description:
    "Production-grade distributed job scheduling platform for managing background jobs, queues, and workers.",
  keywords: ["job scheduler", "queue", "distributed", "background jobs"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
