import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, strategy = "mobile" } = await req.json();
    if (!url || typeof url !== "string" || !/^https?:\/\//.test(url)) {
      return new Response(JSON.stringify({ error: "Invalid url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["mobile", "desktop"].includes(strategy)) {
      return new Response(JSON.stringify({ error: "Invalid strategy" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_PAGESPEED_API_KEY");
    const params = new URLSearchParams();
    params.set("url", url);
    params.set("strategy", strategy);
    for (const c of CATEGORIES) params.append("category", c);
    if (apiKey) params.set("key", apiKey);

    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;
    const psiRes = await fetch(psiUrl);
    if (!psiRes.ok) {
      const text = await psiRes.text();
      if (psiRes.status === 429) {
        return new Response(
          JSON.stringify({
            error: "PageSpeed daily quota exceeded. Add a GOOGLE_PAGESPEED_API_KEY secret to get your own quota, or try again tomorrow.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: `PageSpeed API error: ${psiRes.status}`, detail: text.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const psi = await psiRes.json();
    const cats = psi?.lighthouseResult?.categories ?? {};
    const audits = psi?.lighthouseResult?.audits ?? {};
    const scores = {
      performance: cats.performance ? Math.round((cats.performance.score ?? 0) * 100) : null,
      accessibility: cats.accessibility ? Math.round((cats.accessibility.score ?? 0) * 100) : null,
      bestPractices: cats["best-practices"] ? Math.round((cats["best-practices"].score ?? 0) * 100) : null,
      seo: cats.seo ? Math.round((cats.seo.score ?? 0) * 100) : null,
    };
    const metrics = {
      fcp: audits["first-contentful-paint"]?.displayValue ?? null,
      lcp: audits["largest-contentful-paint"]?.displayValue ?? null,
      tbt: audits["total-blocking-time"]?.displayValue ?? null,
      cls: audits["cumulative-layout-shift"]?.displayValue ?? null,
      speedIndex: audits["speed-index"]?.displayValue ?? null,
    };

    const categoryLabels: Record<string, string> = {
      performance: "Performance",
      accessibility: "Accessibility",
      "best-practices": "Best practices",
      seo: "SEO",
    };
    const recommendations: Array<{
      category: string;
      categoryLabel: string;
      id: string;
      title: string;
      description: string;
      displayValue: string | null;
      score: number | null;
      scoreDisplayMode: string;
      weight: number;
    }> = [];
    for (const catKey of CATEGORIES) {
      const cat = cats[catKey];
      if (!cat?.auditRefs) continue;
      for (const ref of cat.auditRefs) {
        const audit = audits[ref.id];
        if (!audit) continue;
        const mode = audit.scoreDisplayMode;
        if (mode === "notApplicable" || mode === "manual" || mode === "informative") continue;
        const score = audit.score;
        if (score === null || score === undefined) continue;
        if (score >= 0.9) continue;
        recommendations.push({
          category: catKey,
          categoryLabel: categoryLabels[catKey] ?? catKey,
          id: ref.id,
          title: audit.title ?? ref.id,
          description: audit.description ?? "",
          displayValue: audit.displayValue ?? null,
          score,
          scoreDisplayMode: mode ?? "numeric",
          weight: ref.weight ?? 0,
        });
      }
    }
    recommendations.sort((a, b) => (a.score - b.score) || (b.weight - a.weight));

    return new Response(
      JSON.stringify({
        url,
        strategy,
        finalUrl: psi?.lighthouseResult?.finalUrl ?? url,
        fetchedAt: psi?.analysisUTCTimestamp ?? new Date().toISOString(),
        scores,
        metrics,
        recommendations,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});