import { useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { api } from "../../src/api";
import { useApi } from "../../src/useApi";
import { useTheme } from "../../src/useTheme";
import { spacing } from "../../src/theme";
import { Badge, Button, Card, StateView } from "../../src/components/ui";
import { relativeTime } from "../../src/format";
import { SearchFormModal } from "../../src/components/SearchFormModal";
import type { SavedSearch } from "../../src/types";

export default function SearchesScreen() {
  const t = useTheme();
  const { data, error, loading, refreshing, reload, refresh } = useApi<SavedSearch[]>(
    () => api.get<SavedSearch[]>("/api/searches"),
    { pollMs: 15000 },
  );
  const [editing, setEditing] = useState<SavedSearch | null>(null);
  const [creating, setCreating] = useState(false);

  const toggle = async (s: SavedSearch) => {
    try {
      await api.patch(`/api/searches/${s.id}`, { active: !s.active });
      reload();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  };
  const remove = (s: SavedSearch) => {
    Alert.alert("Delete search", `Delete "${s.name}"? This also removes its detected listings.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.del(`/api/searches/${s.id}`);
            reload();
          } catch (e) {
            Alert.alert("Error", (e as Error).message);
          }
        },
      },
    ]);
  };
  const duplicate = async (s: SavedSearch) => {
    try {
      await api.post(`/api/searches/${s.id}/duplicate`);
      reload();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  };

  if (loading && !data) return <StateView kind="loading" />;
  if (error && !data) return <StateView kind="error" message={error} onRetry={reload} />;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.brand} />}
        ListHeaderComponent={
          <Button title="+ New search" onPress={() => setCreating(true)} style={{ marginBottom: spacing.sm }} />
        }
        ListEmptyComponent={<StateView kind="empty" message="No saved searches yet. Create one to start monitoring." />}
        renderItem={({ item: s }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: t.text, fontWeight: "700", fontSize: 15 }}>{s.name}</Text>
                <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>
                  {[s.keywords, s.brand, s.size && `size ${s.size}`, s.maxPrice != null && `≤ ${s.maxPrice}`]
                    .filter(Boolean)
                    .join(" · ") || "no filters"}
                </Text>
              </View>
              <Badge label={s.active ? "Active" : "Paused"} tone={s.active ? "brand" : "neutral"} />
            </View>
            <Text style={{ color: t.textMuted, fontSize: 11, marginTop: spacing.sm }}>
              Last check: {relativeTime(s.lastCheckedAt)}
              {s.lastStatus ? ` (${s.lastStatus})` : ""}
            </Text>
            {s.lastError ? <Text style={{ color: t.danger, fontSize: 11, marginTop: 2 }}>{s.lastError}</Text> : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>
              <Button title="Edit" variant="secondary" onPress={() => setEditing(s)} style={{ flexGrow: 1 }} />
              <Button title={s.active ? "Pause" : "Resume"} variant="secondary" onPress={() => toggle(s)} style={{ flexGrow: 1 }} />
              <Button title="Duplicate" variant="secondary" onPress={() => duplicate(s)} style={{ flexGrow: 1 }} />
              <Button title="Delete" variant="danger" onPress={() => remove(s)} style={{ flexGrow: 1 }} />
            </View>
          </Card>
        )}
      />

      {(creating || editing) && (
        <SearchFormModal
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            reload();
          }}
        />
      )}
    </View>
  );
}
