import LandingClipMotion from "@/components/landing-clip-motion";
import type { Metadata } from "next";
import "./globals.css";
import "@/components/depth-motion.css";
import DepthMotion from "@/components/depth-motion";
import LandingProgrammes from "@/components/landing-programmes";
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
      <body>{children}<DepthMotion /><LandingClipMotion /><LandingProgrammes /></body>
    </html>
  );
}
