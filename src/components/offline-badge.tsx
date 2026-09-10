import { CloudOff, HardDrive } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

export function OfflineBadge({ variant = "default" }: { variant?: "default" | "sidebar" }) {
  const online = useOnline();
  const sidebar = variant === "sidebar";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-xs",
        sidebar
          ? "border border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground/80"
          : "border border-border bg-muted text-muted-foreground",
      )}
    >
      {online ? <HardDrive className="h-4 w-4 shrink-0" /> : <CloudOff className="h-4 w-4 shrink-0" />}
      <span className="leading-tight">
        <strong className="block font-semibold">{online ? "Datos guardados localmente" : "Modo offline"}</strong>
        Funciona sin internet
      </span>
    </div>
  );
}
