import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowLeft, Bot, Compass, LogIn, LogOut, Menu, X } from "lucide-react";
import { Button } from "../ui/Button";
import { logout, observeAuthState } from "../../services/auth";

const links = [
  ["Product", "/shop"],
  ["Agent Commerce", "/agent"],
  ["Merchant", "/merchant"],
  ["Architecture", "/architecture"],
];

function navClass(isActive: boolean) {
  return [
    "relative rounded-md px-3 py-2 text-sm font-medium transition",
    isActive ? "bg-gold/15 text-ember shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_28px_rgba(109,93,251,0.14)]" : "text-ivory/[0.64] hover:bg-white/[0.06] hover:text-ivory",
  ].join(" ");
}

export function Nav() {
  const location = useLocation();
  const [signedIn, setSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => observeAuthState((user) => {
    setSignedIn(Boolean(user));
    setAuthReady(true);
  }), []);

  const authAction = signedIn ? (
    <Button variant="ghost" icon={<LogOut size={16} />} onClick={() => logout()}>
      Sign out
    </Button>
  ) : (
    <Link to="/login" onClick={() => setOpen(false)}>
      <Button variant="ghost" disabled={!authReady} icon={<LogIn size={16} />}>
        Sign in
      </Button>
    </Link>
  );
  const startTour = () => {
    setOpen(false);
    window.dispatchEvent(new Event("nexora:start-tour"));
  };
  const authPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/[0.72] shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <nav className="nx-page flex items-center justify-between py-3">
        <Link to="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-md border border-gold/30 bg-gold/10 text-sm font-black text-ember shadow-[0_0_30px_rgba(109,93,251,0.18),inset_0_1px_0_rgba(255,255,255,0.12)] transition group-hover:shadow-[0_0_40px_rgba(72,224,255,0.18),inset_0_1px_0_rgba(255,255,255,0.14)]">N</span>
          <span>
            <span className="block text-sm font-semibold tracking-[0.18em] text-ivory">NEXORA</span>
            <span className="block text-[10px] uppercase tracking-[0.18em] text-ivory/[0.42]">Agent Commerce</span>
          </span>
        </Link>
        {authPage ? (
          <Link to="/" className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ivory/[0.64] transition hover:bg-white/[0.06] hover:text-ivory">
            <ArrowLeft size={16} /> Back to home
          </Link>
        ) : (
          <>
        <div className="hidden items-center gap-1 md:flex">
          {links.map(([label, to]) => (
            <NavLink key={to} to={to} className={({ isActive }) => navClass(isActive)}>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="secondary" icon={<Compass size={16} />} onClick={startTour}>
            Product Tour
          </Button>
          {authAction}
          <Link to="/agent">
            <Button icon={<Bot size={16} />}>Launch Agent</Button>
          </Link>
        </div>
        <button className="rounded-md border border-line bg-white/[0.06] p-2 text-ivory md:hidden" aria-label="Toggle navigation" onClick={() => setOpen((value) => !value)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
          </>
        )}
      </nav>
      {open && !authPage ? (
        <div className="border-t border-line bg-ink/95 px-4 pb-4 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 pt-3">
            {links.map(([label, to]) => (
              <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => navClass(isActive)}>
                {label}
              </NavLink>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Button className="w-full" variant="secondary" icon={<Compass size={16} />} onClick={startTour}>
                Product Tour
              </Button>
              {authAction}
              <Link to="/agent" onClick={() => setOpen(false)}>
                <Button className="w-full" icon={<Bot size={16} />}>Launch Agent</Button>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
