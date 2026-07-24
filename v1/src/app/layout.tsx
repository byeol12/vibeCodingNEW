import type { Metadata } from "next";
import { Gowun_Dodum, Jua } from "next/font/google";
import "./globals.css";

const gowunDodum = Gowun_Dodum({
  variable: "--font-gowun",
  weight: "400",
  subsets: ["latin"],
});

const jua = Jua({
  variable: "--font-jua",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "도장 스트릭",
    template: "%s | 도장 스트릭",
  },
  description: "선생님의 관찰과 학생의 자기관찰을 카드 보상으로 연결합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${gowunDodum.variable} ${jua.variable}`}>
      <body>{children}</body>
    </html>
  );
}
