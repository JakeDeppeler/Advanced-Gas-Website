"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV, ICON, type NavGroup, type NavItem } from "@/lib/homepage/data";
import { sendIntent } from "@/lib/homepage/intent";

/**
 * The header, with the product dropdowns Jake liked for finding a service. Kept to those, the phone and the quote button: the
 * calculators have their own section near the bottom of the homepage. Homepage and /find
 * pages only for now; the rest of the site keeps components/Header.tsx until Jake has
 * signed this one off.
 *
 * The dropdowns open on hover and on focus, in CSS, so they work before
 * hydration and from the keyboard. Picking a product on the homepage opens
 * the finder in place; anywhere else it's an ordinary link to /?find=…
 */
export function AgLogo({ size = "md" }: { size?: "md" | "sm" | "ft" }) {
  return (
    <span className={`alogo${size === "md" ? "" : ` alogo--${size}`}`}>
      <Image src="/advanced-gas-logo-clear.webp" alt="Advanced Gas & Aircon" width={600} height={200} priority={size !== "ft"} sizes="140px" />
    </span>
  );
}

export function PhoneIcon({ size = 17, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON.phone} />
    </svg>
  );
}


/**
 * `pill` floats over the homepage hero as a rounded bar the width of the page
 * content, so the logo sits over the headline and the buttons over the form.
 * `flat` is the full-width white bar the /find pages use.
 */
export function HomeHeader({ variant = "pill" }: { variant?: "pill" | "flat" }) {
  const onHome = usePathname() === "/";
  const [open, setOpen] = useState(false);
  // After a dropdown card is clicked the pointer is still over the menu, so
  // :hover would hold it open over the section it just scrolled to.
  const [shut, setShut] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  function close(label?: string) {
    setOpen(false);
    if (label) setShut(label);
    (document.activeElement as HTMLElement | null)?.blur?.();
  }

  function pick(e: React.MouseEvent, g: NavGroup, it?: NavItem) {
    if (!onHome) return close();
    const system = it?.find;
    if (!system && !g.footFind) return close(g.label);
    e.preventDefault();
    sendIntent(system ? { kind: "find", system } : { kind: "find", cat: g.footFind }, "find");
    close(g.label);
  }

  const quoteHref = onHome ? "#quote" : "/#quote";

  return (
    <header className={variant === "flat" ? "ahdr ahdr--flat is-solid" : "ahdr ahdr--pill"}>
      <div className="hbar">
        <Link href="/" className="hbar__logo" aria-label="Advanced Gas & Aircon home" onClick={() => close()}>
          <AgLogo />
        </Link>
        <nav className="hnav navx" aria-label="Main">
          {NAV.map((g) => {
            const has = g.items.length > 0;
            const footHref = g.footHref ?? (g.footFind ? `/?find=${g.footFind}#find` : g.href);
            return (
              <div key={g.label} className={`hd${has ? " hd--menu" : ""}${shut === g.label ? " is-shut" : ""}`} onMouseLeave={() => shut === g.label && setShut(null)}>
                <Link href={g.href} className="hd__top">
                  {g.label}
                  {has && <span className="hd__pm" aria-hidden="true" />}
                </Link>
                {has && (
                  <div className="hmega">
                    <div className="hmega__in">
                      {g.items.map((it) => (
                        <Link key={it.t} href={it.href} className="mcard" onClick={(e) => pick(e, g, it)}>
                          <span className={it.photo ? "mcard__ph" : "mcard__img"}>
                            <Image src={it.img} alt="" fill sizes="200px" style={it.pos ? { objectPosition: it.pos } : undefined} />
                          </span>
                          <strong>{it.t}</strong>
                          <span className="mcard__s">{it.s}</span>
                        </Link>
                      ))}
                      <a href={footHref} className="mcard mcard--cta" data-call-from={g.footHref ? "header-menu" : undefined} onClick={(e) => (g.footHref ? close(g.label) : pick(e, g))}>
                        <span className="mcard__head">{g.head}</span>
                        <strong>{g.foot}</strong>
                        <i aria-hidden="true">→</i>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="hbar__right">
          <a href="tel:+61359478000" className="hphone navx" data-call-from="header">
            <PhoneIcon color="#C2521A" />
            <span className="hphone__t"><small>Call now</small>(03) 5947 8000</span>
          </a>
          <Link href={quoteHref} className="hquote" onClick={() => close()}>Get free quote →</Link>
          <button type="button" className="menubtn" aria-label={open ? "Close menu" : "Menu"} aria-expanded={open} aria-controls="m-menu" onClick={() => setOpen((v) => !v)}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d={open ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div id="m-menu" className="mmenu">
          {NAV.map((g) => (
            <div key={g.label} className="mmenu__grp">
              <Link href={g.href} className="mmenu__head" onClick={() => close()}>
                {g.label} <i aria-hidden="true">→</i>
              </Link>
              {g.items.length > 0 && (
                <div className="mmenu__items">
                  {g.items.map((it) => (
                    <Link key={it.t} href={it.href} className="mmenu__item" onClick={(e) => pick(e, g, it)}>
                      <span className={`mmenu__th${it.photo ? " mmenu__th--ph" : ""}`}>
                        <Image src={it.img} alt="" fill sizes="34px" />
                      </span>
                      {it.t}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <a href="tel:+61359478000" className="abtn abtn--navy abtn--full" data-call-from="mobile-menu">Call (03) 5947 8000</a>
        </div>
      )}
    </header>
  );
}
