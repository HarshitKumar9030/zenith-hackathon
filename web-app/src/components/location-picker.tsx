"use client";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, Loader2, MapPin } from "lucide-react";
type Position = { latitude: number; longitude: number; accuracy: number };
export default function LocationPicker({
  lang = "en",
}: {
  lang?: "en" | "hi";
}) {
  const [position, setPosition] = useState<Position | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const mounted = useRef(false),
    hi = lang === "hi";
  useEffect(() => {
    mounted.current = true;
    fetch("/api/service")
      .then((r) => r.json())
      .then((d) => {
        if (mounted.current) setPosition(d.account?.profile.location || null);
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, []);
  async function save(location: Position | null) {
    try {
      const r = await fetch("/api/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "location", location }),
      });
      if (!r.ok) throw Error();
      if (mounted.current) setPosition(location);
    } catch {
      if (mounted.current)
        setError(
          hi
            ? "स्थान सहेजा नहीं गया। फिर कोशिश करें।"
            : "Location could not be saved. Please try again.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  function locate() {
    setError("");
    if (!navigator.geolocation) {
      setError(
        hi
          ? "इस ब्राउज़र में स्थान सुविधा उपलब्ध नहीं है।"
          : "Location is unavailable in this browser.",
      );
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (mounted.current)
          void save({
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: p.coords.accuracy,
          });
      },
      (e) => {
        if (!mounted.current) return;
        setBusy(false);
        setError(
          e.code === 1
            ? hi
              ? "स्थान की अनुमति नहीं मिली। पता और इलाका खुद भरें।"
              : "Location permission was denied. Enter your address and locality manually."
            : hi
              ? "स्थान नहीं मिला। फिर कोशिश करें या पता खुद भरें।"
              : "Could not find your location. Retry or enter your address manually.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }
  return (
    <div className="location-picker">
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={locate}
      >
        {busy ? (
          <Loader2 className="spin" size={17} />
        ) : (
          <LocateFixed size={17} />
        )}{" "}
        {hi ? "मेरा स्थान चुनें" : "Use my location"}
      </button>
      <small>
        {hi
          ? "आपकी अनुमति से एक बार स्थान लिया जाता है। सही मकान और इलाके का नाम नीचे भरें।"
          : "Uses your device location once, with permission. Add your street address and locality below."}
      </small>
      {position && (
        <div className="location-result">
          <MapPin size={16} />
          <span>
            {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)} ·{" "}
            {hi ? "लगभग" : "Accuracy"} {Math.round(position.accuracy)} m
          </span>
          <a
            href={`https://www.openstreetmap.org/?mlat=${position.latitude}&mlon=${position.longitude}#map=17/${position.latitude}/${position.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            {hi ? "मानचित्र" : "View map"}
          </a>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void save(null);
            }}
          >
            {hi ? "हटाएँ" : "Remove"}
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
