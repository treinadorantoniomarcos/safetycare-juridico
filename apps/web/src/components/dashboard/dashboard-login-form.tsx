"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DashboardLoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Informe login e senha.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dashboard/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });
      const payload = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        if (payload.error === "dashboard_auth_not_configured") {
          setError("Painel nao configurado. Defina login, senha e DATABASE_URL no ambiente.");
          return;
        }

        if (payload.error === "invalid_credentials") {
          setError("Login ou senha invalidos.");
          return;
        }

        setError("Falha ao autenticar. Tente novamente.");
        return;
      }

      startTransition(() => {
        router.push("/painel-executivo");
      });
    } catch {
      setError("Falha de conexao. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>Login</span>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Seu usuario"
        />
      </label>

      <label className="field">
        <span>Senha</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Sua senha"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button type="submit" className="button-primary form-submit" disabled={isSubmitting || isPending}>
        {isSubmitting || isPending ? "Entrando..." : "Entrar no painel"}
      </button>
    </form>
  );
}

