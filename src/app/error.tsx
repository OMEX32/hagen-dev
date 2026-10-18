"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="status-page"><h1>Couldn’t load your space.</h1><p className="muted">Check your connection and try again. If this is a fresh setup, check the connection values and apply the foundation migration.</p><button className="button primary" onClick={reset}>Try again</button></main>;
}
