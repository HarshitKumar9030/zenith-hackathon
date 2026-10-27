import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EngineAudio } from "./engine-audio";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { blocked, canCollect, emptyCargo, finalScore, ROUND_SECONDS, TOTAL_TARGET, WASTE, WASTE_TYPES, type BoxCollider, type WasteType } from "@/lib/collection-game-rules";
export interface Pickup { id: string; node: string; wasteType: WasteType; position: number[]; district: string }
export interface CityData { collectibles: Pickup[]; playerStart: number[]; buildingBoxColliders: BoxCollider[]; districts: { id: string; center: number[] }[] }
export type Phase = "loading" | "ready" | "playing" | "paused" | "finished" | "error";
export interface GameState { phase: Phase; seconds: number; score: number; cargo: Record<WasteType, number>; collected: string[]; nearest: Pickup | null; distance: number; speed: number; x: number; z: number; heading: number; message: string; district: string; camera: number; sound: boolean }
export class CollectionGame {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(48, 1, .2, 1500);
  private renderer: THREE.WebGLRenderer;
  private truck = new THREE.Group();
  private city = new THREE.Group();
  private finishStage = new THREE.Group();
  private wheels: THREE.Object3D[] = [];
  private keys = new Set<string>();
  private taken = new Set<string>();
  private cargo = emptyCargo();
  private phase: Phase = "loading";
  private seconds = ROUND_SECONDS;
  private speed = 0;
  private heading = 0;
  private view = 2;
  private orbit: OrbitControls;
  private cursorYaw: number | null = null;
  private cursorPolar = .8;
  private sun: THREE.DirectionalLight;
  private motor = new EngineAudio();
  private environment: THREE.WebGLRenderTarget;
  private roadTexture: THREE.CanvasTexture | null = null;
  private nearest: Pickup | null = null;
  private data: CityData | null = null;
  private frame = 0;
  private lastTime = 0;
  private lastUI = 0;
  private disposed = false;
  private abort = new AbortController();
  private message = "Find the coloured collection markers.";
  private messageUntil = 0;
  private sound = true;
  private ring: THREE.Mesh;
  private beam: THREE.Mesh;
  private target = new THREE.Vector3();
  private resizeObserver: ResizeObserver;
  private confetti: THREE.InstancedMesh;
  private confettiTime = 0;
  private reusable = new THREE.Object3D();
  constructor(private host: HTMLElement, private update: (s: GameState) => void, private loaded: (data: CityData) => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const pmrem = new THREE.PMREMGenerator(this.renderer), room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, .04); this.scene.environment = this.environment.texture; this.scene.environmentIntensity = .3;
    room.dispose(); pmrem.dispose();
    host.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color("#d6e5e8");
    this.scene.fog = new THREE.Fog("#d6e5e8", 220, 650);
    this.scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x566c42, 1.3));
    this.sun = new THREE.DirectionalLight(0xffedcb, 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048,2048);
    Object.assign(this.sun.shadow.camera,{left:-120,right:120,top:120,bottom:-120,near:1,far:350});
    this.sun.shadow.camera.updateProjectionMatrix(); this.sun.shadow.bias=-.00015; this.sun.shadow.normalBias=.12;
    this.scene.add(this.sun,this.sun.target);
    this.orbit = new OrbitControls(this.camera,this.renderer.domElement);
    this.orbit.enablePan=false;this.orbit.enableRotate=false;this.orbit.enableDamping=true;this.orbit.dampingFactor=.08;
    this.orbit.minDistance=12;this.orbit.maxDistance=65;this.orbit.minPolarAngle=.25;this.orbit.maxPolarAngle=1.05;
    this.orbit.rotateSpeed=.65;this.orbit.zoomSpeed=.7;this.orbit.enabled=false;
    this.scene.add(this.truck, this.city, this.finishStage);
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(11, 12, .4, 64), new THREE.MeshStandardMaterial({color: 0xc9d9b6, roughness: .9}));
    stage.position.y = .1; stage.receiveShadow=true;
    const stageRing = new THREE.Mesh(new THREE.TorusGeometry(10.3, .10, 6, 64), new THREE.MeshBasicMaterial({color: 0xb0d377}));
    stageRing.rotation.x = -Math.PI / 2; stageRing.position.y = .34;
    this.finishStage.add(stage, stageRing); this.finishStage.visible = false;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 3, 48), new THREE.MeshBasicMaterial({ color: 0xb8ef74, side: THREE.DoubleSide }));
    this.ring.rotation.x = -Math.PI / 2;
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(.5, 1.5, 11, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xb8ef74, transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide }));
    this.scene.add(this.ring, this.beam);
    this.confetti = new THREE.InstancedMesh(new THREE.BoxGeometry(.20, .65, .08), new THREE.MeshBasicMaterial(), 100);
    this.confetti.visible = false;
    for (let i = 0; i < 100; i++) this.confetti.setColorAt(i, new THREE.Color(WASTE[WASTE_TYPES[i % 6]].color));
    this.scene.add(this.confetti);
    this.renderer.domElement.addEventListener("pointermove",this.cursorMove);
    this.renderer.domElement.addEventListener("pointerleave",this.cursorLeave);
    this.resizeObserver = new ResizeObserver(this.resize); this.resizeObserver.observe(host); this.resize();
    window.addEventListener("keydown", this.keydown); window.addEventListener("keyup", this.keyup); window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.visibility);
    this.frame = requestAnimationFrame(this.tick);
    void this.load();
  }
  private cursorMove = (event:PointerEvent) => {
    if(event.pointerType!=="mouse"||this.phase!=="playing"||this.view!==2)return;
    const bounds=this.renderer.domElement.getBoundingClientRect();
    this.cursorYaw=(event.clientX-bounds.left)/bounds.width*Math.PI*2-Math.PI-.65;
    this.cursorPolar=.35+THREE.MathUtils.clamp((event.clientY-bounds.top)/bounds.height,0,1)*.7;
  };
  private cursorLeave = () => {this.cursorYaw=null;};
  private resize = () => { const w = this.host.clientWidth, h = this.host.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); };
  private async load() {
    try {
      const loader = new GLTFLoader();
      const results = await Promise.allSettled([
        loader.loadAsync("/game/ecomitra-city.glb"),
        loader.loadAsync("/game/ecomitra-truck.glb"),
        fetch("/game/city-gameplay.json", { signal: this.abort.signal }).then(async r => { if (!r.ok) throw new Error("Map data unavailable"); return r.json() as Promise<CityData>; }),
      ]);
      if (this.disposed || results.some(r => r.status === "rejected")) {
        for (const r of results.slice(0, 2)) if (r.status === "fulfilled" && "scene" in r.value) this.disposeObject(r.value.scene);
        if (!this.disposed) throw new Error("The city could not load. Check your connection and reload.");
        return;
      }
      const city = (results[0] as PromiseFulfilledResult<Awaited<ReturnType<GLTFLoader["loadAsync"]>>>).value;
      const truck = (results[1] as PromiseFulfilledResult<Awaited<ReturnType<GLTFLoader["loadAsync"]>>>).value;
      this.data = (results[2] as PromiseFulfilledResult<CityData>).value;
      this.city.add(city.scene); this.truck.add(truck.scene);
      // Fine road grain and reflective windows add depth without external assets.
      const roadCanvas=document.createElement("canvas");roadCanvas.width=roadCanvas.height=256;
      const ctx=roadCanvas.getContext("2d");
      if(ctx){const grain=ctx.createImageData(256,256);for(let i=0;i<grain.data.length;i+=4){const shade=210+Math.floor(Math.random()*36);grain.data[i]=grain.data[i+1]=grain.data[i+2]=shade;grain.data[i+3]=255;}ctx.putImageData(grain,0,0);}
      this.roadTexture=new THREE.CanvasTexture(roadCanvas);this.roadTexture.wrapS=this.roadTexture.wrapT=THREE.RepeatWrapping;this.roadTexture.colorSpace=THREE.SRGBColorSpace;this.roadTexture.anisotropy=4;
      this.city.updateMatrixWorld(true);
      this.city.traverse(o=>{if(o instanceof THREE.Mesh){
        o.castShadow=true;o.receiveShadow=true;
        for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){
          if(m.name==="asphalt"){
            if(!m.map){m.color.multiplyScalar(.78);m.map=this.roadTexture;m.roughness=.94;m.needsUpdate=true;}
            const positions=o.geometry.attributes.position,uv=new Float32Array(positions.count*2),point=new THREE.Vector3();
            for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);uv[i*2]=point.x*.15;uv[i*2+1]=point.z*.15;}
            o.geometry.setAttribute("uv",new THREE.BufferAttribute(uv,2));
          }
          if(m.name==="window"){m.roughness=.24;m.metalness=.14;m.envMapIntensity=.7;}
        }
      }});
      this.truck.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});
      this.wheels = ["Front_Left", "Front_Right", "Rear_Left", "Rear_Right"].map(n => truck.scene.getObjectByName(`Wheel_${n}`)).filter((o): o is THREE.Object3D => Boolean(o));
      this.truck.position.fromArray(this.data.playerStart); this.truck.position.y = .35;
      this.camera.position.copy(this.truck.position).add(new THREE.Vector3(-16, 16, 21));
      this.orbit.target.copy(this.truck.position).add(new THREE.Vector3(0,1,0));this.orbit.update();
      this.phase = "ready"; this.loaded(this.data); this.emit();
    } catch (error) { if (!this.disposed) { this.phase = "error"; this.message = error instanceof Error ? error.message : "Unable to load the game."; this.emit(); } }
  }
  start() {
    if (!this.data || this.phase === "error") return;
    this.cursorYaw=null;this.taken.clear(); this.cargo = emptyCargo(); this.seconds = ROUND_SECONDS; this.heading = Math.PI / 2; this.speed = 0;
    for (const p of this.data.collectibles) { const o = this.city.getObjectByName(p.node); if (o) o.visible = true; }
    this.truck.position.fromArray(this.data.playerStart); this.truck.position.y = .35;
    this.phase = "playing"; this.city.visible = true; this.finishStage.visible = false; this.confetti.visible = false;
    this.camera.position.copy(this.truck.position).add(new THREE.Vector3(-16, 16, 21));
      this.orbit.target.copy(this.truck.position).add(new THREE.Vector3(0,1,0));this.orbit.update(); this.keys.clear(); this.say("Your round starts now. Follow the glowing marker.", 5);
    this.tone(523); this.emit();
  }
  togglePause() { if (this.phase === "playing") { this.phase = "paused"; this.keys.clear();this.motor.update(this.speed,false,false); } else if (this.phase === "paused") this.phase = "playing"; this.emit(); }
  toggleCamera() {
    this.view=(this.view+1)%3;this.cursorYaw=null;
    this.orbit.target.copy(this.truck.position).add(new THREE.Vector3(0,1,0));this.orbit.update();
    this.say(["Isometric camera","Overhead camera","360° camera · move cursor to look · J/L to rotate"][this.view]);this.emit();
  }
  toggleSound() { this.sound = !this.sound; this.motor.setEnabled(this.sound); this.emit(); }
  private blur = () => { this.keys.clear(); if (this.phase === "playing") this.togglePause(); };
  private visibility = () => { if (document.hidden) this.blur(); };
  private keydown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement)?.closest("input, textarea, select, a")) return;
    if ((event.target as HTMLElement)?.closest("button") && ["Enter", " "].includes(event.key)) return;
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "tab"].includes(key) && key !== "tab") event.preventDefault();
    this.keys.add(key);
    if (event.repeat) return;
    if (key === "e") this.collect();
    if (key === "p" || key === "escape") this.togglePause();
    if (key === "c") this.toggleCamera();
    if (key === "r" && this.phase === "playing") this.rescue();
    if (key === "enter") { if (this.phase === "ready" || this.phase === "finished") this.start(); else if (this.phase === "paused") this.togglePause(); }
  };
  private keyup = (event: KeyboardEvent) => { this.keys.delete(event.key.toLowerCase()); };
  setControl(key: string, pressed: boolean) { if (pressed) this.keys.add(key); else this.keys.delete(key); }
  private tone(frequency:number){this.motor.cue(frequency);}
  private say(text: string, seconds = 3) { this.message = text; this.messageUntil = performance.now() + seconds * 1000; }
  collect() {
    if (this.phase !== "playing" || !this.nearest) return;
    if (this.distance(this.nearest) > 20) { this.say("Drive closer to the glowing marker."); return; }
    if (Math.abs(this.speed) > 8) { this.say("Slow down or hold Space to collect."); return; }
    const p = this.nearest;
    if (!canCollect(p.wasteType, this.cargo, this.taken, p.id)) return;
    this.taken.add(p.id); this.cargo[p.wasteType]++;
    const object = this.city.getObjectByName(p.node); if (object) object.visible = false;
    this.say(p.wasteType === "ewaste" ? "E-waste secured for specialist processing. +200" : `${WASTE[p.wasteType].label} collected. +${WASTE[p.wasteType].points}`);
    this.tone(p.wasteType === "ewaste" ? 784 : 660);
    if (this.taken.size >= TOTAL_TARGET) this.finish();
    this.emit();
  }
  private rescue() {
    const snap = (v: number) => THREE.MathUtils.clamp(Math.round(v / 120) * 120, -360, 360);
    this.truck.position.set(snap(this.truck.position.x), .35, snap(this.truck.position.z)); this.speed = 0; this.say("Back on the road. Keep going!");
  }
  endRound() { if (this.phase === "playing" || this.phase === "paused") this.finish(); }
  private finish() { this.city.visible = false; this.finishStage.visible = true; this.truck.position.set(0,.35,0); this.truck.rotation.y = -.3; this.phase = "finished"; this.motor.update(0,false,false);this.keys.clear(); this.speed = 0; this.confettiTime = 0; this.confetti.visible = true; this.ring.visible = this.beam.visible = false; this.tone(1046); this.emit(); }
  private distance(p: Pickup) { return Math.hypot(this.truck.position.x - p.position[0], this.truck.position.z - p.position[2]); }
  private emit() {
    const pos = this.truck.position;
    const district = this.data?.districts.reduce((a, b) => Math.hypot(pos.x - a.center[0], pos.z - a.center[2]) < Math.hypot(pos.x - b.center[0], pos.z - b.center[2]) ? a : b);
    this.update({ phase: this.phase, seconds: this.seconds, score: finalScore(this.cargo, this.seconds), cargo: { ...this.cargo }, collected: [...this.taken], nearest: this.nearest, distance: this.nearest ? this.distance(this.nearest) : 0, speed: Math.round(Math.abs(this.speed) * 3.6), x: pos.x, z: pos.z, heading: this.heading, message: this.message, district: district?.id.slice(3) ?? "Circular City", camera: this.view, sound: this.sound });
  }
  private tick = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min((now - (this.lastTime || now)) / 1000, .05); this.lastTime = now;
    if (this.phase === "playing" && this.data) {
      this.seconds = Math.max(0, this.seconds - dt);
      const input = Number(this.keys.has("w") || this.keys.has("arrowup")) - Number(this.keys.has("s") || this.keys.has("arrowdown"));
      this.speed += (input * 15 - this.speed * (this.keys.has(" ") ? 7 : .55)) * dt;
      this.speed = THREE.MathUtils.clamp(this.speed, -10, 26);
      const steering = Number(this.keys.has("a") || this.keys.has("arrowleft")) - Number(this.keys.has("d") || this.keys.has("arrowright"));
      this.heading += steering * Math.min(Math.abs(this.speed) / 8, 1) * Math.sign(this.speed) * 1.65 * dt;
      this.truck.rotation.y = this.heading;
      const x = this.truck.position.x + Math.cos(this.heading) * this.speed * dt;
      const z = this.truck.position.z - Math.sin(this.heading) * this.speed * dt;
      if (!blocked(x, this.truck.position.z, this.data.buildingBoxColliders)) this.truck.position.x = x; else this.speed *= .8;
      if (!blocked(this.truck.position.x, z, this.data.buildingBoxColliders)) this.truck.position.z = z; else this.speed *= .8;
      for (const wheel of this.wheels) wheel.rotation.z -= this.speed * dt / .53;
      this.nearest = this.data.collectibles.filter(p => canCollect(p.wasteType, this.cargo, this.taken, p.id)).reduce<Pickup | null>((best, p) => !best || this.distance(p) < this.distance(best) ? p : best, null);
      if (this.seconds === 0) this.finish();
      if (now > this.messageUntil) this.message = "Follow the marker. Press E to collect when nearby.";
    }
    if (this.nearest && this.phase !== "finished") {
      this.ring.visible = this.beam.visible = true;
      const p = this.nearest.position; this.ring.position.set(p[0], .42, p[2]); this.beam.position.set(p[0], 6 + Math.sin(now / 400), p[2]);
      (this.ring.material as THREE.MeshBasicMaterial).color.set(WASTE[this.nearest.wasteType].color);
      (this.beam.material as THREE.MeshBasicMaterial).color.set(WASTE[this.nearest.wasteType].color);
      this.ring.scale.setScalar(1.3 + Math.sin(now / 220) * .1);
    } else { this.ring.visible = this.beam.visible = false; }
    this.motor.update(this.speed,this.keys.has("w")||this.keys.has("arrowup")||this.keys.has("s")||this.keys.has("arrowdown"),this.phase==="playing");
    this.target.copy(this.truck.position);
    this.sun.position.copy(this.target).add(new THREE.Vector3(-50,90,45));this.sun.target.position.copy(this.target);
    const offset = this.view===1 ? new THREE.Vector3(0, 95, 32) : new THREE.Vector3(-16, 16, 21);
    if (this.phase === "finished") { this.confettiTime += dt; offset.set(Math.cos(now / 7000) * 12, 8, Math.sin(now / 7000) * 12); }
    const lookTarget=this.target.clone().add(new THREE.Vector3(0,1,0));
    if(this.view===2 && this.phase!=="finished"){
      this.orbit.enabled=this.phase==="playing";
      this.camera.position.add(lookTarget.clone().sub(this.orbit.target));this.orbit.target.copy(lookTarget);
      if(this.phase==="playing"){
        if(["j","l","i","k"].some(key=>this.keys.has(key)))this.cursorYaw=null;
        if(this.cursorYaw!==null){
          const delta=this.orbit.getAzimuthalAngle()-this.cursorYaw;
          this.orbit.rotateLeft(Math.atan2(Math.sin(delta),Math.cos(delta))*.1);
          this.orbit.rotateUp((this.orbit.getPolarAngle()-this.cursorPolar)*.1);
        }
        if(this.keys.has("j"))this.orbit.rotateLeft(dt*1.5);
        if(this.keys.has("l"))this.orbit.rotateLeft(-dt*1.5);
        if(this.keys.has("i"))this.orbit.rotateUp(dt);
        if(this.keys.has("k"))this.orbit.rotateUp(-dt);
        if(this.keys.has("=")||this.keys.has("+"))this.orbit.dollyIn(1+dt);
        if(this.keys.has("-"))this.orbit.dollyOut(1+dt);
      }
      this.orbit.update(dt);
    }else{
      this.orbit.enabled=false;
      this.camera.position.lerp(this.target.clone().add(offset),1-Math.exp(-4*dt));
      if(this.phase==="finished"){
        const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),offset).normalize();lookTarget.addScaledVector(right,-4);
      }
      this.camera.lookAt(lookTarget);
    }
    if (this.confetti.visible) {
      for (let i = 0; i < 100; i++) {
        const t = this.confettiTime + i * .071;
        this.reusable.position.set(this.target.x + Math.sin(i * 7.31) * 13, 2 + (18 - (t * 5) % 18), this.target.z + Math.cos(i * 3.1) * 13);
        this.reusable.rotation.set(t + i, t * .8, t * 1.4); this.reusable.updateMatrix(); this.confetti.setMatrixAt(i, this.reusable.matrix);
      } this.confetti.instanceMatrix.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
    if (now - this.lastUI > 100) { this.emit(); this.lastUI = now; }
    this.frame = requestAnimationFrame(this.tick);
  };
  private disposeObject(root: THREE.Object3D) {
    root.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.dispose(); } });
  }
  dispose() {
    this.disposed = true; this.abort.abort(); cancelAnimationFrame(this.frame); this.resizeObserver.disconnect(); this.keys.clear();
    window.removeEventListener("keydown", this.keydown); window.removeEventListener("keyup", this.keyup); window.removeEventListener("blur", this.blur); document.removeEventListener("visibilitychange", this.visibility);
    this.renderer.domElement.removeEventListener("pointermove",this.cursorMove);this.renderer.domElement.removeEventListener("pointerleave",this.cursorLeave);
    this.orbit.dispose(); this.motor.dispose(); this.environment.dispose(); this.roadTexture?.dispose(); this.sun.shadow.dispose(); this.disposeObject(this.scene); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
