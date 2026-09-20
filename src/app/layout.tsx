import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Noto_Sans_Bengali, Poppins } from "next/font/google";
import "./globals.css";

// Canonical Shikho Bengali and Latin families, self-hosted by Next.js.
const hind = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  variable: "--font-hind",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
const readableBangla = Noto_Sans_Bengali({ subsets: ["bengali", "latin"], variable: "--font-bangla-readable", display: "swap", weight: ["400", "500", "600", "700"] });
const poppins = Poppins({ subsets: ["latin"], variable: "--font-poppins", display: "swap", weight: ["400", "500", "600", "700"] });

const shareTitle = "চাকা ঘোরাও, চমক জেতো! | শিখো স্পিন";
const shareDescription = "ফ্রি স্পিনে জেতো HSC 28 কোর্সে ছাড়, ব্যাগ অথবা বই। সাথে থাকছে জাতীয় EduTab ড্র-তে এন্ট্রি!";
const shareImage = { url: "/brand/shikho-spin-og-v1.jpg", width: 1200, height: 630, alt: "শিখো স্পিন: চাকা ঘোরাও, চমক জেতো! কোর্সে ছাড়, ব্যাগ, বই এবং পৃথক জাতীয় EduTab ড্র।" };
export const metadata: Metadata = {
  metadataBase: new URL("https://shikho-alo.vercel.app"),
  title: shareTitle,
  description: shareDescription,
  applicationName: "শিখো স্পিন",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: shareTitle,
    description: shareDescription,
    siteName: "শিখো স্পিন",
    locale: "bn_BD",
    type: "website",
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: shareTitle,
    description: shareDescription,
    images: [shareImage],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
  // Deliberately not viewportFit: "cover" - Chrome for iPhone lays an
  // edge-to-edge page out under its own toolbar, which hid the top of the
  // Champs hero when opened from a link. Same trap applies here.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${hind.variable} ${poppins.variable} ${readableBangla.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
