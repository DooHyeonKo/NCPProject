import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MATCHUP A to ㄱ",
  description: "문서 번역 학습 지원 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
