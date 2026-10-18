"use client";
import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter, unstable_rethrow } from "next/navigation";
import { setRestTimer } from "./actions";
import { remainingSeconds } from "./domain";
export function RestTimer({ id, deadline }: { id: string; deadline: string | null }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const retry = useRef<{ duration: number; requestId: string } | null>(null);
  useEffect(() => {
    const update = () => setSeconds(remainingSeconds(deadline));
    update();
    const timer = window.setInterval(update, 500);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("pageshow", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); window.removeEventListener("pageshow", update); };
  }, [deadline]);
  const save = (duration: number) => {
    if (busy.current) return;
    busy.current = true;
    const requestId = retry.current?.duration === duration ? retry.current.requestId : crypto.randomUUID();
    retry.current = { duration, requestId };
    const form = new FormData(); form.set("id", id); form.set("seconds", String(duration)); form.set("request_id", requestId);
    startTransition(async () => {
      setError("");
      try {
        const result = await setRestTimer(form);
        if (result.error) setError(result.error);
        else { retry.current = null; router.refresh(); }
      } catch (error) { unstable_rethrow(error); setError("Timer wasn’t saved. Check your connection and retry."); }
      finally { busy.current = false; }
    });
  };
  return <section className="card"><h2>Rest timer</h2><p className="timer-display" role="timer" aria-label="Rest remaining">{seconds === null ? "—" : Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0")}</p>
    <p role="status" className="muted">{deadline && seconds === 0 ? "Rest time has elapsed." : "Keeps time when you leave and return."}</p>
    <div className="timer-controls"><button type="button" className="button secondary" disabled={pending} onClick={() => save(60)}>Rest 60s</button><button type="button" className="button secondary" disabled={pending} onClick={() => save(90)}>Rest 90s</button><button type="button" className="button secondary" disabled={pending} onClick={() => save(0)}>Clear timer</button></div>{error && <p className="notice error" role="alert">{error}</p>}
    <p className="footnote">No background alarm. Check the timer when you return.</p>
  </section>;
}
