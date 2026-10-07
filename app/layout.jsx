import "./globals.css";

export const metadata = {
  title: "Golf AI",
  description: "AI caddie, score, course and practice dashboard",\n  manifest: "/manifest.webmanifest",\n  themeColor: "#0b5d3b",\n  appleWebApp: {capable:true,title:"Golf AI",statusBarStyle:"default"}
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}