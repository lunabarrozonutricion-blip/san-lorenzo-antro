import { useEffect, useState, type ReactNode } from "react";

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function ClientOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return <>{fallback ?? <div className="p-6 text-sm text-muted-foreground">Cargando datos locales…</div>}</>;
  return <>{children}</>;
}
