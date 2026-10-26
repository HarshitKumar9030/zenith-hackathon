"use client";
import { scanDimensions } from "@/lib/scanner-config";
import { useEffect, useRef, useState } from "react";
import { SwitchCamera } from "lucide-react";
import { openCameraStream, type CameraFacing } from "@/lib/camera";
import flow from "./simple-flow.module.css";
import cameraControls from "./camera-controls.module.css";
import CapturedFrameDrop from "./captured-frame-drop";
import frameStyles from "./captured-frame-drop.module.css";
import {
  Camera,
  ScanLine,
  Square,
  Loader2,
  ShieldCheck,
  ScanText,
  Check,
  ArrowRight,
} from "lucide-react";
import ScanArt from "./scan-art";
export default function LiveCamera({
  onScan,
  onError,
  stopSignal = 0,
  onDescribe,
}: {
  onScan: (image: string, ocr?: string) => Promise<void>;
  onError: (message: string) => void;
  stopSignal?: number;
  onDescribe?: () => void;
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
      const dimensions = scanDimensions(v.videoWidth, v.videoHeight);
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
      const captured = canvas.toDataURL("image/jpeg", 0.88);
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
    <section
      className={`camera-studio ${running ? "is-live" : ""}`}
      aria-label="Waste camera scanner"
    >
      <div className="camera-studio-top">
        <span>
          <ScanLine size={17} /> Live scanner
        </span>
        <span className={`camera-state ${running ? "live" : ""}`} role="status">
          <i />
          {starting
            ? (switching ? "Switching camera" : "Opening camera")
            : processing
              ? "Analysing view"
              : running
                ? "Camera on"
                : "Camera off"}
        </span>
      </div>
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
        {!running ? (
          <div className="camera-idle">
            <div className="camera-idle-art">
              <ScanArt />
            </div>
            <h2>Your waste, in focus.</h2>
            <p>
              Place your items together in good light.
              <br />
              Open the camera when you’re ready.
            </p>
            <span className="camera-privacy-tag">
              <ShieldCheck size={14} /> Camera starts with your permission
            </span>
          </div>
        ) : (
          <>
            <div
              className={`camera-frame ${processing ? "working" : ""}`}
              aria-hidden="true"
            >
              <svg viewBox="0 0 300 220" preserveAspectRatio="none" fill="none">
                <path
                  d="M2 40V12a10 10 0 0 1 10-10h28m220 0h28a10 10 0 0 1 10 10v28m0 140v28a10 10 0 0 1-10 10h-28m-220 0H12a10 10 0 0 1-10-10v-28"
                  stroke="currentColor"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {processing && <span className="live-scan-beam" />}
            </div>
            <div className="camera-live-caption">
              {processing
                ? "Hold steady. Checking visible items…"
                : "Keep items and packaging labels in the frame"}
            </div>
          </>
        )}
      </div>
      <div className="camera-control-bar">
        <div className="camera-control-copy">
          <strong>
            {processing
              ? "Taking a closer look"
              : running
                ? "Ready for your next scan"
                : "Start with a quick scan"}
          </strong>
          <span>
            {running
              ? `${count} ${count === 1 ? "scan" : "scans"} analysed · review the items below`
              : "Scan → review items → choose a pickup"}
          </span>
        </div>
        <div className="camera-buttons">
          {running ? (
            <>
              <button
                type="button"
                className="camera-stop"
                onClick={stop}
                aria-label="Stop camera"
              >
                <Square size={15} />
                <span>Stop</span>
              </button>
              <button
                type="button"
                className="primary camera-capture"
                disabled={processing}
                onClick={() => {
                  if (timer.current) clearTimeout(timer.current);
                  void scan(generation.current, count);
                }}
              >
                {processing ? (
                  <Loader2 className="spin" size={19} />
                ) : (
                  <ScanLine size={19} />
                )}
                <span>{processing ? "Analysing…" : "Scan now"}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="primary camera-capture"
              disabled={starting}
              onClick={() => void start()}
            >
              {starting ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <Camera size={18} />
              )}
              <span>{starting ? "Opening…" : "Start scanning"}</span>
            </button>
          )}
        </div>
      </div>
      <details className={flow.details}><summary>Scan settings</summary>
      <div className="camera-preferences">
        <div className="camera-preference">
          <div className="camera-preference-label">
            <ScanLine size={18} />
            <div>
              <strong>Automatic scanning</strong>
              <span>Scan again automatically while the camera is open</span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={auto}
            aria-label="Automatic scanning"
            className={`camera-switch ${auto ? "on" : ""}`}
            onClick={() => {
              const next = !auto;
              setAuto(next);
              autoRef.current = next;
              if (!next && timer.current) clearTimeout(timer.current);
              if (next && active.current && !inFlight.current && count < 8)
                void scan(generation.current, count);
            }}
          >
            <span />
          </button>
        </div>
        <div className="camera-preference">
          <div className="camera-preference-label">
            <ScanText size={18} />
            <div>
              <strong>Read packaging labels</strong>
              <span>Read text printed on your items</span>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={readLabels}
            aria-label="Read packaging labels"
            className={`camera-switch ${readLabels ? "on" : ""}`}
            onClick={() => setReadLabels(!readLabels)}
          >
            <span />
          </button>
        </div>
      </div>
      </details>
      <div className="camera-bottom-note">
        <span>
          <ShieldCheck size={14} /> Frames aren’t saved
        </span>
        {onDescribe && (
          <button type="button" className="text-button" onClick={onDescribe}>
            Describe instead <ArrowRight size={14} />
          </button>
        )}
      </div>
    </section>
  );
}
