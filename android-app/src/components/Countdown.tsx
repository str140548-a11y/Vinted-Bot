import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useTheme } from "../useTheme";
import { mmss } from "../format";

/**
 * Local countdown. Honest: it's a personal inspection timer, NOT a Vinted
 * reservation. Turns amber under 5 min, red under 1 min.
 */
export function Countdown({ expiresAt }: { expiresAt: string | number | Date }) {
  const t = useTheme();
  const target = new Date(expiresAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, Math.round((target - now) / 1000));
  const color = remaining <= 60 ? t.danger : remaining <= 300 ? t.warn : t.brand;

  return <Text style={{ color, fontWeight: "800", fontVariant: ["tabular-nums"] }}>{mmss(remaining)}</Text>;
}
