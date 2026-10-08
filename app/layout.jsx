import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

export const metadata = {
  title: "Golf AI",
  description: "AI caddie, score, course and practice dashboard",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Golf AI", statusBarStyle: "default" }
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0b5d3b" };

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
