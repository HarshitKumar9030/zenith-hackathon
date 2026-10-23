"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, Square, RefreshCw } from "lucide-react";
export default function LiveCamera({
  onScan,
  onError,
  stopSignal = 0,
}: {
  onScan: (image: string, ocr?: string) => Promise<void>;
  onError: (message: string) => void;
  stopSignal?: number;
}) {
  const video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0),
    callback = useRef(onScan),
    errorCallback = useRef(onError);
  callback.current = onScan;
  errorCallback.current = onError;
  const [running, setRunning] = useState(false),
    [processing, setProcessing] = useState(false),
    [count, setCount] = useState(0),
    [auto, setAuto] = useState(true);
  const [readLabels, setReadLabels] = useState(false);
  const labelsRef = useRef(readLabels);
  labelsRef.current = readLabels;
  const workerRef = useRef<import("tesseract.js").Worker | null>(null);
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const active = useRef(false);
  const inFlight = useRef(false);
  function stop() {
    generation.current++;
    active.current = false;
    if (timer.current) clearTimeout(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (workerRef.current) {
      void workerRef.current.terminate();
      workerRef.current = null;
    }
    if (video.current) video.current.srcObject = null;
    setRunning(false);
  }
  useEffect(() => {
    if (stopSignal) stop();
  }, [stopSignal]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      generation.current++;
      active.current = false;
      if (timer.current) clearTimeout(timer.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      if (workerRef.current) {
        void workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);
  async function scan(epoch: number, n: number) {
    if (
      !active.current ||
      epoch !== generation.current ||
      inFlight.current ||
      !video.current
    )
      return;
    const v = video.current;
    if (!v.videoWidth) {
      timer.current = setTimeout(() => void scan(epoch, n), 500);
      return;
    }
    inFlight.current = true;
    setProcessing(true);
    try {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
      canvas.width = v.videoWidth * scale;
      canvas.height = v.videoHeight * scale;
      canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
      const captured = canvas.toDataURL("image/jpeg", 0.8);
      let labelText = "";
      if (labelsRef.current) {
        const { createWorker } = await import("tesseract.js");
        if (!workerRef.current) {
          const worker = await createWorker("eng");
          if (!active.current || epoch !== generation.current) {
            await worker.terminate();
            return;
          }
          workerRef.current = worker;
        }
        const recognized = await workerRef.current.recognize(captured);
        labelText = recognized.data.text.slice(0, 8000);
      }
      if (!active.current || epoch !== generation.current) return;
      await callback.current(captured, labelText);
      if (epoch === generation.current) setCount(n + 1);
    } catch (e) {
      errorCallback.current((e as Error).message);
      stop();
    } finally {
      inFlight.current = false;
      setProcessing(false);
      if (
        active.current &&
        epoch === generation.current &&
        autoRef.current &&
        n < 7
      )
        timer.current = setTimeout(() => void scan(epoch, n + 1), 15000);
    }
  }
  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError(
        "Camera access needs HTTPS or localhost. Open the secure site on your phone.",
      );
      return;
    }
    stop();
    const epoch = generation.current;
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      if (epoch !== generation.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = next;
      if (video.current) {
        video.current.srcObject = next;
        await video.current.play();
      }
      active.current = true;
      setRunning(true);
      setCount(0);
      if (autoRef.current) void scan(epoch, 0);
    } catch (e) {
      onError(
        (e as DOMException).name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access or use a description."
          : "Unable to open camera. Close other camera apps and try again.",
      );
      stop();
    }
  }
  return (
    <section className="camera-panel">
      <div className="camera-view">
        <video
          ref={video}
          muted
          autoPlay
          playsInline
          aria-label="Live waste camera"
        />
        {!running && (
          <div className="camera-empty">
            <Camera size={42} strokeWidth={1.3} />
            <h2>Point. Scan. Confirm.</h2>
            <p>Use your phone’s rear camera. Keep the waste clearly in view.</p>
          </div>
        )}
        {running && (
          <div
            className={`camera-target ${processing ? "working" : ""}`}
            aria-hidden="true"
          >
            <ScanLine size={44} />
          </div>
        )}
      </div>
      <div className="inline-actions">
        {running ? (
          <>
            <button className="secondary" onClick={stop}>
              <Square size={15} />
              Stop camera
            </button>
            <button
              className="primary"
              disabled={processing}
              onClick={() => {
                if (timer.current) clearTimeout(timer.current);
                void scan(generation.current, count);
              }}
            >
              <ScanLine size={16} />
              {processing ? "Analysing…" : "Scan this view"}
            </button>
          </>
        ) : (
          <button className="primary" onClick={start}>
            <Camera size={17} />
            Start live camera
          </button>
        )}
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => {
            setAuto(e.target.checked);
            autoRef.current = e.target.checked;
            if (!e.target.checked && timer.current) clearTimeout(timer.current);
            if (e.target.checked && active.current && !inFlight.current)
              void scan(generation.current, count);
          }}
        />
        Analyse automatically every 15 seconds (up to 8 frames per session)
      </label>
      <label className="check-row">
        <input
          type="checkbox"
          checked={readLabels}
          onChange={(e) => setReadLabels(e.target.checked)}
        />
        Read packaging labels with browser OCR (English)
      </label>
      <small>
        {running
          ? `${count} frames analysed. Stop the camera to review and confirm the checklist.`
          : "Camera starts only with your permission. Frames go to Gemini during scanning."}
      </small>
    </section>
  );
}
