import Link from "next/link";
import { Brand } from "./brand";
import { Icon } from "./icon";
import type { ReactNode } from "react";

export function Shell({ children, settings = false, food = false }: { children: ReactNode; settings?: boolean; food?: boolean }) {
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="app-header"><Brand /><Link className={`icon-button ${settings ? "active" : ""}`} href="/settings" aria-label="Settings" aria-current={settings ? "page" : undefined}><Icon name="settings" /></Link></header>
    <main id="main" className="app-main">{children}</main>
    <nav className="bottom-nav" aria-label="Main navigation">
      <Link href="/today" aria-current={settings || food ? undefined : "page"}><Icon name="today" /><span>Today</span></Link>
      <Link href="/food" aria-current={food ? "page" : undefined}><Icon name="food" /><span>Food</span></Link>
      <span aria-disabled="true"><Icon name="training" /><span>Training</span><small>Later</small></span>
      <span aria-disabled="true"><Icon name="progress" /><span>Progress</span><small>Later</small></span>
    </nav>
  </div>;
}
