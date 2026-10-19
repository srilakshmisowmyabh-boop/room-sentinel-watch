import { Link } from "@tanstack/react-router";
import { Menu, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useGuard } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Home" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/monitor", label: "Live Monitor" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/events", label: "Events" },
  { to: "/settings", label: "Settings" },
  { to: "/about", label: "About" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand glow">
        <ShieldCheck className="h-5 w-5 text-primary-foreground" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight">SENSE<span className="text-gradient"> GUARD</span></span>
    </Link>
  );
}

function RoleSwitch() {
  const { role, setRole } = useGuard();
  return (
    <div className="flex items-center rounded-full border border-border bg-muted/60 p-0.5 text-xs" title="Demo role switch — not real security">
      <span className="px-2 font-mono text-[10px] uppercase tracking-wider text-warning">Demo</span>
      {(["owner", "viewer"] as const).map((r) => (
        <button key={r} onClick={() => setRole(r)}
          className={cn("rounded-full px-2.5 py-1 font-semibold capitalize transition", role === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          {r}
        </button>
      ))}
    </div>
  );
}

export function Nav() {
  const { theme, toggleTheme, mode } = useGuard();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 xl:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: l.to === "/" }}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
              activeProps={{ className: "!text-foreground bg-accent" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {mode === "ALARM" && <span className="hidden rounded-full bg-danger px-2.5 py-1 font-mono text-xs font-bold text-destructive-foreground animate-pulse sm:inline">ALARM</span>}
          <div className="hidden md:block"><RoleSwitch /></div>
          <button onClick={toggleTheme} aria-label="Toggle theme" className="grid h-9 w-9 place-items-center rounded-lg border border-border transition hover:bg-accent">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link to="/login" className="hidden h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:inline-flex">
            <UserRound className="h-4 w-4" /> Login
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button aria-label="Open menu" className="grid h-9 w-9 place-items-center rounded-lg border border-border xl:hidden"><Menu className="h-4 w-4" /></button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-border bg-background">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="mt-8 flex flex-col gap-1">
                {links.map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setOpen(false)} activeOptions={{ exact: l.to === "/" }}
                    className="rounded-lg px-3 py-2.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    activeProps={{ className: "!text-foreground bg-accent" }}>{l.label}</Link>
                ))}
                <Link to="/login" onClick={() => setOpen(false)} className="mt-3 rounded-lg bg-primary px-3 py-2.5 text-center font-semibold text-primary-foreground">Login</Link>
                <div className="mt-4"><RoleSwitch /></div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">Smart Home Security Using RUView — a privacy-first, camera-free presence sensing college engineering project.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {links.map((l) => <Link key={l.to} to={l.to} className="text-muted-foreground hover:text-foreground">{l.label}</Link>)}
        </div>
        <div className="text-sm text-muted-foreground md:text-right">
          <p>Built with ESP32 · RUView · React</p>
          <p className="mt-2 font-mono text-xs">This interface runs on simulated demo data. No live hardware is connected.</p>
        </div>
      </div>
    </footer>
  );
}
