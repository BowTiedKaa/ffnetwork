import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require an authenticated user — prevents anonymous AI credit drain.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user }, error: authErr } = await sb.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const {
      contactType = "unspecified",
      contactName = "",
      companyName = "",
      contactNotes = "",
      agency = "",
      yearsOfService = "",
      targetRole = "",
    } = body || {};

    const system = `You write short, plain-spoken professional outreach messages for a federal employee transitioning to tech. Rules you must follow:
- Under 80 words.
- Address the recipient by first name only.
- No filler phrases ("hope this finds you well", "I hope you're doing well", "I know you're busy").
- Include one specific observation tied to the contact's company or notes.
- Make a single, clear ask.
- Sign off with exactly "Best," on its own line — no name after it.
- No subject line, no preamble, no markdown — just the message body.`;

    const user = `Draft a message for this contact.

Contact type: ${contactType}
Contact first name (use only this): ${(contactName || "").split(" ")[0] || "there"}
Contact's company: ${companyName || "(unknown)"}
Notes about contact: ${contactNotes || "(none)"}

Sender background:
- ${yearsOfService || "(unspecified)"} years at ${agency || "(unspecified agency)"}
- Targeting: ${targetRole || "(unspecified target role)"} in tech

Tone guidance by contact type:
- trailblazer: ask how they navigated the transition; what they would do differently.
- connector: ask for their perspective and openness to introductions.
- reliable_recruiter: ask what their clients are looking for and how to position the sender's background.
- unspecified: a clear, specific 15-minute call ask.

Return ONLY the message body.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const message = data?.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("draft-message error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});