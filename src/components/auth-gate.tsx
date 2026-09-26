import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { LogOut } from "lucide-react";

import { supabase, supabaseConfigured } from "@/lib/supabase";
import { useHydrated } from "@/components/client-only";

export function AuthGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!hydrated || checking) return null;
  if (!session) return <LoginScreen />;
  return <>{children}</>;
}

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      setError(
        error.message.toLowerCase().includes("invalid")
          ? "Email o contraseña incorrectos."
          : navigator.onLine
            ? "No se pudo iniciar sesión. Intentá nuevamente."
            : "Sin conexión. Conectate a internet para iniciar sesión.",
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-8">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <div className="flex flex-col items-center bg-gradient-to-br from-primary via-primary to-accent px-6 py-8 text-center text-white">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white p-3 shadow-xl">
            <img src="/logo-san-lorenzo.png" alt="Escudo San Lorenzo" className="max-h-full max-w-full object-contain" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold uppercase tracking-wide">
            Área Nutricional
          </h1>
          <p className="mt-1 text-sm text-white/80">Primera División · Fútbol Femenino</p>
        </div>
        <div className="flex h-1.5">
          <div className="w-1/2 bg-primary" />
          <div className="w-1/2 bg-accent" />
        </div>

        {!supabaseConfigured ? (
          <p className="p-6 text-sm text-muted-foreground">
            Falta configurar la conexión de inicio de sesión.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-6">
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Contraseña</span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Ingresando…" : "Iniciar sesión"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function SignOutButton() {
  async function signOut() {
    if (!supabase) return;
    if (!window.confirm("¿Cerrar sesión?")) return;
    await supabase.auth.signOut();
  }
  return (
    <button
      type="button"
      onClick={signOut}
      className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
    >
      <LogOut className="h-3.5 w-3.5" />
      Cerrar sesión
    </button>
  );
}
