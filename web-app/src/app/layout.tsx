import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Waste Right — A little care. A cleaner tomorrow.",
  description:
    "Identify everyday waste, read packaging labels, and find disposal guidance grounded in your local guide.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
