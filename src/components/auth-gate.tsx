import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type {
  Session,
} from "@supabase/supabase-js";

import {
  Cloud,
  LogOut,
  RefreshCw,
} from "lucide-react";

import {
  supabase,
  supabaseConfigured,
} from "@/lib/supabase";

import {
  hasLocalData,
  syncCloudToLocal,
} from "@/lib/cloud-sync";

import {
  useHydrated,
} from "@/components/client-only";

/* ============================================================
   AUTH GATE
============================================================ */

export function AuthGate({
  children,
}: {
  children: ReactNode;
}) {
  const hydrated =
    useHydrated();

  const [
    session,
    setSession,
  ] =
    useState<Session | null>(
      null,
    );

  const [
    checking,
    setChecking,
  ] =
    useState(true);

  const [
    syncing,
    setSyncing,
  ] =
    useState(false);

  const [
    syncMessage,
    setSyncMessage,
  ] =
    useState(
      "Preparando datos...",
    );

  const [
    syncError,
    setSyncError,
  ] =
    useState<
      string | null
    >(null);

  const [
    canUseLocalCopy,
    setCanUseLocalCopy,
  ] =
    useState(false);

  const [
    localMode,
    setLocalMode,
  ] =
    useState(false);

  const mounted =
    useRef(true);

  /*
   * Evita repetir una sincronización
   * completa por eventos internos como
   * la renovación automática del token.
   */
  const syncedUserId =
    useRef<
      string | null
    >(null);

  async function prepareSession(
    nextSession:
      | Session
      | null,
    force = false,
  ) {
    if (
      !mounted.current
    ) {
      return;
    }

    setSession(
      nextSession,
    );

    if (!nextSession) {
      syncedUserId.current =
        null;

      setSyncing(false);
      setSyncError(null);
      setCanUseLocalCopy(
        false,
      );
      setLocalMode(false);
      setChecking(false);

      return;
    }

    /*
     * Si ya sincronizamos este mismo
     * usuario durante esta apertura,
     * no volvemos a hacerlo por una
     * simple renovación del token.
     */
    if (
      !force &&
      syncedUserId.current ===
        nextSession.user.id
    ) {
      setChecking(false);

      return;
    }

    setChecking(false);
    setSyncError(null);
    setCanUseLocalCopy(
      false,
    );
    setLocalMode(false);

    /* ========================================================
       SIN INTERNET
    ======================================================== */

    if (
      typeof navigator !==
        "undefined" &&
      !navigator.onLine
    ) {
      const local =
        await hasLocalData();

      if (
        !mounted.current
      ) {
        return;
      }

      if (local) {
        /*
         * Este dispositivo ya posee
         * una copia local anterior.
         *
         * Permitimos trabajar con ella.
         */
        syncedUserId.current =
          nextSession.user.id;

        setLocalMode(true);
        setSyncing(false);

        return;
      }

      setSyncing(false);

      setSyncError(
        "Este dispositivo todavía no tiene una copia de los datos y no hay conexión a internet.",
      );

      return;
    }

    /* ========================================================
       SINCRONIZAR SUPABASE -> DISPOSITIVO
    ======================================================== */

    try {
      setSyncing(true);

      setSyncMessage(
        "Conectando con Supabase...",
      );

      await syncCloudToLocal(
        (message) => {
          if (
            mounted.current
          ) {
            setSyncMessage(
              message,
            );
          }
        },
      );

      if (
        !mounted.current
      ) {
        return;
      }

      syncedUserId.current =
        nextSession.user.id;

      setSyncing(false);
      setSyncError(null);
      setLocalMode(false);
    } catch (error) {
      console.error(
        error,
      );

      const local =
        await hasLocalData();

      if (
        !mounted.current
      ) {
        return;
      }

      setSyncing(false);

      setCanUseLocalCopy(
        local,
      );

      setSyncError(
        error instanceof Error
          ? error.message
          : "No se pudieron actualizar los datos desde Supabase.",
      );
    }
  }

  /* ==========================================================
     INICIALIZAR SESIÓN
  ========================================================== */

  useEffect(() => {
    mounted.current =
      true;

    if (!supabase) {
      setChecking(false);

      return () => {
        mounted.current =
          false;
      };
    }

    void (async () => {
      const {
        data,
        error,
      } =
        await supabase.auth.getSession();

      if (
        !mounted.current
      ) {
        return;
      }

      if (error) {
        console.error(
          error,
        );

        setChecking(false);

        return;
      }

      await prepareSession(
        data.session,
      );
    })();

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (
          event,
          nextSession,
        ) => {
          /*
           * TOKEN_REFRESHED ocurre
           * periódicamente y no requiere
           * volver a descargar toda la base.
           */
          if (
            event ===
            "TOKEN_REFRESHED"
          ) {
            setSession(
              nextSession,
            );

            return;
          }

          void prepareSession(
            nextSession,
          );
        },
      );

    return () => {
      mounted.current =
        false;

      listener.subscription.unsubscribe();
    };
  }, []);

  /* ==========================================================
     PANTALLAS INTERMEDIAS
  ========================================================== */

  if (
    !hydrated ||
    checking
  ) {
    return null;
  }

  if (!session) {
    return (
      <LoginScreen />
    );
  }

  if (syncing) {
    return (
      <SyncScreen
        message={
          syncMessage
        }
      />
    );
  }

  if (
    syncError &&
    !localMode
  ) {
    return (
      <SyncErrorScreen
        message={
          syncError
        }
        canUseLocalCopy={
          canUseLocalCopy
        }
        onRetry={() => {
          void prepareSession(
            session,
            true,
          );
        }}
        onUseLocal={() => {
          syncedUserId.current =
            session.user.id;

          setLocalMode(
            true,
          );

          setSyncError(
            null,
          );
        }}
      />
    );
  }

  return (
    <>
      {localMode && (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">
          Sin conexión: usando la copia guardada en este dispositivo.
        </div>
      )}

      {children}
    </>
  );
}

