import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "ff_visitor_id";
const FIRST_TOUCH_KEY = "ff_first_touch";
const SESSION_KEY = "ff_session_active";

type FirstTouch = {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  referrer?: string | null;
  landing_path?: string | null;
};

export type VisitorEvent =
  | "page_view"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "code_redeemed"
  | "pricing_view"
  | "checkout_started"
  | "checkout_completed"
  | "cta_click"
  | "form_submit";

function safeLS(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function safeSS(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (very rare in modern browsers)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getVisitorId(): string {
  const ls = safeLS();
  if (!ls) return uuid();
  let id = ls.getItem(VISITOR_KEY);
  if (!id) {
    id = uuid();
    ls.setItem(VISITOR_KEY, id);
  }
  return id;
}

function readFirstTouch(): FirstTouch | null {
  const ls = safeLS();
  if (!ls) return null;
  const raw = ls.getItem(FIRST_TOUCH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FirstTouch;
  } catch {
    return null;
  }
}

function captureFirstTouch(): FirstTouch {
  const existing = readFirstTouch();
  if (existing) return existing;
  const ls = safeLS();
  const params = new URLSearchParams(window.location.search);
  const ft: FirstTouch = {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_term: params.get("utm_term"),
    utm_content: params.get("utm_content"),
    referrer: document.referrer || null,
    landing_path: window.location.pathname || "/",
  };
  ls?.setItem(FIRST_TOUCH_KEY, JSON.stringify(ft));
  return ft;
}

let initialized = false;
let initPromise: Promise<void> | null = null;

export function initVisitor(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (typeof window === "undefined") return;
    const id = getVisitorId();
    const ft = captureFirstTouch();
    const ss = safeSS();
    const isNewSession = !ss?.getItem(SESSION_KEY);
    if (ss) ss.setItem(SESSION_KEY, "1");

    try {
      // Try to fetch existing row
      const { data: existing } = await supabase
        .from("visitors")
        .select("id, session_count")
        .eq("id", id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("visitors").insert({
          id,
          first_utm_source: ft.utm_source ?? null,
          first_utm_medium: ft.utm_medium ?? null,
          first_utm_campaign: ft.utm_campaign ?? null,
          first_utm_term: ft.utm_term ?? null,
          first_utm_content: ft.utm_content ?? null,
          first_referrer: ft.referrer ?? null,
          first_landing_path: ft.landing_path ?? null,
          last_path: window.location.pathname,
          user_agent: navigator.userAgent?.slice(0, 500) ?? null,
        });
      } else {
        await supabase
          .from("visitors")
          .update({
            last_seen_at: new Date().toISOString(),
            last_path: window.location.pathname,
            session_count: isNewSession
              ? (existing.session_count ?? 1) + 1
              : existing.session_count ?? 1,
          })
          .eq("id", id);
      }
    } catch {
      // best-effort
    }
    initialized = true;
  })();
  return initPromise;
}

export function track(
  eventName: VisitorEvent,
  metadata: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  const id = getVisitorId();
  const path = window.location.pathname;
  const ref = document.referrer || null;
  // Fire and forget
  void (async () => {
    try {
      if (!initialized) {
        await initVisitor();
      }
      await supabase.from("visitor_events").insert({
        visitor_id: id,
        event_name: eventName,
        path,
        referrer: ref,
        metadata: metadata as never,
      });
    } catch {
      // swallow
    }
  })();
}

export async function attachUser(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  try {
    const id = getVisitorId();
    await supabase.from("visitors").update({ user_id: userId }).eq("id", id);
  } catch {
    // swallow
  }
}