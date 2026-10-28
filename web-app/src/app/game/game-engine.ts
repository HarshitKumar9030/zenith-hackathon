import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { physicsStep, WORLD_WALLS, type Body, type Wall } from "@/lib/collection-game-physics";
import { StreetInteractions } from "./street-interactions";
import {chaseOffset,driverView,toggleDrivingCamera} from "@/lib/collection-game-camera";
import { CityActivities } from "./city-activities";
import { CityEnvironment } from "./city-environment";
import { CityLife } from "./city-life";
import type { TouchDrive } from "@/lib/collection-game-touch";
import { EngineAudio } from "./engine-audio";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { canCollect, emptyCargo, finalScore, ROUND_SECONDS, TOTAL_TARGET, WASTE, WASTE_TYPES, type BoxCollider, type WasteType } from "@/lib/collection-game-rules";
export interface Pickup { id: string; node: string; wasteType: WasteType; position: number[]; district: string }
export interface CityData { collectibles: Pickup[]; playerStart: number[]; buildingBoxColliders: BoxCollider[]; districts: { id: string; center: number[] }[] }
export type Phase = "loading" | "ready" | "playing" | "paused" | "finished" | "error";
export interface GameState { phase: Phase; seconds: number; score: number; cargo: Record<WasteType, number>; collected: string[]; nearest: Pickup | null; distance: number; speed: number; x: number; z: number; heading: number; message: string; district: string; camera: number; sound: boolean; soundRunning?:boolean; landmarks?:string[]; reverse?:boolean; interaction?: string }
export class CollectionGame {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(48, 1, .2, 1500);
  private renderer: THREE.WebGLRenderer;
  private truck = new THREE.Group();
  private city = new THREE.Group();
  private finishStage = new THREE.Group();
  private wheels: THREE.Object3D[] = [];
  private keys = new Set<string>();
  private touch:TouchDrive={steering:0,throttle:0,brake:false};
  private touchDriving=false;
  private touchCameraUntil=0;
  private touchPointers=new Map<number,{x:number;y:number}>();
  private life:CityLife;
  private environmentAssets:CityEnvironment|null=null;
  private street=new StreetInteractions();
  private activities=new CityActivities();
  private solidWalls:Wall[]=[];
  private drift={x:0,z:0};
  private lastImpact=0;
  private taken = new Set<string>();
  private cargo = emptyCargo();
  private phase: Phase = "loading";
  private seconds = ROUND_SECONDS;
  private speed = 0;
  private heading = 0;
  private view = 0;
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
  constructor(private host: HTMLElement, private update: (s: GameState) => void, private loaded: (data: CityData) => void, private requestStart?:()=>void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.matchMedia("(pointer: coarse)").matches?1.25:1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const pmrem = new THREE.PMREMGenerator(this.renderer), room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, .04); this.scene.environment = this.environment.texture; this.scene.environmentIntensity = .3;
    room.dispose(); pmrem.dispose();
    host.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color("#d6e5e8");
    this.scene.fog = new THREE.Fog("#d6e5e8", 220, 650);
    this.scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x566c42, .95));
    this.sun = new THREE.DirectionalLight(0xffedcb, 2);
    this.sun.castShadow = true; this.sun.shadow.mapSize.setScalar(window.matchMedia("(pointer: coarse)").matches?1024:2048);
    Object.assign(this.sun.shadow.camera,{left:-120,right:120,top:120,bottom:-120,near:1,far:350});
    this.sun.shadow.camera.updateProjectionMatrix(); this.sun.shadow.bias=-.00015; this.sun.shadow.normalBias=.12;
    this.scene.add(this.sun,this.sun.target);
    this.orbit = new OrbitControls(this.camera,this.renderer.domElement);
    this.orbit.enablePan=false;this.orbit.enableRotate=false;this.orbit.enableDamping=true;this.orbit.dampingFactor=.08;
    this.orbit.minDistance=12;this.orbit.maxDistance=65;this.orbit.minPolarAngle=.25;this.orbit.maxPolarAngle=1.05;
    this.orbit.rotateSpeed=.65;this.orbit.zoomSpeed=.7;this.orbit.enabled=false;
    this.scene.add(this.truck, this.city, this.finishStage,this.street.root,this.activities.root);this.activities.root.visible=false;this.street.root.visible=false;
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
    this.life=new CityLife();this.scene.add(this.life.root);this.life.root.visible=false;
    this.renderer.domElement.addEventListener("pointerdown",this.touchLookStart);
    this.renderer.domElement.addEventListener("pointerup",this.touchLookEnd);
    this.renderer.domElement.addEventListener("pointercancel",this.touchLookEnd);
    this.renderer.domElement.addEventListener("lostpointercapture",this.touchLookEnd);
    this.renderer.domElement.addEventListener("pointermove",this.cursorMove);
    this.renderer.domElement.addEventListener("pointerleave",this.cursorLeave);
    this.resizeObserver = new ResizeObserver(this.resize); this.resizeObserver.observe(host); this.resize();
    window.addEventListener("pointerdown",this.resumeAudio);
    window.addEventListener("keydown", this.keydown); window.addEventListener("keyup", this.keyup); window.addEventListener("blur", this.blur);
    document.addEventListener("visibilitychange", this.visibility);
    this.frame = requestAnimationFrame(this.tick);
    void this.load();
  }
  private touchLookStart=(event:PointerEvent)=>{
    if(event.pointerType!=="touch"||this.phase!=="playing"||this.view!==2)return;
    this.touchPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    this.touchDriving=true;this.cursorYaw=null;this.touchCameraUntil=performance.now()+4000;
  };
  private touchLookEnd=(event:PointerEvent)=>{this.touchPointers.delete(event.pointerId);};
  private cursorMove = (event:PointerEvent) => {
    if(event.pointerType==="touch"){
      const previous=this.touchPointers.get(event.pointerId);
      if(previous&&this.phase==="playing"&&this.view===2){
        if(this.touchPointers.size===1){
          const bounds=this.renderer.domElement.getBoundingClientRect();
          this.orbit.rotateLeft((event.clientX-previous.x)/bounds.width*Math.PI*1.8);
          this.orbit.rotateUp((event.clientY-previous.y)/bounds.height*Math.PI);
          this.touchCameraUntil=performance.now()+4000;
        }
        this.touchPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      }return;
    }
    if(event.pointerType!=="mouse"||this.phase!=="playing"||this.view!==2)return;
    this.touchDriving=false;
    const bounds=this.renderer.domElement.getBoundingClientRect();
    this.cursorYaw=(event.clientX-bounds.left)/bounds.width*Math.PI*2-Math.PI-.65;
    this.cursorPolar=.35+THREE.MathUtils.clamp((event.clientY-bounds.top)/bounds.height,0,1)*.7;
  };
  private cursorLeave = () => {this.cursorYaw=null;};
  private resize = () => { const w = this.host.clientWidth, h = this.host.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); };
  private async load() {
    try {
      const loader = new GLTFLoader();
      const peoplePromise=Promise.allSettled(["character-male-a","character-female-a"].map(name=>loader.loadAsync("/game/"+name+".glb")));
      const packPromise=loader.loadAsync("/game/city-assets.glb").catch(()=>null);
      const results = await Promise.allSettled([
        loader.loadAsync("/game/ecomitra-city.glb"),
        loader.loadAsync("/game/ecomitra-truck.glb"),
        fetch("/game/city-gameplay.json", { signal: this.abort.signal }).then(async r => { if (!r.ok) throw new Error("Map data unavailable"); return r.json() as Promise<CityData>; }),
      ]);
      if (this.disposed || results.some(r => r.status === "rejected")) {
        void packPromise.then(pack=>{if(pack)this.disposeObject(pack.scene);});
        void peoplePromise.then(results=>{for(const r of results)if(r.status==="fulfilled")this.disposeObject(r.value.scene);});
        for (const r of results.slice(0, 2)) if (r.status === "fulfilled" && "scene" in r.value) this.disposeObject(r.value.scene);
        if (!this.disposed) throw new Error("The city could not load. Check your connection and reload.");
        return;
      }
      const city = (results[0] as PromiseFulfilledResult<Awaited<ReturnType<GLTFLoader["loadAsync"]>>>).value;
      const truck = (results[1] as PromiseFulfilledResult<Awaited<ReturnType<GLTFLoader["loadAsync"]>>>).value;
      this.data = (results[2] as PromiseFulfilledResult<CityData>).value;
      this.city.add(city.scene); this.truck.add(truck.scene);this.life.root.visible=true;
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
      this.truck.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof THREE.MeshStandardMaterial){if(m.name.includes("glass")){m.roughness=.12;m.metalness=.22;}if(m.name.includes("Brushed metal")){m.roughness=.3;m.metalness=.65;}}}});
      this.wheels = ["Front_Left", "Front_Right", "Rear_Left", "Rear_Right"].map(n => truck.scene.getObjectByName(`Wheel_${n}`)).filter((o): o is THREE.Object3D => Boolean(o));
      this.truck.position.fromArray(this.data.playerStart); this.truck.position.y = .35;
      this.camera.position.copy(this.truck.position).add(new THREE.Vector3(-16, 16, 21));
      this.orbit.target.copy(this.truck.position).add(new THREE.Vector3(0,1,0));this.orbit.update();
      this.solidWalls=[...WORLD_WALLS,...this.data.buildingBoxColliders.map(c=>({x:c.center[0],z:c.center[2],hx:c.size[0]/2,hz:c.size[2]/2})),...this.life.solidWalls,...this.street.walls,...this.activities.walls];
      const pack=await packPromise,people=(await peoplePromise).flatMap(r=>r.status==="fulfilled"?[r.value]:[]);
      if(this.disposed){if(pack)this.disposeObject(pack.scene);for(const p of people)this.disposeObject(p.scene);return;}
      if(pack){
        this.environmentAssets=new CityEnvironment(pack.scene,this.data.buildingBoxColliders);
        this.environmentAssets.upgradeBuildings(this.city);this.environmentAssets.populate();this.city.add(this.environmentAssets.root);this.life.useDetailedTraffic();this.environmentAssets.updateTraffic(this.life.trafficPoses());
        if(people.length){this.environmentAssets.attachPeople(people);this.life.useDetailedPeople();this.environmentAssets.updatePeople(this.life.walkerPoses(),0);}
      }
      if(!pack)for(const p of people)this.disposeObject(p.scene);
      this.phase = "ready"; this.loaded(this.data); this.emit();
    } catch (error) { if (!this.disposed) { this.phase = "error"; this.message = error instanceof Error ? error.message : "Unable to load the game."; this.emit(); } }
  }
  prepareAudio(){if(this.sound)this.motor.unlock();}
  private resumeAudio=()=>{if(this.sound&&this.phase==="playing"&&!this.motor.isRunning())this.motor.unlock();};
  start() {
    if (!this.data || this.phase === "error") return;
    if(this.sound)this.motor.unlock();
    this.camera.fov=this.view===1?72:48;this.camera.updateProjectionMatrix();
    this.cursorYaw=null;this.clearTouchDrive();this.life.reset();this.street.reset();this.activities.reset();this.activities.root.visible=true;this.street.root.visible=true;this.drift={x:0,z:0};this.taken.clear(); this.cargo = emptyCargo(); this.seconds = ROUND_SECONDS; this.heading = Math.PI / 2; this.speed = 0;
    for (const p of this.data.collectibles) { const o = this.city.getObjectByName(p.node); if (o) o.visible = true; }
    this.truck.position.fromArray(this.data.playerStart); this.truck.position.y = .35;
    this.phase = "playing"; this.city.visible = true;this.life.root.visible=true; this.finishStage.visible = false; this.confetti.visible = false;
    this.camera.position.copy(this.truck.position).add(new THREE.Vector3(-16, 16, 21));
      this.orbit.target.copy(this.truck.position).add(new THREE.Vector3(0,1,0));this.orbit.update(); this.keys.clear(); this.say("Your round starts now. Follow the glowing marker.", 5);
    this.tone(523); this.emit();
  }
  togglePause() { if (this.phase === "playing") { this.phase = "paused"; this.keys.clear();this.clearTouchDrive();this.motor.update(this.speed,false,false); } else if (this.phase === "paused") {this.phase = "playing";this.resumeAudio();} this.emit(); }
  toggleCamera() {
    this.view=toggleDrivingCamera(this.view);this.cursorYaw=null;this.orbit.enabled=false;
    this.camera.fov=this.view===1?72:48;this.camera.updateProjectionMatrix();
    this.say(this.view===1?"First-person camera":"Third-person camera");this.emit();
  }
  freeCamera(){
    this.view=2;this.cursorYaw=null;this.camera.fov=48;this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.truck.position).add(new THREE.Vector3(-16,16,21));
    this.orbit.target.copy(this.truck.position).add(new THREE.Vector3(0,1,0));this.orbit.update();
    this.say("360° free camera · move cursor to look");this.emit();
  }
  enableSound(){this.sound=true;this.motor.setEnabled(true);this.emit();}
  toggleSound() { this.sound = !this.sound; this.motor.setEnabled(this.sound); this.emit(); }
  private blur = () => { this.keys.clear(); if (this.phase === "playing") this.togglePause(); };
  private visibility = () => { if (document.hidden) this.blur(); };
  private keydown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement)?.closest("input, textarea, select, a")) return;
    if ((event.target as HTMLElement)?.closest("button") && ["Enter", " "].includes(event.key)) return;
    const key = event.key.toLowerCase();
    if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","j","l","i","k"].includes(key))this.touchDriving=false;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "tab"].includes(key) && key !== "tab") event.preventDefault();
    this.resumeAudio();
    this.keys.add(key);
    if (event.repeat) return;
    if (key === "e") this.collect();
    if (key === "p" || key === "escape") this.togglePause();
    if (key === "c") this.toggleCamera();
    if (key === "v") this.freeCamera();
    if (key === "r" && this.phase === "playing") this.rescue();
    if (key === "enter") { if (this.phase === "ready" || this.phase === "finished") {if(this.requestStart)this.requestStart();else this.start();} else if (this.phase === "paused") this.togglePause(); }
  };
  private keyup = (event: KeyboardEvent) => { this.keys.delete(event.key.toLowerCase()); };
  setTouchDrive(input:TouchDrive){
    if(this.phase!=="playing"){this.clearTouchDrive();return;}
    this.touch={steering:Math.max(-1,Math.min(1,input.steering)),throttle:Math.max(-1,Math.min(1,input.throttle)),brake:input.brake};
    if(input.steering||input.throttle||input.brake)this.touchDriving=true;
  }
  private clearTouchDrive(){this.touch={steering:0,throttle:0,brake:false};this.touchPointers.clear();}
  setControl(key: string, pressed: boolean) { if (pressed) this.keys.add(key); else this.keys.delete(key); }
  private tone(frequency:number){this.motor.cue(frequency);}
  private say(text: string, seconds = 3) { this.message = text; this.messageUntil = performance.now() + seconds * 1000; }
  collect() {
    if (this.phase !== "playing") return;
    const station=this.street.nearby(this.truck.position.x,this.truck.position.z);
    if(station&&(!this.nearest||this.distance(this.nearest)>20)){
      if(Math.abs(this.speed)>3){this.say("Brake to use the sorting stop.");return;}
      const result=this.street.use(this.truck.position.x,this.truck.position.z,this.taken.size,this.seconds);
      if(result){this.seconds+=result.bonus;this.say(result.message,4);this.tone(880);this.emit();}return;
    }
    if(!this.nearest)return;
    if (this.distance(this.nearest) > 20) { this.say("Drive closer to the glowing marker."); return; }
    if (Math.abs(this.speed) > 8) { this.say("Slow down or hold Space to collect."); return; }
    const p = this.nearest;
    if (!canCollect(p.wasteType, this.cargo, this.taken, p.id)) return;
    this.life.burst(p.position,WASTE[p.wasteType].color);
    this.taken.add(p.id); this.cargo[p.wasteType]++;
    const object = this.city.getObjectByName(p.node); if (object) object.visible = false;
    this.say(p.wasteType === "ewaste" ? "E-waste secured for specialist processing. +200" : `${WASTE[p.wasteType].label} collected. +${WASTE[p.wasteType].points}`);
    this.tone(p.wasteType === "ewaste" ? 784 : 660);
    if (this.taken.size >= TOTAL_TARGET) this.finish();
    this.emit();
  }
  private rescue() {
    const snap = (v: number) => THREE.MathUtils.clamp(Math.round(v / 120) * 120, -360, 360);
    this.truck.position.set(snap(this.truck.position.x), .35, snap(this.truck.position.z)); this.speed = 0;this.drift={x:0,z:0}; this.say("Back on the road. Keep going!");
  }
  endRound() { if (this.phase === "playing" || this.phase === "paused") this.finish(); }
  private finish() { this.camera.fov=48;this.camera.updateProjectionMatrix();this.clearTouchDrive();this.life.root.visible=false;this.street.root.visible=false;this.activities.root.visible=false;this.city.visible = false; this.finishStage.visible = true; this.truck.position.set(0,.35,0); this.truck.rotation.y = -.3; this.phase = "finished"; this.motor.update(0,false,false);this.keys.clear(); this.speed = 0; this.confettiTime = 0; this.confetti.visible = true; this.ring.visible = this.beam.visible = false; this.tone(1046); this.emit(); }
  private distance(p: Pickup) { return Math.hypot(this.truck.position.x - p.position[0], this.truck.position.z - p.position[2]); }
  private emit() {
    const pos = this.truck.position;
    const district = this.data?.districts.reduce((a, b) => Math.hypot(pos.x - a.center[0], pos.z - a.center[2]) < Math.hypot(pos.x - b.center[0], pos.z - b.center[2]) ? a : b);
    this.update({ phase: this.phase, seconds: this.seconds, score: finalScore(this.cargo, this.seconds), cargo: { ...this.cargo }, collected: [...this.taken], nearest: this.nearest, distance: this.nearest ? this.distance(this.nearest) : 0, speed: Math.round(Math.abs(this.speed) * 3.6), x: pos.x, z: pos.z, heading: this.heading, message: this.message, district: district?.id.slice(3) ?? "Circular City", camera: this.view, sound: this.sound, soundRunning:this.motor.isRunning(), landmarks:this.activities.visitedIds, reverse:this.speed<-.25, interaction:this.street.nearby(pos.x,pos.z)?.name });
  }
  private tick = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min((now - (this.lastTime || now)) / 1000, .05); this.lastTime = now;
    if (this.phase === "playing" && this.data) {
      this.seconds = Math.max(0, this.seconds - dt);
      const braking=this.keys.has(" ")||this.touch.brake;
      const input = braking?0:THREE.MathUtils.clamp(Number(this.keys.has("w") || this.keys.has("arrowup")) - Number(this.keys.has("s") || this.keys.has("arrowdown"))+this.touch.throttle,-1,1);
      this.speed += (input * 15 - this.speed * (braking ? 7 : .55)) * dt;
      this.speed = THREE.MathUtils.clamp(this.speed, -10, 26);
      const steering = THREE.MathUtils.clamp(Number(this.keys.has("a") || this.keys.has("arrowleft")) - Number(this.keys.has("d") || this.keys.has("arrowright"))-this.touch.steering,-1,1);
      this.heading += steering * Math.min(Math.abs(this.speed) / 8, 1) * Math.sign(this.speed) * 1.65 * dt;
      this.truck.rotation.y = this.heading;
      const forwardX=Math.cos(this.heading),forwardZ=-Math.sin(this.heading),decay=Math.exp(-5*dt);
      const body:Body={x:this.truck.position.x,z:this.truck.position.z,vx:forwardX*this.speed+this.drift.x*decay,vz:forwardZ*this.speed+this.drift.z*decay,radius:1.35,capsule:1.6,yaw:this.heading,mass:5};
      const impact=physicsStep(body,this.street.bodies,[...this.solidWalls,...this.life.trafficWalls()],dt);
      this.truck.position.x=body.x;this.truck.position.z=body.z;
      this.speed=body.vx*forwardX+body.vz*forwardZ;
      this.drift={x:body.vx-forwardX*this.speed,z:body.vz-forwardZ*this.speed};
      if(impact>5&&now-this.lastImpact>900){this.lastImpact=now;this.say("Easy on the corners — brake before turning.",2);this.life.burst([body.x,.5,body.z],"#f6cf8c");this.tone(100);}
      this.street.update(dt);this.activities.animate(dt);
      const trail=this.activities.check(body.x,body.z,this.seconds);
      if(trail){this.seconds+=trail.bonus;this.say(trail.landmark.name+" explored. +"+Math.round(trail.bonus)+" seconds!",3);this.tone(880);this.life.burst([body.x,.5,body.z],"#f6d396");}
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
    this.motor.update(this.speed,this.keys.has("w")||this.keys.has("arrowup")||this.keys.has("s")||this.keys.has("arrowdown")||this.touch.throttle!==0,this.phase==="playing");
    if(this.life.root.visible)this.life.update(dt,this.truck.position,this.phase==="playing"||this.phase==="ready");
    this.environmentAssets?.updateTraffic(this.life.trafficPoses());
    this.environmentAssets?.updatePeople(this.life.walkerPoses(),this.phase==="playing"||this.phase==="ready"?dt:0);
    this.target.copy(this.truck.position);
    this.sun.position.copy(this.target).add(new THREE.Vector3(-50,90,45));this.sun.target.position.copy(this.target);
    const chase=chaseOffset(this.heading),offset=new THREE.Vector3(chase.x,chase.y,chase.z);
    if (this.phase === "finished") { this.confettiTime += dt; offset.set(Math.cos(now / 7000) * 12, 8, Math.sin(now / 7000) * 12); }
    const lookTarget=this.target.clone().add(new THREE.Vector3(0,1,0));
    this.truck.visible=this.view!==1||this.phase==="finished";
    if(this.view===1&&this.phase!=="finished"){
      this.orbit.enabled=false;const driver=driverView(this.target.x,this.target.z,this.heading);
      this.camera.position.set(driver.eye.x,driver.eye.y+.35,driver.eye.z);this.camera.lookAt(driver.target.x,driver.target.y+.35,driver.target.z);
    }else if(this.view===2 && this.phase!=="finished"){
      this.orbit.enabled=this.phase==="playing";
      this.camera.position.add(lookTarget.clone().sub(this.orbit.target));this.orbit.target.copy(lookTarget);
      if(this.phase==="playing"){
        if(["j","l","i","k"].some(key=>this.keys.has(key)))this.cursorYaw=null;
        if(this.touchDriving&&now>this.touchCameraUntil){
          const chaseYaw=this.heading-Math.PI/2,delta=this.orbit.getAzimuthalAngle()-chaseYaw;
          this.orbit.rotateLeft(Math.atan2(Math.sin(delta),Math.cos(delta))*.025);
          this.orbit.rotateUp((this.orbit.getPolarAngle()-.88)*.02);
        }
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
    window.removeEventListener("pointerdown",this.resumeAudio);
    window.removeEventListener("keydown", this.keydown); window.removeEventListener("keyup", this.keyup); window.removeEventListener("blur", this.blur); document.removeEventListener("visibilitychange", this.visibility);
    this.renderer.domElement.removeEventListener("pointermove",this.cursorMove);this.renderer.domElement.removeEventListener("pointerleave",this.cursorLeave);
    this.renderer.domElement.removeEventListener("pointerdown",this.touchLookStart);this.renderer.domElement.removeEventListener("pointerup",this.touchLookEnd);this.renderer.domElement.removeEventListener("pointercancel",this.touchLookEnd);this.renderer.domElement.removeEventListener("lostpointercapture",this.touchLookEnd);
    this.clearTouchDrive();this.environmentAssets?.dispose();this.activities.dispose();this.street.dispose();this.life.dispose();this.orbit.dispose(); this.motor.dispose(); this.environment.dispose(); this.roadTexture?.dispose(); this.sun.shadow.dispose(); this.disposeObject(this.scene); this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
