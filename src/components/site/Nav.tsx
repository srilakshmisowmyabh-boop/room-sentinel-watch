import { Link } from "@tanstack/react-router";
import { LogOut, Menu, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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

const navCls = "relative rounded-full px-3 py-2 text-sm text-muted-foreground outline-none transition-all duration-200 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const navActiveBase = "!bg-primary/15 !text-primary font-semibold after:absolute after:rounded-full after:bg-primary";
const navActive = `${navActiveBase} after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2`;
const navActiveMobile = `${navActiveBase} after:right-4 after:top-1/2 after:h-1.5 after:w-1.5 after:-translate-y-1/2`;

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
  const { role, signedIn, demo, setDemo } = useGuard();
  return (
    <div className="flex items-center gap-2 text-xs">
      {signedIn && <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 font-semibold capitalize">{role}</span>}
      <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-muted/60 px-2.5 py-1" title="Use simulated data instead of live sensors">
        <span className={cn("font-mono text-[10px] uppercase tracking-wider", demo ? "text-warning" : "text-muted-foreground")}>Demo</span>
        <Switch checked={demo} onCheckedChange={setDemo} aria-label="Demo mode" />
      </label>
    </div>
  );
}

function AuthButton({ onClick, mobile }: { onClick?: () => void; mobile?: boolean }) {
  const { signedIn, signOut } = useGuard();
  const cls = mobile ? "mt-3 rounded-lg bg-primary px-3 py-2.5 text-center font-semibold text-primary-foreground" : "hidden h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:inline-flex";
  if (signedIn) return <button onClick={() => { onClick?.(); signOut(); }} className={cls}>{!mobile && <LogOut className="h-4 w-4" />} Sign out</button>;
  return <Link to="/login" onClick={onClick} className={cls}>{!mobile && <UserRound className="h-4 w-4" />} Login</Link>;
}

function useLinks() {
  const { role, signedIn } = useGuard();
  return signedIn && role === "owner" ? [...links.slice(0, 6), { to: "/activity", label: "Activity" } as const, links[6]] : links;
}

export function Nav() {
  const { theme, toggleTheme, mode } = useGuard();
  const navLinks = useLinks();
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-[100] border-b border-border bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 xl:flex">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: l.to === "/" }}
              className={navCls}
              activeProps={{ className: navActive, "aria-current": "page" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {mode === "ALARM" && <span className="hidden rounded-full bg-danger px-2.5 py-1 font-mono text-xs font-bold text-destructive-foreground animate-pulse sm:inline">ALARM</span>}
          <div className="hidden md:block"><RoleSwitch /></div>
          <button onClick={toggleTheme} aria-label="Toggle theme" className="grid h-9 w-9 place-items-center rounded-lg border border-border outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <AuthButton />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button aria-label="Open menu" className="grid h-9 w-9 place-items-center rounded-lg border border-border outline-none transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring xl:hidden"><Menu className="h-4 w-4" /></button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-border bg-background">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="mt-8 flex flex-col gap-1">
                {navLinks.map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setOpen(false)} activeOptions={{ exact: l.to === "/" }}
                    className={cn(navCls, "rounded-xl py-2.5 text-base")}
                    activeProps={{ className: navActiveMobile, "aria-current": "page" }}>{l.label}</Link>
                ))}
                <AuthButton mobile onClick={() => setOpen(false)} />
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
          <p className="mt-2 font-mono text-xs">Live data from your ESP32 nodes. Turn on Demo mode for simulated data.</p>
        </div>
      </div>
    </footer>
  );
}
