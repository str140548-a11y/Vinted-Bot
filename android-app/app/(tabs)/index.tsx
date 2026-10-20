import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../../src/api";
import { useApi } from "../../src/useApi";
import { useTheme } from "../../src/useTheme";
import { spacing, radius } from "../../src/theme";
import { Badge, Button, Card, Row, StateView } from "../../src/components/ui";
import { relativeTime } from "../../src/format";
import type { HealthResponse } from "../../src/types";

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { data, error, loading, refreshing, reload, refresh } = useApi<HealthResponse>(
    () => api.get<HealthResponse>("/api/health"),
    { pollMs: 10000 },
  );

  const checkNow = useCallback(async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await api.post<{ searches: number; results: { newMatches: number }[] }>("/api/monitor");
      const matched = r.results.reduce((a, x) => a + x.newMatches, 0);
      setMsg(`Checked ${r.searches} search(es) · ${matched} new match(es)`);
      reload();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [reload]);

  if (loading && !data) return <StateView kind="loading" />;
  if (error && !data) return <StateView kind="error" message={error} onRetry={reload} />;

  const o = data?.overview;
  const h = data?.health;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.brand} />}
    >
      {/* Monitoring status */}
      <Card>
        <View style={styles.rowBetween}>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: "700" }}>Monitoring</Text>
          {h && (
            <Badge
              label={h.adapterSource === "mock" ? "MOCK DATA" : "LIVE (unofficial)"}
              tone={h.adapterSource === "mock" ? "warn" : "brand"}
            />
          )}
        </View>
        {h && (
          <View style={{ marginTop: spacing.sm }}>
            <Row label="Last check" value={relativeTime(h.lastRunAt)} />
            <Row label="Last success" value={relativeTime(h.lastSuccessAt)} />
            <Row label="Total checks" value={h.totalChecks} />
            <Row label="Total matches" value={h.totalMatches} />
            <Row
              label="Consecutive errors"
              value={h.consecutiveErrors}
              valueColor={h.consecutiveErrors > 0 ? t.danger : undefined}
            />
            {h.lastError ? <Row label="Last error" value={h.lastError} valueColor={t.danger} /> : null}
          </View>
        )}
        <Button title={busy ? "Checking…" : "Check now"} onPress={checkNow} disabled={busy} style={{ marginTop: spacing.md }} />
        {msg ? <Text style={{ color: t.textMuted, marginTop: spacing.sm, fontSize: 12 }}>{msg}</Text> : null}
      </Card>

      {/* Stat grid */}
      <View style={styles.grid}>
        <Stat label="Active searches" value={o?.activeSearches} onPress={() => router.push("/(tabs)/searches")} />
        <Stat label="Detected today" value={o?.detectedToday} onPress={() => router.push("/(tabs)/alerts")} />
        <Stat label="Available" value={o?.availableMatches} onPress={() => router.push("/(tabs)/alerts")} />
        <Stat label="Active checkouts" value={o?.underReview} onPress={() => router.push("/(tabs)/checkout")} />
      </View>

      {/* Honest note */}
      <Card style={{ backgroundColor: t.cardAlt }}>
        <Text style={{ color: t.text, fontWeight: "600", marginBottom: 6 }}>How this works</Text>
        <Text style={{ color: t.textMuted, fontSize: 12, lineHeight: 18 }}>
          Monitoring runs on your backend server — not on the phone. Android can&apos;t guarantee a
          continuously running background task, so the server polls and sends you a push when a match
          appears. Vinted has no public API; the live source is unofficial. Checkout opens the real
          Vinted listing — the app never reserves items or pays for you.
        </Text>
      </Card>
    </ScrollView>
  );

  function Stat({ label, value, onPress }: { label: string; value?: number; onPress: () => void }) {
    return (
      <Card style={[styles.statCard, { borderRadius: radius.lg }]}>
        <Text style={{ color: t.text, fontSize: 24, fontWeight: "800" }}>{value ?? "—"}</Text>
        <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>{label}</Text>
        <Button title="View" variant="secondary" onPress={onPress} style={{ marginTop: spacing.sm, paddingVertical: 8 }} />
      </Card>
    );
  }
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  statCard: { flexGrow: 1, flexBasis: "47%", minWidth: 140 },
});
