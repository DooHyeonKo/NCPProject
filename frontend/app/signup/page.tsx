"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/Logo";
import { register } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("고두현");
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("12345678");
  const [passwordConfirm, setPasswordConfirm] = useState("12345678");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password !== passwordConfirm) {
      setError("비밀번호가 서로 다릅니다.");
      return;
    }

    setLoading(true);

    try {
      const data = await register(email, password, name);
      setMessage(data.message);
      setTimeout(() => router.push("/login"), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.");
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
        <h1>회원가입</h1>

        <form className="form-card" onSubmit={onSubmit}>
          {error && <div className="error">{error}</div>}
          {message && <div className="success">{message}</div>}

          <label className="label">이름</label>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />

          <label className="label">이메일</label>
          <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />

          <label className="label">비밀번호</label>
          <input className="input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={8} required />

          <label className="label">비밀번호 확인</label>
          <input className="input" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} type="password" minLength={8} required />

          <button className="button dark" style={{ width: "100%", marginTop: 14 }} disabled={loading}>
            {loading ? "가입 중..." : "계정 만들기"}
          </button>

          <p className="form-note">
            이미 계정이 있나요? <Link href="/login">로그인</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
