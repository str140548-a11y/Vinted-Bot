import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { useApi } from "../useApi";
import { useTheme } from "../useTheme";
import { spacing } from "../theme";
import { Badge, Button, StateView } from "./ui";
import { TextField } from "./Field";
import type { PickupLocation } from "../types";

export function DeliveryPrefs() {
  const t = useTheme();
  const { data, error, loading, reload } = useApi<PickupLocation[]>(
    () => api.get<PickupLocation[]>("/api/pickup-locations"),
  );
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", provider: "", postcode: "", address: "" });

  const add = async () => {
    if (!form.name.trim()) return;
    try {
      await api.post("/api/pickup-locations", {
        name: form.name.trim(),
        provider: form.provider.trim() || null,
        postcode: form.postcode.trim() || null,
        address: form.address.trim() || null,
        priority: (data?.length ?? 0),
        isPrimary: (data?.length ?? 0) === 0,
      });
      setForm({ name: "", provider: "", postcode: "", address: "" });
      setAdding(false);
      reload();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  };
  const setPrimary = async (p: PickupLocation) => {
    try {
      await api.patch(`/api/pickup-locations/${p.id}`, { isPrimary: true });
      reload();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  };
  const toggle = async (p: PickupLocation) => {
    try {
      await api.patch(`/api/pickup-locations/${p.id}`, { enabled: !p.enabled });
      reload();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  };
  const remove = async (p: PickupLocation) => {
    try {
      await api.del(`/api/pickup-locations/${p.id}`);
      reload();
    } catch (e) {
      Alert.alert("Error", (e as Error).message);
    }
  };

  if (loading && !data) return <StateView kind="loading" />;
  if (error && !data) return <StateView kind="error" message={error} onRetry={reload} />;

  return (
    <View style={{ gap: spacing.sm }}>
      {(data ?? []).length === 0 && !adding ? (
        <Text style={{ color: t.textMuted, fontSize: 12 }}>No pickup locations saved yet.</Text>
      ) : null}

      {(data ?? []).map((p) => (
        <View
          key={p.id}
          style={{
            borderColor: t.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 10,
            padding: spacing.md,
            opacity: p.enabled ? 1 : 0.5,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: t.text, fontWeight: "600", flex: 1 }}>{p.name}</Text>
            {p.isPrimary ? <Badge label="Primary" tone="brand" /> : null}
          </View>
          <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 2 }}>
            {[p.provider, p.postcode, p.address].filter(Boolean).join(" · ") || "—"}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm }}>
            {!p.isPrimary ? <Button title="Set primary" variant="secondary" onPress={() => setPrimary(p)} style={{ paddingVertical: 6 }} /> : null}
            <Button title={p.enabled ? "Disable" : "Enable"} variant="secondary" onPress={() => toggle(p)} style={{ paddingVertical: 6 }} />
            <Button title="Delete" variant="danger" onPress={() => remove(p)} style={{ paddingVertical: 6 }} />
          </View>
        </View>
      ))}

      {adding ? (
        <View style={{ gap: 4 }}>
          <TextField label="Name *" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} />
          <TextField label="Provider (InPost, DPD…)" value={form.provider} onChangeText={(v) => setForm({ ...form, provider: v })} />
          <TextField label="Postcode" value={form.postcode} onChangeText={(v) => setForm({ ...form, postcode: v })} />
          <TextField label="Address" value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} />
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Button title="Add" onPress={add} style={{ flex: 1 }} />
            <Button title="Cancel" variant="secondary" onPress={() => setAdding(false)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <Button title="+ Add pickup location" variant="secondary" onPress={() => setAdding(true)} />
      )}
    </View>
  );
}
