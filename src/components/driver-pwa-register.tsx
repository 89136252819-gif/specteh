"use client";

import { useEffect, useState } from "react";
import { getPushPublicKey, removePushSubscription, savePushSubscription } from "@/actions/push";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function DriverPwaRegister() {
  const [pushHint, setPushHint] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/driver-sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;

    async function enablePush() {
      try {
        const reg = await navigator.serviceWorker.ready;
        const { publicKey } = await getPushPublicKey();
        if (!publicKey) return;

        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
        }
        if (permission !== "granted") {
          setPushHint("Разрешите уведомления, чтобы получать новые заявки без SMS");
          return;
        }

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }
        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
        await savePushSubscription({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        });
        setPushHint("");
      } catch {
        setPushHint("Push пока недоступен на этом устройстве");
      }
    }

    void enablePush();

    return () => {
      /* keep subscription */
    };
  }, []);

  return (
    <>
      <link href="/driver-manifest.webmanifest" rel="manifest" />
      <meta content="#4e5864" name="theme-color" />
      <meta content="yes" name="mobile-web-app-capable" />
      {pushHint ? (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-900">
          {pushHint}
          <button
            className="ml-2 underline"
            onClick={() => {
              void (async () => {
                try {
                  const reg = await navigator.serviceWorker.ready;
                  const sub = await reg.pushManager.getSubscription();
                  if (sub) await removePushSubscription(sub.endpoint);
                } catch {
                  /* ignore */
                }
                window.location.reload();
              })();
            }}
            type="button"
          >
            Повторить
          </button>
        </div>
      ) : null}
    </>
  );
}
