"use client";
import { useEffect, useState } from "react";
export type NativeTrackingState = { running: boolean; status: string; bookingId: string; pending: boolean };
export function useNativeHelper() {
  const [native, setNative] = useState(false);
  const [tracking, setTracking] = useState<NativeTrackingState>({ running: false, status: "", bookingId: "", pending: false });
  useEffect(() => {
    setNative(/WasteRightHelper\/0\.(?:2|3)\b/.test(navigator.userAgent));
    const update = (event: Event) => {
      const data = (event as CustomEvent).detail;
      if (!data || typeof data.running !== "boolean" || typeof data.status !== "string" || typeof data.bookingId !== "string") return;
      setTracking({ running: data.running, status: data.status.slice(0, 500), bookingId: data.bookingId, pending: data.pending === true });
    };
    window.addEventListener("wasteright-native-tracking", update);
    return () => window.removeEventListener("wasteright-native-tracking", update);
  }, []);
  return { native, tracking };
}
