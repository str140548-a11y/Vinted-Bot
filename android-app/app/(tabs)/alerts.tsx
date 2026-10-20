import { useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { api } from "../../src/api";
import { useApi } from "../../src/useApi";
import { useTheme } from "../../src/useTheme";
import { spacing } from "../../src/theme";
import { Button, StateView } from "../../src/components/ui";
import { ListingCard } from "../../src/components/ListingCard";
import type { Listing } from "../../src/types";

type Filter = "all" | "available" | "today";

export default function AlertsScreen() {
  const t = useTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const qs = filter === "available" ? "?availability=available" : filter === "today" ? "?today=1" : "";

  const { data, error, loading, refreshing, reload, refresh } = useApi<Listing[]>(
    () => api.get<Listing[]>(`/api/listings${qs}`),
    { pollMs: 10000, deps: [filter] },
  );

  const startCheckout = async (l: Listing) => {
    try {
      await api.post("/api/checkout", { listingId: l.id });
      Alert.alert("Added to checkout queue", "Open the Checkout tab to inspect and buy on Vinted.");
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  };

  if (loading && !data) return <StateView kind="loading" />;
  if (error && !data) return <StateView kind="error" message={error} onRetry={reload} />;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.lg, paddingBottom: 0 }}>
        {(["all", "available", "today"] as Filter[]).map((f) => (
          <Button
            key={f}
            title={f[0].toUpperCase() + f.slice(1)}
            variant={filter === f ? "primary" : "secondary"}
            onPress={() => setFilter(f)}
            style={{ flex: 1, paddingVertical: 8 }}
          />
        ))}
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(l) => l.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.brand} />}
        ListEmptyComponent={
          <StateView
            kind="empty"
            message="No listings yet. Run a check from Home (or start the backend worker). Mock mode surfaces demo items every few checks."
          />
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1, maxWidth: "48.5%" }}>
            <ListingCard
              listing={item}
              footer={<Button title="Checkout" onPress={() => startCheckout(item)} style={{ marginTop: 6 }} />}
            />
          </View>
        )}
      />
    </View>
  );
}
