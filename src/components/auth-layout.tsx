import { Brand } from "./brand";
import type { ReactNode } from "react";
export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="auth-page"><Brand /><div className="auth-intro"><p className="eyebrow">A little progress, every day</p><h1>{title}</h1><p className="muted">{description}</p></div><section className="card">{children}</section><p className="auth-footer">Your routine. Your pace. Your private space.</p></main>;
}
