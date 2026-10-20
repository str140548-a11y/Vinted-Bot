import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/api";
import { useApi } from "../../src/useApi";
import { useTheme } from "../../src/useTheme";
import { spacing } from "../../src/theme";
import { Badge, Button, Card, StateView } from "../../src/components/ui";
import { TextField, ToggleField } from "../../src/components/Field";
import { DeliveryPrefs } from "../../src/components/DeliveryPrefs";
import { registerForPush, unregisterPush } from "../../src/push";
import { API_BASE_URL } from "../../src/config";
import type { AppSettings } from "../../src/types";

const PUSH_TOKEN_KEY = "expoPushToken";

export default function SettingsScreen() {
  const t = useTheme();
  const { data, error, loading, refreshing, reload, refresh } = useApi<AppSettings>(
    () => api.get<AppSettings>("/api/settings"),
  );
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  const patch = useCallback(
    async (partial: Record<string, unknown>) => {
      try {
        await api.patch("/api/settings", partial);
        reload();
      } catch (e) {
        Alert.alert("Error", (e as Error).message);
      }
    },
    [reload],
  );

  const enablePush = async () => {
    setPushBusy(true);
    setPushMsg(null);
    const res = await registerForPush();
    if (res.ok && res.token) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, res.token);
      setPushMsg("Push enabled on this device ✓");
    } else {
      setPushMsg(res.reason ?? "Could not enable push.");
    }
    setPushBusy(false);
  };
  const disablePush = async () => {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await unregisterPush(token);
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
    setPushMsg("Push disabled on this device.");
  };

  if (loading && !data) return <StateView kind="loading" />;
  if (error && !data) return <StateView kind="error" message={error} onRetry={reload} />;
  const s = data!;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.brand} />}
    >
      {/* Connection */}
      <Card>
        <Text style={{ color: t.text, fontWeight: "700", fontSize: 15, marginBottom: 6 }}>Backend connection</Text>
        <Text style={{ color: t.textMuted, fontSize: 12 }}>API: {API_BASE_URL}</Text>
        <View style={{ flexDirection: "row", marginTop: spacing.sm }}>
          <Badge label={s.adapter === "mock" ? "Mock data" : "Live polling (unofficial)"} tone={s.adapter === "mock" ? "warn" : "brand"} />
        </View>
      </Card>

      {/* Notifications */}
      <Card>
        <Text style={{ color: t.text, fontWeight: "700", fontSize: 15, marginBottom: spacing.sm }}>Notifications</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Button title={pushBusy ? "Enabling…" : "Enable push"} onPress={enablePush} disabled={pushBusy} style={{ flex: 1 }} />
          <Button title="Disable" variant="secondary" onPress={disablePush} style={{ flex: 1 }} />
        </View>
        {pushMsg ? <Text style={{ color: t.textMuted, fontSize: 12, marginTop: spacing.sm }}>{pushMsg}</Text> : null}
        <View style={{ marginTop: spacing.sm }}>
          <ToggleField label="Notification sound" value={s.notificationSound} onValueChange={(v) => patch({ notificationSound: v })} />
          <ToggleField label="Group notifications" value={s.groupNotifications} onValueChange={(v) => patch({ groupNotifications: v })} />
        </View>
        <QuietHourSaver label="Save quiet-hours start" field="quietHoursStart" current={s.quietHoursStart} onSave={patch} />
        <QuietHourSaver label="Save quiet-hours end" field="quietHoursEnd" current={s.quietHoursEnd} onSave={patch} />
      </Card>

      {/* Buying */}
      <Card>
        <Text style={{ color: t.text, fontWeight: "700", fontSize: 15, marginBottom: spacing.sm }}>Buying & limits</Text>
        <NumberSaver label="Default max price" value={s.defaultMaxPrice} onSave={(v) => patch({ defaultMaxPrice: v })} />
        <NumberSaver label="Max total spend" value={s.maxTotalSpend} onSave={(v) => patch({ maxTotalSpend: v })} />
        <NumberSaver
          label="Inspection timer (minutes, local only)"
          value={Math.round(s.reviewWindowSec / 60)}
          onSave={(v) => patch({ reviewWindowSec: Math.max(30, (v ?? 15) * 60) })}
        />
        <ToggleField label="Quick Buy (opens Vinted faster)" value={s.quickBuyEnabled} onValueChange={(v) => patch({ quickBuyEnabled: v })} />
        <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 4 }}>
          The app never buys for you, stores cards, or bypasses bank 3-D Secure. It opens the real Vinted listing.
        </Text>
      </Card>

      {/* Monitoring cadence */}
      <Card>
        <Text style={{ color: t.text, fontWeight: "700", fontSize: 15, marginBottom: spacing.sm }}>Monitoring</Text>
        <NumberSaver
          label="Poll interval (seconds, min 30)"
          value={s.pollIntervalSec}
          onSave={(v) => patch({ pollIntervalSec: Math.max(30, v ?? 60) })}
        />
        <Text style={{ color: t.textMuted, fontSize: 11 }}>
          Runs on the backend. Alert latency is bounded by this interval — there is no real-time push from Vinted.
        </Text>
      </Card>

      {/* Delivery */}
      <Card>
        <Text style={{ color: t.text, fontWeight: "700", fontSize: 15, marginBottom: 2 }}>Pickup lockers</Text>
        <Text style={{ color: t.textMuted, fontSize: 11, marginBottom: spacing.sm }}>
          Saved as reminders for manual checkout. The app can&apos;t select a locker on Vinted for you.
        </Text>
        <DeliveryPrefs />
      </Card>
    </ScrollView>
  );
}

/** Number field with an explicit save button (avoids patching on every keystroke). */
function NumberSaver({ label, value, onSave }: { label: string; value: number | null; onSave: (v: number | null) => void }) {
  const [v, setV] = useState(value?.toString() ?? "");
  return (
    <View>
      <TextField label={label} value={v} onChangeText={setV} keyboardType="decimal-pad" />
      <Button
        title="Save"
        variant="secondary"
        onPress={() => onSave(v.trim() === "" ? null : Number(v))}
        style={{ marginTop: -4, marginBottom: 8, paddingVertical: 8 }}
      />
    </View>
  );
}

function QuietHourSaver({
  label,
  field,
  current,
  onSave,
}: {
  label: string;
  field: "quietHoursStart" | "quietHoursEnd";
  current: string | null;
  onSave: (p: Record<string, unknown>) => void;
}) {
  const [v, setV] = useState(current ?? "");
  return (
    <View style={{ marginBottom: 4 }}>
      <TextField label={label.replace("Save ", "")} value={v} onChangeText={setV} placeholder="HH:MM" />
      <Button title={label} variant="secondary" onPress={() => onSave({ [field]: v.trim() || null })} style={{ paddingVertical: 8 }} />
    </View>
  );
}
