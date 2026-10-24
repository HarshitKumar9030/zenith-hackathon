"use client";
import { useEffect, useRef, useState } from "react";
import { SwitchCamera } from "lucide-react";
import { openCameraStream, type CameraFacing } from "@/lib/camera";
import cameraControls from "./camera-controls.module.css";
import CapturedFrameDrop from "./captured-frame-drop";
import frameStyles from "./captured-frame-drop.module.css";
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
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [running, setRunning] = useState(false),
    [processing, setProcessing] = useState(false),
    [count, setCount] = useState(0),
    [auto, setAuto] = useState(true);
  const [readLabels, setReadLabels] = useState(false);
  const [starting, setStarting] = useState(false);
  const [facing, setFacing] = useState<CameraFacing>("environment");
  const [canSwitch, setCanSwitch] = useState(false);
  const [switching, setSwitching] = useState(false);
  const opening = useRef(false);
  const facingPreference = useRef<CameraFacing>("environment");
  const labelsRef = useRef(readLabels);
  labelsRef.current = readLabels;
  const workerRef = useRef<import("tesseract.js").Worker | null>(null);
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const active = useRef(false);
  const inFlight = useRef(false);
  function stop() {
    generation.current++;
    opening.current = false;
    setStarting(false);
    setSwitching(false);
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
    setCapturedFrame(null);
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
      setCapturedFrame(captured);
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
      if (epoch === generation.current) {
        errorCallback.current((e as Error).message);
        stop();
      }
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
  async function start(target: CameraFacing = facingPreference.current, switchingCamera = false) {
    if (opening.current || inFlight.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      errorCallback.current("Camera access needs HTTPS or localhost. Open the secure site on your phone.");
      return;
    }
    const previous = stream.current;
    const scans = switchingCamera ? count : 0;
    const epoch = ++generation.current;
    active.current = false;
    opening.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setRunning(false);
    setCapturedFrame(null);
    setStarting(true);
    setSwitching(switchingCamera);
    try {
      const result = await openCameraStream(navigator.mediaDevices, {
        facing: target, previous, isCurrent: () => epoch === generation.current,
      });
      if (!result) return;
      const next = result.stream;
      if (epoch !== generation.current || !video.current) { next.getTracks().forEach(track => track.stop()); return; }
      stream.current = next;
      video.current.srcObject = next;
      await video.current.play();
      // Stop / navigation can happen while permission or playback is pending.
      if (epoch !== generation.current) { next.getTracks().forEach(track => track.stop()); return; }
      facingPreference.current = result.facing;
      setFacing(result.facing);
      active.current = true;
      setRunning(true);
      setCount(scans);
      const settings = next.getVideoTracks()[0]?.getSettings();
      const supportsFacing = navigator.mediaDevices.getSupportedConstraints?.().facingMode !== false;
      setCanSwitch(!result.restored && supportsFacing && Boolean(settings?.facingMode));
      // Enumeration is optional: some phones expose only the authorised camera.
      if (!result.restored && navigator.mediaDevices.enumerateDevices) {
        void navigator.mediaDevices.enumerateDevices().then(devices => {
          if (epoch === generation.current) setCanSwitch(supportsFacing &&
            (devices.filter(device => device.kind === "videoinput").length > 1 || Boolean(settings?.facingMode)));
        }).catch(() => { /* Keep scanning when device enumeration is restricted. */ });
      }
      if (result.restored) errorCallback.current("Could not switch cameras. Your previous camera is ready to use.");
      // Keep the same scan budget and allow time to frame the newly selected camera.
      if (autoRef.current && scans < 8) timer.current = setTimeout(() => void scan(epoch, scans), 2000);
    } catch (error) {
      if (epoch !== generation.current) return;
      errorCallback.current((error as DOMException).name === "NotAllowedError"
        ? "Camera permission denied. Allow camera access or use a description."
        : "Unable to open camera. Close other camera apps and try again.");
      stop();
    } finally {
      if (epoch === generation.current) {
        opening.current = false;
        setStarting(false);
        setSwitching(false);
      }
    }
  }
  return (
    <section className="camera-panel">
      <div className={`camera-view ${capturedFrame ? frameStyles.capturing : ""}`}>
        {running && capturedFrame && (
          <CapturedFrameDrop key={capturedFrame} frame={capturedFrame} onComplete={() => setCapturedFrame(null)} />
        )}
        <video
          ref={video}
          muted
          autoPlay
          playsInline
          aria-label="Live waste camera"
          style={{transform: facing === "user" ? "scaleX(-1)" : undefined}}
        />
        {(running || switching) && canSwitch && (
          <button type="button" className={cameraControls.flip}
            disabled={starting || processing}
            aria-label={`Switch to ${facing === "user" ? "back" : "front"} camera`}
            title={`Switch to ${facing === "user" ? "back" : "front"} camera`}
            onClick={() => void start(facing === "user" ? "environment" : "user", true)}>
            <SwitchCamera size={18}/><span>{switching ? "Switching…" : "Flip camera"}</span>
          </button>
        )}
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
          <button className="primary" disabled={starting} onClick={() => void start()}>
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
