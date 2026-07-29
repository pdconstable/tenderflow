import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tender OS — Development foundation",
  description:
    "Tender OS application foundation. Environment validation, data-access boundaries and safety guards are in place; no product features are enabled yet.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
