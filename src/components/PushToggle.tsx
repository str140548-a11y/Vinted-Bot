"use client";

import { useEffect, useState } from "react";
import { apiGet, apiSend } from "@/lib/client";
import { IconBell } from "./icons";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    apiGet<{ vapidPublicKey: string | null; configured: boolean }>("/api/push/subscribe").then((d) => {
      setConfigured(d.configured);
      setVapidKey(d.vapidPublicKey);
    });
    if (ok) {
      navigator.serviceWorker.getRegistration().then(async (reg) => {
        const sub = await reg?.pushManager.getSubscription();
        setSubscribed(Boolean(sub));
      });
    }
  }, []);

  const enable = async () => {
    setStatus("Requesting permission…");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus("Permission denied.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!) as BufferSource,
      });
      const json = sub.toJSON();
      await apiSend("/api/push/subscribe", "POST", {
        endpoint: json.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      });
      setSubscribed(true);
      setStatus("Browser push enabled ✓");
    } catch (e) {
      setStatus(`Failed: ${(e as Error).message}`);
    }
  };

  if (!supported) {
    return (
      <div className="card p-3 text-sm text-slate-500">
        This browser doesn&apos;t support push notifications. In-app notifications still work.
      </div>
    );
  }

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="text-sm">
        <p className="font-medium">Browser push notifications</p>
        <p className="text-slate-500">
          {!configured
            ? "Not configured — set VAPID keys in .env to enable (see README)."
            : subscribed
              ? "This device is subscribed."
              : "Get alerts even when this tab isn't focused."}
        </p>
        {status && <p className="mt-1 text-xs text-brand-600">{status}</p>}
      </div>
      <button className="btn-primary" onClick={enable} disabled={!configured || subscribed}>
        <IconBell width={16} height={16} />
        {subscribed ? "Enabled" : "Enable push"}
      </button>
    </div>
  );
}
