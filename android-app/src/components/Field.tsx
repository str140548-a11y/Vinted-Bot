import React from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useTheme } from "../useTheme";
import { radius } from "../theme";

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  autoCapitalize?: "none" | "sentences";
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          backgroundColor: t.cardAlt,
          borderColor: t.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius.md,
          color: t.text,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 14,
        }}
      />
    </View>
  );
}

export function ToggleField({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 }}>
      <Text style={{ color: t.text, fontSize: 14, flex: 1 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: t.brand, false: t.border }}
        thumbColor="#ffffff"
      />
    </View>
  );
}
