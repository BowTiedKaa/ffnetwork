import { corsHeaders } from "@supabase/supabase-js/cors";

const ADMIN_EMAIL = "support@theformerfed.com";

interface Payload {
  event: "signup" | "stripe_upgrade" | "code_redeemed";
  email?: string;
  fullName?: string | null;
  details?: Record<string, unknown>;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] as string));
}

function render(p: Payload): { subject: string; html: string } {
  const who = `${p.fullName ? escapeHtml(p.fullName) + " " : ""}${p.email ? `&lt;${escapeHtml(p.email)}&gt;` : ""}`;
  const detailsHtml = p.details
    ? `<pre style="background:#f1f5f9;padding:12px;border-radius:6px;font-size:12px;overflow:auto;">${escapeHtml(JSON.stringify(p.details, null, 2))}</pre>`
    : "";
  switch (p.event) {
    case "signup":
      return {
        subject: `[FF Network] New signup pending approval — ${p.email ?? "unknown"}`,
        html: `<p>A new free user just signed up and is pending your approval:</p><p><strong>${who}</strong></p><p><a href="https://ffnetwork.lovable.app/admin">Review in admin panel →</a></p>${detailsHtml}`,
      };
    case "stripe_upgrade":
      return {
        subject: `[FF Network] New Pro customer (Stripe) — ${p.email ?? "unknown"}`,
        html: `<p>A new Pro customer just paid via Stripe:</p><p><strong>${who}</strong></p>${detailsHtml}`,
      };
    case "code_redeemed":
      return {
        subject: `[FF Network] Access code redeemed — ${p.email ?? "unknown"}`,
        html: `<p>A user just redeemed an access code and upgraded to Pro:</p><p><strong>${who}</strong></p>${detailsHtml}`,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }
  try {
    const payload = (await req.json()) as Payload;
    if (!payload?.event) {
      return new Response(JSON.stringify({ error: "event required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      console.log("Resend not configured; skipping admin notification");
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = render(payload);
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "FF Network <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject,
        html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;font-size:14px;line-height:1.5;">${html}</div>`,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error("Resend admin notify failed:", res.status, txt);
      return new Response(JSON.stringify({ error: "send failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-admin error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});