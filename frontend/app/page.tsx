import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function HomePage() {
  return (
    <main className="page">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <Logo size="sm" />
            <span>A to ㄱ</span>
          </div>
          <nav className="nav">
            <Link href="/login">로그인</Link>
            <Link href="/signup">회원가입</Link>
          </nav>
        </div>
      </header>

      <section className="hero container">
        <div>
          <Logo size="lg" />
          <p className="kicker" style={{ marginTop: 26 }}>MATCHUP Document Translation</p>
          <h1>
            영어 문서를
            <br />
            학습 노트로 바꾸세요
          </h1>
          <p>
            문서 업로드, 번역, 요약, AI 질문, 개인 노트, 유사 문서 추천 등등
          </p>
          <Link href="/login" className="button primary">
            시작하기
          </Link>
        </div>
      </section>
    </main>
  );
}
