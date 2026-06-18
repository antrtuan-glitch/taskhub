import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Chuyển base64 url-safe sang Uint8Array (chuẩn Web Push)
function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotification(userId) {
  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    // Tự động đăng ký nếu đã được cấp quyền trước đó
    if (userId && permission === "granted") {
      subscribe(userId);
    }
  }, [userId]);

  async function requestAndSubscribe() {
    if (!VAPID_PUBLIC_KEY) {
      console.warn("Chưa cấu hình VITE_VAPID_PUBLIC_KEY");
      return;
    }

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm === "granted" && userId) {
      await subscribe(userId);
    }
  }

  async function subscribe(uid) {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Lưu subscription vào profile để server dùng gửi push
      await supabase
        .from("profiles")
        .update({ push_subscription: subscription.toJSON() })
        .eq("id", uid);
    } catch (err) {
      console.error("Push subscription lỗi:", err);
    }
  }

  return { permission, requestAndSubscribe };
}