/* ============================================================
   LOGIN
============================================================ */

function LoginScreen() {
  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  async function submit(
    e: FormEvent,
  ) {
    e.preventDefault();

    if (!supabase) {
      return;
    }

    setError(null);
    setLoading(true);

    const {
      error:
        signInError,
    } =
      await supabase.auth.signInWithPassword(
        {
          email:
            email.trim(),

          password,
        },
      );

    setLoading(false);

    if (
      signInError
    ) {
      setError(
        signInError.message
          .toLowerCase()
          .includes(
            "invalid",
          )
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
            <img
              src="/logo-san-lorenzo.png"
              alt="Escudo San Lorenzo"
              className="max-h-full max-w-full object-contain"
            />
          </div>

          <h1 className="mt-5 font-display text-2xl font-bold uppercase tracking-wide">
            Área Nutricional
          </h1>

          <p className="mt-1 text-sm text-white/80">
            Primera División · Fútbol Femenino
          </p>
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
          <form
            onSubmit={
              submit
            }
            className="space-y-4 p-6"
          >
            <label className="block">
              <span className="text-sm font-medium">
                Email
              </span>

              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(
                  e,
                ) =>
                  setEmail(
                    e.target
                      .value,
                  )
                }
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">
                Contraseña
              </span>

              <input
                type="password"
                required
                autoComplete="current-password"
                value={
                  password
                }
                onChange={(
                  e,
                ) =>
                  setPassword(
                    e.target
                      .value,
                  )
                }
                className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            {error && (
              <p className="text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading
              }
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading
                ? "Ingresando…"
                : "Iniciar sesión"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SINCRONIZANDO
============================================================ */

function SyncScreen({
  message,
}: {
  message: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 text-center shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Cloud className="h-7 w-7" />
        </div>

        <h2 className="mt-4 font-display text-xl font-semibold">
          Actualizando datos
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          {message}
        </p>

        <RefreshCw className="mx-auto mt-5 h-5 w-5 animate-spin text-primary" />

        <p className="mt-4 text-xs text-muted-foreground">
          No cierres la aplicación.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   ERROR DE SINCRONIZACIÓN
============================================================ */

function SyncErrorScreen({
  message,
  canUseLocalCopy,
  onRetry,
  onUseLocal,
}: {
  message: string;
  canUseLocalCopy: boolean;
  onRetry: () => void;
  onUseLocal: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl">
        <h2 className="font-display text-xl font-semibold">
          No se pudieron actualizar los datos
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          {message}
        </p>

        <button
          type="button"
          onClick={
            onRetry
          }
          className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          Reintentar
        </button>

        {canUseLocalCopy && (
          <button
            type="button"
            onClick={
              onUseLocal
            }
            className="mt-2 w-full rounded-lg border border-input bg-background px-4 py-3 text-sm font-semibold"
          >
            Usar copia local
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   CERRAR SESIÓN
============================================================ */

export function SignOutButton() {
  async function signOut() {
    if (!supabase) {
      return;
    }

    if (
      !window.confirm(
        "¿Cerrar sesión?",
      )
    ) {
      return;
    }

    await supabase.auth.signOut();
  }

  return (
    <button
      type="button"
      onClick={
        signOut
      }
      className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
    >
      <LogOut className="h-3.5 w-3.5" />
      Cerrar sesión
    </button>
  );
}
