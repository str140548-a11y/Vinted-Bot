import { useState } from "react";
import { Alert, FlatList, Image, RefreshControl, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { api } from "../../src/api";
import { useApi } from "../../src/useApi";
import { useTheme } from "../../src/useTheme";
import { spacing, radius } from "../../src/theme";
import { Badge, Button, Card, StateView } from "../../src/components/ui";
import { Countdown } from "../../src/components/Countdown";
import { conditionLabel, money, relativeTime, toDate } from "../../src/format";
import type { CheckoutSession } from "../../src/types";

export default function CheckoutScreen() {
  const t = useTheme();
  const [tab, setTab] = useState<"active" | "history">("active");
  const { data, error, loading, refreshing, reload, refresh } = useApi<CheckoutSession[]>(
    () => api.get<CheckoutSession[]>("/api/checkout"),
    { pollMs: 5000 },
  );

  const openAndLaunch = async (s: CheckoutSession) => {
    try {
      await api.patch(`/api/checkout/${s.id}`, { status: "launched" });
      await api.post("/api/purchases", { listingId: s.listing.id, status: "intended" });
      await WebBrowser.openBrowserAsync(s.listing.url);
      reload();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  };
  const report = async (s: CheckoutSession, status: "completed" | "abandoned") => {
    try {
      await api.patch(`/api/checkout/${s.id}`, { status });
      await api.post("/api/purchases", {
        listingId: s.listing.id,
        status: status === "completed" ? "confirmed" : "abandoned",
      });
      reload();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  };

  if (loading && !data) return <StateView kind="loading" />;
  if (error && !data) return <StateView kind="error" message={error} onRetry={reload} />;

  const active = (data ?? []).filter((r) => r.status === "inspecting" || r.status === "launched");
  const history = (data ?? []).filter((r) => r.status === "completed" || r.status === "abandoned");
  const list = tab === "active" ? active : history;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.lg, paddingBottom: 0 }}>
        <Button title={`Active (${active.length})`} variant={tab === "active" ? "primary" : "secondary"} onPress={() => setTab("active")} style={{ flex: 1 }} />
        <Button title={`History (${history.length})`} variant={tab === "history" ? "primary" : "secondary"} onPress={() => setTab("history")} style={{ flex: 1 }} />
      </View>

      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.brand} />}
        ListHeaderComponent={
          tab === "active" ? (
            <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: spacing.sm, lineHeight: 18 }}>
              Assisted checkout. This app can&apos;t reserve items or open Vinted&apos;s checkout for you —
              any temporary hold is created by Vinted when you tap Buy now there.
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <StateView
            kind="empty"
            message={tab === "active" ? "No active checkouts. Tap Checkout on an alert to start one." : "No checkout history yet."}
          />
        }
        renderItem={({ item: s }) => {
          const started = toDate(s.inspectionStartedAt);
          const inspectExpiry =
            started && s.inspectionDurationSec ? new Date(started.getTime() + s.inspectionDurationSec * 1000) : null;
          return (
            <Card>
              <View style={{ flexDirection: "row", gap: spacing.md }}>
                <View style={{ width: 90, height: 112, borderRadius: radius.md, overflow: "hidden", backgroundColor: t.cardAlt }}>
                  {s.listing.imageUrl ? (
                    <Image source={{ uri: s.listing.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={{ color: t.text, fontWeight: "600" }}>{s.listing.title}</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <StatusBadge status={s.status} />
                    <Badge
                      label={s.listing.availability === "available" ? "Available" : "Status unknown"}
                      tone={s.listing.availability === "available" ? "brand" : "neutral"}
                    />
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 4 }}>
                    {[s.listing.brand, s.listing.size && `Size ${s.listing.size}`, conditionLabel(s.listing.condition)].filter(Boolean).join(" · ")}
                  </Text>
                  <Text style={{ color: t.brand, fontWeight: "800", fontSize: 16, marginTop: 4 }}>
                    {money(s.listing.price, s.listing.currency)}
                    {s.listing.totalCost != null ? (
                      <Text style={{ color: t.textMuted, fontSize: 11, fontWeight: "400" }}>  ~{money(s.listing.totalCost, s.listing.currency)} total</Text>
                    ) : null}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 2 }}>Seen {relativeTime(s.listing.firstSeenAt)}</Text>
                </View>
              </View>

              {inspectExpiry && s.status === "inspecting" ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm }}>
                  <Text style={{ color: t.textMuted, fontSize: 11, flex: 1 }}>
                    Personal inspection timer (local only — Vinted has NOT reserved this item):
                  </Text>
                  <Countdown expiresAt={inspectExpiry} />
                </View>
              ) : null}

              {s.status === "inspecting" || s.status === "launched" ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>
                  <Button title={s.status === "launched" ? "Reopen on Vinted" : "Checkout on Vinted"} onPress={() => openAndLaunch(s)} style={{ flexGrow: 1 }} />
                  {s.status === "launched" ? (
                    <Button title="I bought it" variant="secondary" onPress={() => report(s, "completed")} style={{ flexGrow: 1 }} />
                  ) : null}
                  <Button title="Abandon" variant="danger" onPress={() => report(s, "abandoned")} style={{ flexGrow: 1 }} />
                </View>
              ) : (
                <Button
                  title="Reopen listing"
                  variant="secondary"
                  onPress={() => WebBrowser.openBrowserAsync(s.listing.url)}
                  style={{ marginTop: spacing.md }}
                />
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "completed" ? "brand" : status === "launched" ? "info" : status === "abandoned" ? "neutral" : "warn";
  const label =
    status === "inspecting" ? "Inspecting" : status === "launched" ? "Opened on Vinted" : status === "completed" ? "Bought" : "Abandoned";
  return <Badge label={label} tone={tone as "brand" | "info" | "neutral" | "warn"} />;
}
