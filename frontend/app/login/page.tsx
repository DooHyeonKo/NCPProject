"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/Logo";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Logo size="lg" />
        </div>
        <h1>로그인</h1>

        <form className="form-card" onSubmit={onSubmit}>
          {error && <div className="error">{error}</div>}

          <label className="label">이메일</label>
          <input
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            required
          />

          <label className="label">비밀번호</label>
          <input
            className="input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호"
            type="password"
            required
          />

          <button className="button primary" style={{ width: "100%", marginTop: 14 }} disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>

          <p className="form-note">
            아직 계정이 없나요? <Link href="/signup">회원가입</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
