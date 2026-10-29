import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-page">
          <div className="auth-card">
            <p>Giriş formu yükleniyor…</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
