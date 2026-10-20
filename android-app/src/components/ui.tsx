import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { useTheme } from "../useTheme";
import { radius, spacing } from "../theme";

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.card,
          borderColor: t.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type BadgeTone = "brand" | "neutral" | "danger" | "warn" | "info";
export function Badge({ label, tone = "neutral" }: { label: string; tone?: BadgeTone }) {
  const t = useTheme();
  const map: Record<BadgeTone, { bg: string; fg: string }> = {
    brand: { bg: t.brandSoft, fg: t.brand },
    neutral: { bg: t.cardAlt, fg: t.textMuted },
    danger: { bg: "rgba(248,113,113,0.15)", fg: t.danger },
    warn: { bg: "rgba(251,191,36,0.15)", fg: t.warn },
    info: { bg: "rgba(96,165,250,0.15)", fg: t.info },
  };
  const c = map[tone];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text style={{ color: c.fg, fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const bg =
    variant === "primary" ? t.brand : variant === "danger" ? "transparent" : t.cardAlt;
  const fg =
    variant === "primary" ? "#ffffff" : variant === "danger" ? t.danger : t.text;
  const borderColor = variant === "danger" ? t.danger : t.border;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === "primary" ? 0 : StyleSheet.hairlineWidth,
          borderRadius: radius.md,
          paddingVertical: 12,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontWeight: "600", fontSize: 14 }}>{title}</Text>
    </Pressable>
  );
}

export function StateView({
  kind,
  message,
  onRetry,
}: {
  kind: "loading" | "error" | "empty";
  message?: string;
  onRetry?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md }}>
      {kind === "loading" && <ActivityIndicator color={t.brand} size="large" />}
      <Text style={{ color: kind === "error" ? t.danger : t.textMuted, textAlign: "center" }}>
        {message ??
          (kind === "loading" ? "Loading…" : kind === "empty" ? "Nothing here yet." : "Something went wrong.")}
      </Text>
      {kind === "error" && onRetry && <Button title="Retry" variant="secondary" onPress={onRetry} />}
    </View>
  );
}

export function Row({ label, value, valueColor }: { label: string; value: React.ReactNode; valueColor?: string }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        borderBottomColor: t.border,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 12,
      }}
    >
      <Text style={{ color: t.textMuted, fontSize: 13 }}>{label}</Text>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={{ color: valueColor ?? t.text, fontSize: 13, fontWeight: "500", flexShrink: 1, textAlign: "right" }}>
          {value}
        </Text>
      ) : (
        value
      )}
    </View>
  );
}
