import { useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { api } from "../api";
import { useTheme } from "../useTheme";
import { spacing } from "../theme";
import { Button } from "./ui";
import { TextField, ToggleField } from "./Field";
import { parseJsonArray } from "../format";
import { buildSearchPayload } from "../searchPayload";
import type { SavedSearch } from "../types";

export function SearchFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: SavedSearch | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTheme();
  const [f, setF] = useState({
    name: initial?.name ?? "",
    keywords: initial?.keywords ?? "",
    brand: initial?.brand ?? "",
    category: initial?.category ?? "",
    size: initial?.size ?? "",
    minPrice: initial?.minPrice?.toString() ?? "",
    maxPrice: initial?.maxPrice?.toString() ?? "",
    maxTotalCost: initial?.maxTotalCost?.toString() ?? "",
    preferredBrands: parseJsonArray(initial?.preferredBrands).join(", "),
    excludedKeywords: parseJsonArray(initial?.excludedKeywords).join(", "),
    active: initial?.active ?? true,
    alertPriceDrops: initial?.alertPriceDrops ?? false,
    notify: initial?.notify ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const payload = buildSearchPayload(f);
      if (initial) await api.patch(`/api/searches/${initial.id}`, payload);
      else await api.post("/api/searches", payload);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: 4 }}>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: "700", marginBottom: spacing.md }}>
            {initial ? "Edit search" : "New search"}
          </Text>
          {err ? <Text style={{ color: t.danger, marginBottom: spacing.sm }}>{err}</Text> : null}

          <TextField label="Name *" value={f.name} onChangeText={(v) => set("name", v)} placeholder="North Face fleece under €40" />
          <TextField label="Keywords" value={f.keywords} onChangeText={(v) => set("keywords", v)} placeholder="fleece jacket" autoCapitalize="none" />
          <TextField label="Brand" value={f.brand} onChangeText={(v) => set("brand", v)} />
          <TextField label="Category" value={f.category} onChangeText={(v) => set("category", v)} />
          <TextField label="Size" value={f.size} onChangeText={(v) => set("size", v)} />
          <TextField label="Min price" value={f.minPrice} onChangeText={(v) => set("minPrice", v)} keyboardType="decimal-pad" />
          <TextField label="Max price" value={f.maxPrice} onChangeText={(v) => set("maxPrice", v)} keyboardType="decimal-pad" />
          <TextField label="Max total cost (incl. fees)" value={f.maxTotalCost} onChangeText={(v) => set("maxTotalCost", v)} keyboardType="decimal-pad" />
          <TextField label="Preferred brands (comma-separated)" value={f.preferredBrands} onChangeText={(v) => set("preferredBrands", v)} />
          <TextField label="Excluded keywords (comma-separated)" value={f.excludedKeywords} onChangeText={(v) => set("excludedKeywords", v)} placeholder="kids, damaged, replica" />

          <ToggleField label="Active" value={f.active} onValueChange={(v) => set("active", v)} />
          <ToggleField label="Alert on price drops" value={f.alertPriceDrops} onValueChange={(v) => set("alertPriceDrops", v)} />
          <ToggleField label="Send notifications" value={f.notify} onValueChange={(v) => set("notify", v)} />

          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.lg }}>
            <Button title="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            <Button title={busy ? "Saving…" : "Save"} onPress={submit} disabled={busy || !f.name.trim()} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
