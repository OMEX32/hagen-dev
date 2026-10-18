export function Icon({ name }: { name: "settings" | "today" | "food" | "training" | "progress" }) {
  const paths = {
    settings: <><path d="m9 3 1-1h4l1 3 3 1 3 2-1 3 1 3-3 2-3 1-1 3h-4l-1-3-3-1-3-2 1-3-1-3 3-2 3-1Z" /><circle cx="12" cy="11" r="3" /></>,
    today: <><rect x="4" y="5" width="16" height="16" rx="3" /><path d="M8 3v4m8-4v4M4 11h16m-11 5 2 2 4-4" /></>,
    food: <><path d="M5 3v6c0 3 5 3 5 0V3M7.5 3v18M19 21V3c-5 0-5 11 0 11" /></>,
    training: <><path d="M3 9v6m3-9v12m12-12v12m3-9v6M6 12h12" /></>,
    progress: <><path d="M4 4v16h16M8 15l4-5 4 2 4-6" /></>,
  };
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
