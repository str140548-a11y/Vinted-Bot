import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "../useTheme";
import { radius, spacing } from "../theme";
import { Badge, Button } from "./ui";
import { conditionLabel, money, relativeTime } from "../format";
import type { Listing } from "../types";

export function ListingCard({
  listing,
  footer,
}: {
  listing: Listing;
  footer?: React.ReactNode;
}) {
  const t = useTheme();
  const open = () => WebBrowser.openBrowserAsync(listing.url).catch(() => {});

  return (
    <View
      style={{
        backgroundColor: t.card,
        borderColor: t.border,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: radius.lg,
        overflow: "hidden",
      }}
    >
      <Pressable onPress={open}>
        <View style={{ aspectRatio: 1, backgroundColor: t.cardAlt }}>
          {listing.imageUrl ? (
            <Image source={{ uri: listing.imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>No image</Text>
            </View>
          )}
          <View style={{ position: "absolute", top: 8, left: 8, flexDirection: "row", gap: 6 }}>
            <Badge
              label={listing.availability === "available" ? "Available" : listing.availability === "sold" ? "Sold" : "Unknown"}
              tone={listing.availability === "available" ? "brand" : listing.availability === "sold" ? "danger" : "neutral"}
            />
            {listing.source === "mock" ? <Badge label="mock" tone="warn" /> : null}
          </View>
        </View>
      </Pressable>

      <View style={{ padding: spacing.md, gap: 6 }}>
        <Text numberOfLines={2} style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
          {listing.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={{ color: t.brand, fontSize: 18, fontWeight: "800" }}>{money(listing.price, listing.currency)}</Text>
          {listing.totalCost != null ? (
            <Text style={{ color: t.textMuted, fontSize: 11 }}>~{money(listing.totalCost, listing.currency)} total</Text>
          ) : null}
        </View>
        <Text style={{ color: t.textMuted, fontSize: 11 }}>
          {[listing.brand, listing.size && `Size ${listing.size}`, conditionLabel(listing.condition)].filter(Boolean).join(" · ")}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: 11 }}>
          {listing.sellerName ? `${listing.sellerName}${listing.sellerRating != null ? ` · ★ ${listing.sellerRating.toFixed(1)}` : ""} · ` : ""}
          Seen {relativeTime(listing.firstSeenAt)}
        </Text>
        {listing.matchReason ? (
          <Text numberOfLines={2} style={{ color: t.brand, fontSize: 11, backgroundColor: t.brandSoft, borderRadius: 6, padding: 6 }}>
            {listing.matchReason}
          </Text>
        ) : null}
        <Button title="Open on Vinted" variant="secondary" onPress={open} style={{ marginTop: 4 }} />
        {footer}
      </View>
    </View>
  );
}
