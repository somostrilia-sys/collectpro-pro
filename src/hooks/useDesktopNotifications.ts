import { useEffect, useCallback, useState } from "react";

export function useDesktopNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const request = useCallback(async () => {
    if (!("Notification" in window)) return false;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, []);

  const notify = useCallback((title: string, options?: NotificationOptions & { silent?: boolean }) => {
    if (!("Notification" in window)) return null;
    if (document.hasFocus()) return null; // só notifica quando não está focado
    if (Notification.permission !== "granted") return null;

    try {
      const notif = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return notif;
    } catch {
      return null;
    }
  }, []);

  return { permission, request, notify, supported: "Notification" in window };
}
