import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SEO } from "@/components/SEO";
import { Loader2, Users, Activity, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";

type VisitorRow = {
  id: string;
  archetype: string;
  first_seen_at: string;
  last_seen_at: string;
  first_utm_source: string | null;
  first_utm_campaign: string | null;
  first_referrer: string | null;
  first_landing_path: string | null;
  last_path: string | null;
  session_count: number;
  event_count: number;
  user_id: string | null;
};

type EventRow = {
  id: number;
  visitor_id: string;
  event_name: string;
  path: string | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
};

const ARCHETYPE_LABELS: Record<string, string> = {
  paying: "Paying",
  code_redeemer: "Code redeemer",
  signup_in_progress: "Signup in progress",
  pricing_considerer: "Pricing considerer",
  revenue_curious: "Revenue curious",
  policy_curious: "Policy curious",
  returning_browser: "Returning browser",
  new_visitor: "New visitor",
};

const ARCHETYPE_ORDER = [
  "paying",
  "code_redeemer",
  "signup_in_progress",
  "pricing_considerer",
  "revenue_curious",
  "policy_curious",
  "returning_browser",
  "new_visitor",
];

function countBy<T>(rows: T[], key: (r: T) => string | null | undefined) {
  const out = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) || "(unknown)";
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]);
}

export default function AdminArchetypes() {
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);

  const load = async () => {
    const { data: v } = await supabase
      .from("visitors")
      .select(
        "id, archetype, first_seen_at, last_seen_at, first_utm_source, first_utm_campaign, first_referrer, first_landing_path, last_path, session_count, event_count, user_id",
      )
      .order("last_seen_at", { ascending: false })
      .limit(1000);
    const { data: e } = await supabase
      .from("visitor_events")
      .select("id, visitor_id, event_name, path, metadata, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(50);
    setVisitors((v as VisitorRow[] | null) ?? []);
    setEvents((e as EventRow[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading visitor data…
      </div>
    );
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const last24 = visitors.filter(
    (v) => now - new Date(v.last_seen_at).getTime() < day,
  ).length;
  const last7 = visitors.filter(
    (v) => now - new Date(v.last_seen_at).getTime() < 7 * day,
  ).length;
  const signedIn = visitors.filter((v) => v.user_id).length;
  const conversionRate = visitors.length
    ? Math.round((signedIn / visitors.length) * 100)
    : 0;

  const archetypeCounts = new Map<string, number>();
  for (const v of visitors) {
    archetypeCounts.set(v.archetype, (archetypeCounts.get(v.archetype) ?? 0) + 1);
  }
  const maxArch = Math.max(1, ...[...archetypeCounts.values()]);

  const topSources = countBy(visitors, (v) =>
    v.first_utm_source || (v.first_referrer ? new URL(v.first_referrer).hostname : "direct"),
  ).slice(0, 8);
  const topLanding = countBy(visitors, (v) => v.first_landing_path).slice(0, 8);

  return (
    <div className="space-y-6">
      <SEO title="Archetypes - Admin" description="Live visitor archetype breakdown." path="/admin/archetypes" noindex />
      <div>
        <h1 className="text-2xl font-bold">Visitor archetypes</h1>
        <p className="text-muted-foreground text-sm">
          Passive segmentation across all visitors. Recomputed on every event.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi icon={<Users className="h-4 w-4" />} label="Total visitors" value={visitors.length} />
        <Kpi icon={<Activity className="h-4 w-4" />} label="Active (24h)" value={last24} />
        <Kpi icon={<Activity className="h-4 w-4" />} label="Active (7d)" value={last7} />
        <Kpi icon={<LinkIcon className="h-4 w-4" />} label="Signed-in rate" value={`${conversionRate}%`} />
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Archetype breakdown</h2>
        <div className="space-y-2">
          {ARCHETYPE_ORDER.map((key) => {
            const count = archetypeCounts.get(key) ?? 0;
            const pct = visitors.length ? Math.round((count / visitors.length) * 100) : 0;
            const width = `${Math.round((count / maxArch) * 100)}%`;
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="w-44 text-sm">{ARCHETYPE_LABELS[key] ?? key}</div>
                <div className="flex-1 h-3 bg-muted rounded">
                  <div className="h-3 bg-primary rounded" style={{ width }} />
                </div>
                <div className="w-24 text-right text-sm tabular-nums">
                  {count} <span className="text-muted-foreground">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Top sources</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Visitors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSources.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-muted-foreground">No data yet</TableCell></TableRow>
              ) : topSources.map(([src, n]) => (
                <TableRow key={src}><TableCell>{src}</TableCell><TableCell className="text-right tabular-nums">{n}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Top landing paths</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path</TableHead>
                <TableHead className="text-right">Visitors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topLanding.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-muted-foreground">No data yet</TableCell></TableRow>
              ) : topLanding.map(([p, n]) => (
                <TableRow key={p}><TableCell className="font-mono text-xs">{p}</TableCell><TableCell className="text-right tabular-nums">{n}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Recent events</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Visitor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-muted-foreground">No events yet</TableCell></TableRow>
            ) : events.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {format(new Date(e.occurred_at), "MMM d HH:mm:ss")}
                </TableCell>
                <TableCell><Badge variant="secondary">{e.event_name}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{e.path ?? ""}</TableCell>
                <TableCell className="font-mono text-xs">{e.visitor_id.slice(0, 8)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon} {label}
      </div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
    </Card>
  );
}