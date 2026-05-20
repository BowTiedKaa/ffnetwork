import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Gauge, Smartphone, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

type Strategy = "mobile" | "desktop";

interface ScanResult {
  url: string;
  strategy: Strategy;
  finalUrl: string;
  fetchedAt: string;
  scores: {
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    seo: number | null;
  };
  metrics: {
    fcp: string | null;
    lcp: string | null;
    tbt: string | null;
    cls: string | null;
    speedIndex: string | null;
  };
}

const defaultUrl =
  typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? window.location.origin
    : "https://notify.theformerfed.com";

const scoreColor = (score: number | null) => {
  if (score === null) return "text-muted-foreground";
  if (score >= 90) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-destructive";
};

const ScoreCard = ({ label, score }: { label: string; score: number | null }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>{label}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-2">
      <div className={`text-4xl font-bold ${scoreColor(score)}`}>{score ?? "—"}</div>
      <Progress value={score ?? 0} />
    </CardContent>
  </Card>
);

const SeoScan = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState(defaultUrl);
  const [strategy, setStrategy] = useState<Strategy>("mobile");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);

  const runScan = async () => {
    setLoading(true);
    setProgress(8);
    setResult(null);
    const interval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.max(1, Math.round((92 - p) / 12)) : p));
    }, 700);
    try {
      const { data, error } = await supabase.functions.invoke("pagespeed-scan", {
        body: { url, strategy },
      });
      if (error) throw new Error(error.message);
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setResult(data as ScanResult);
      setProgress(100);
    } catch (e) {
      toast({
        title: "Scan failed",
        description: e instanceof Error ? e.message : "Could not run PageSpeed scan.",
        variant: "destructive",
      });
    } finally {
      clearInterval(interval);
      setLoading(false);
      setTimeout(() => setProgress(0), 1200);
    }
  };

  return (
    <>
      <SEO
        title="Run SEO scan — FF Network"
        description="Run a one-click Lighthouse SEO and performance scan via Google PageSpeed Insights."
        path="/seo-scan"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Gauge className="h-7 w-7" /> SEO scan
          </h1>
          <p className="text-muted-foreground mt-1">
            One-click Lighthouse scan via Google PageSpeed Insights.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Run a scan</CardTitle>
            <CardDescription>Enter a public URL and choose a device profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={loading}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={strategy === "mobile" ? "secondary" : "outline"}
                  onClick={() => setStrategy("mobile")}
                  disabled={loading}
                  className="gap-2"
                >
                  <Smartphone className="h-4 w-4" /> Mobile
                </Button>
                <Button
                  type="button"
                  variant={strategy === "desktop" ? "secondary" : "outline"}
                  onClick={() => setStrategy("desktop")}
                  disabled={loading}
                  className="gap-2"
                >
                  <Monitor className="h-4 w-4" /> Desktop
                </Button>
              </div>
              <Button onClick={runScan} disabled={loading || !url} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Scanning…
                  </>
                ) : (
                  <>
                    <Gauge className="h-4 w-4" /> Run SEO scan
                  </>
                )}
              </Button>
            </div>
            {loading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground">
                  Lighthouse scans typically take 20–40 seconds.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Scanned <span className="font-medium text-foreground">{result.finalUrl}</span> ·{" "}
              {result.strategy} · {new Date(result.fetchedAt).toLocaleString()}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ScoreCard label="Performance" score={result.scores.performance} />
              <ScoreCard label="Accessibility" score={result.scores.accessibility} />
              <ScoreCard label="Best practices" score={result.scores.bestPractices} />
              <ScoreCard label="SEO" score={result.scores.seo} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Core metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  {[
                    ["First Contentful Paint", result.metrics.fcp],
                    ["Largest Contentful Paint", result.metrics.lcp],
                    ["Total Blocking Time", result.metrics.tbt],
                    ["Cumulative Layout Shift", result.metrics.cls],
                    ["Speed Index", result.metrics.speedIndex],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-semibold">{value ?? "—"}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

export default SeoScan;