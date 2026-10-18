import Link from "next/link";
export function Brand() {
  return <Link href="/today" className="brand" aria-label="Hagen home"><span className="brand-mark" aria-hidden="true">h</span>hagen<span className="brand-dot" aria-hidden="true">.</span></Link>;
}
