import "./globals.css";

export const metadata = {
  title: "Golf AI",
  description: "AI caddie, score, course and practice dashboard"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}