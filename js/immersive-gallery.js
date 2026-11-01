import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const root = document.querySelector("[data-immersive-gallery]");
if (root) bootGallery(root);

function bootGallery(root) {
  const canvas = root.querySelector("canvas");
  canvas.tabIndex = 0;
  const fallback = root.querySelector(".gallery-fallback");
  const status = root.querySelector("[data-gallery-status]");
  const roomButtons = [...root.querySelectorAll("[data-room]")];
  const motionOK = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  let renderer, scene, camera, raf, active = true;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch {
    fallback.hidden = false;
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
  renderer.setSize(root.clientWidth, root.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070706);
  scene.fog = new THREE.FogExp2(0x080807, 0.027);
  camera = new THREE.PerspectiveCamera(66, root.clientWidth / root.clientHeight, .1, 90);
  camera.position.set(0, 1.65, 8);

  scene.add(new THREE.HemisphereLight(0x9c8b70, 0x090807, 1.0));
  const warm = new THREE.PointLight(0xd9ad67, 28, 22, 1.8);
  warm.position.set(0, 4.7, 0); scene.add(warm);
  const gold = new THREE.PointLight(0x9c6b2e, 18, 18, 2);
  gold.position.set(-7, 3, -8); scene.add(gold);

  const mat = (color, roughness=.8, metalness=.1) => new THREE.MeshStandardMaterial({color,roughness,metalness});
  const floorMat = mat(0x171512,.28,.48);
  const wallMat = mat(0x171614,.88,.12);
  const trimMat = mat(0x9c7742,.32,.72);
  const ceilingMat = mat(0x0d0d0c,.95,.05);
  const addBox = (w,h,d,x,y,z,m) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
    mesh.position.set(x,y,z); scene.add(mesh); return mesh;
  };
  addBox(34,.22,42,0,-.12,-9,floorMat);
  addBox(34,.25,42,0,5.2,-9,ceilingMat);
  addBox(34,5.2,.3,0,2.5,-30,wallMat);
  addBox(34,5.2,.3,0,2.5,10,wallMat);
  addBox(.3,5.2,42,-17,2.5,-9,wallMat);
  addBox(.3,5.2,42,17,2.5,-9,wallMat);
  // Interior partitions form four connected wings; openings preserve free movement.
  addBox(.24,5.2,10,-5,2.5,-8,wallMat);
  addBox(.24,5.2,10,5,2.5,-8,wallMat);
  // Cross-passages keep all four wings connected while preserving the room layout.
  for (const [x,w] of [[-11.75,10.5],[-2.5,2],[2.5,2],[11.75,10.5]]) addBox(w,5.2,.24,x,2.5,-13,wallMat);
  for (const [x,w] of [[-12.5,4],[-6.5,2],[6.5,2],[12.5,4]]) addBox(w,5.2,.24,x,2.5,-3,wallMat);

  // Gold architectural light lines.
  for (const x of [-16.7,16.7]) addBox(.035,.035,39,x,4.97,-9,trimMat);
  for (const z of [-29.7, -15, 0, 10]) addBox(32,.025,.035,0,.015,z,trimMat);

  const rooms = [
    {name:"قاعة التخرج",x:-9,z:-19,side:"back"},
    {name:"قاعة البورتريه",x:9,z:-19,side:"back"},
    {name:"قاعة تعديل الألوان",x:-9,z:1,side:"front"},
    {name:"قاعة صور الوثائق",x:9,z:1,side:"front"}
  ];
  const artMaterials=[];
  function makeArtTexture(index) {
    const c=document.createElement("canvas"); c.width=512;c.height=640;
    const g=c.getContext("2d");
    const grad=g.createLinearGradient(0,0,512,640);
    const palettes=[["#17130f","#8b673d","#d5b77f"],["#0d1112","#4d5552","#b7a68b"],["#17100d","#70452c","#c9a06a"],["#101010","#4d4336","#d1c09d"]];
    grad.addColorStop(0,palettes[index%4][0]);grad.addColorStop(.62,palettes[index%4][1]);grad.addColorStop(1,palettes[index%4][2]);
    g.fillStyle=grad;g.fillRect(0,0,512,640);
    g.strokeStyle="rgba(229,194,135,.7)";g.lineWidth=3;g.strokeRect(22,22,468,596);
    g.globalAlpha=.35;g.fillStyle="#080808";
    g.beginPath();g.ellipse(256,260,112,158,0,0,Math.PI*2);g.fill();
    g.globalAlpha=.65;g.strokeStyle="#e5c58e";g.lineWidth=2;
    for(let r=40;r<210;r+=28){g.beginPath();g.arc(256,300,r,-1.2,1.2);g.stroke();}
    g.globalAlpha=1;g.fillStyle="#ead5b0";g.font="28px Cairo, sans-serif";g.textAlign="center";
    g.fillText(["التخرج","بورتريه","تعديل الألوان","الوثائق"][index%4],256,570);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({map:texture});
  }
  function addFrame(x,y,z,rotationY,index) {
    const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=rotationY;scene.add(group);
    const outer=new THREE.Mesh(new THREE.BoxGeometry(2.55,3.25,.16),mat(0x8b673b,.3,.75));group.add(outer);
    const inner=new THREE.Mesh(new THREE.BoxGeometry(2.34,3.04,.08),mat(0x090909,.5,.3));inner.position.z=.1;group.add(inner);
    const art=new THREE.Mesh(new THREE.PlaneGeometry(2.18,2.86),makeArtTexture(index));art.position.z=.15;group.add(art);
    const light=new THREE.SpotLight(0xffd99b,38,9,.45,.7,1.4);light.position.set(0,2.4,1.2);light.target.position.set(0,0,0);group.add(light,light.target);
    artMaterials.push(art.material);
    group.userData.roomIndex=index;
  }
  // Frames on each gallery wall.
  rooms.forEach((r,i)=>{
    const z = i<2 ? -29.78 : 9.78;
    const x = i%2===0 ? -9 : 9;
    addFrame(x,2.55,z, i<2?0:Math.PI,i);
    addFrame(x-2.8,2.55,z,i<2?0:Math.PI,(i+1)%4);
    addFrame(x+2.8,2.55,z,i<2?0:Math.PI,(i+2)%4);
  });

  const velocity=new THREE.Vector3();
  let yaw=0,pitch=0,dragging=false,lastX=0,lastY=0;
  const keys=new Set();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const onDown=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId);};
  const onMove=e=>{
    if(!dragging)return;
    const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;
    yaw-=dx*.0032;pitch=clamp(pitch-dy*.0022,-.45,.45);
  };
  const onUp=()=>dragging=false;
  canvas.addEventListener("pointerdown",onDown);canvas.addEventListener("pointermove",onMove);
  canvas.addEventListener("pointerup",onUp);canvas.addEventListener("pointercancel",onUp);
  window.addEventListener("keydown",e=>{if(e.target instanceof HTMLElement && e.target.closest("input,textarea,select,button,a"))return;if(["w","a","s","d","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){e.preventDefault();keys.add(e.key.toLowerCase());}});
  window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));
  canvas.addEventListener("wheel",e=>{e.preventDefault();camera.position.y=clamp(camera.position.y+e.deltaY*.001,.9,2.4);},{passive:false});

  function goRoom(index) {
    const targets=[[-9,1.65,-23],[9,1.65,-23],[-9,1.65,4],[9,1.65,4]];
    const [x,y,z]=targets[index];camera.position.set(x,y,z);
    yaw = index < 2 ? 0 : Math.PI;
    if(status)status.textContent=rooms[index].name;
    roomButtons.forEach((b,i)=>b.setAttribute("aria-pressed",String(i===index)));
  }
  roomButtons.forEach((b)=>b.addEventListener("click",()=>goRoom(Number(b.dataset.room))));
  root.querySelector("[data-gallery-start]")?.addEventListener("click",()=>{camera.position.set(0,1.65,7);yaw=0;pitch=0;if(status)status.textContent="القاعة الرئيسية";roomButtons.forEach(b=>b.setAttribute("aria-pressed","false"));});
  root.querySelectorAll("[data-move]").forEach(b=>{
    const key=b.dataset.move;
    b.addEventListener("pointerdown",e=>{e.preventDefault();keys.add(key);b.setPointerCapture?.(e.pointerId);});
    ["pointerup","pointerleave","pointercancel","lostpointercapture"].forEach(ev=>b.addEventListener(ev,()=>keys.delete(key)));
  });
  function resize(){
    const w=root.clientWidth,h=root.clientHeight;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
  }
  const observer=new ResizeObserver(resize);observer.observe(root);
  const clock=new THREE.Clock();
  function animate(){
    if(!active)return;
    const dt=Math.min(clock.getDelta(),.04);
    const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
    const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    velocity.set(0,0,0);
    if(keys.has("w")||keys.has("arrowup"))velocity.add(forward);
    if(keys.has("s")||keys.has("arrowdown"))velocity.sub(forward);
    if(keys.has("d")||keys.has("arrowright"))velocity.add(right);
    if(keys.has("a")||keys.has("arrowleft"))velocity.sub(right);
    if(velocity.lengthSq()) {
      velocity.normalize().multiplyScalar(dt*4.1);
      // Keep the visitor inside the architecture and prevent walking through partitions.
      const walls = [
        {minX:-5.16,maxX:-4.84,minZ:-13,maxZ:-3},
        {minX:4.84,maxX:5.16,minZ:-13,maxZ:-3},
        {minX:-17,maxX:-6.5,minZ:-13.16,maxZ:-12.84},
        {minX:-3.5,maxX:-1.5,minZ:-13.16,maxZ:-12.84},
        {minX:1.5,maxX:3.5,minZ:-13.16,maxZ:-12.84},
        {minX:6.5,maxX:17,minZ:-13.16,maxZ:-12.84},
        {minX:-14.5,maxX:-10.5,minZ:-3.16,maxZ:-2.84},
        {minX:-7.5,maxX:-5.5,minZ:-3.16,maxZ:-2.84},
        {minX:5.5,maxX:7.5,minZ:-3.16,maxZ:-2.84},
        {minX:10.5,maxX:14.5,minZ:-3.16,maxZ:-2.84}
      ];
      const blocked = (x,z) => walls.some(w =>
        x > w.minX-.38 && x < w.maxX+.38 &&
        z > w.minZ-.38 && z < w.maxZ+.38
      );
      const nextX=clamp(camera.position.x+velocity.x,-15.4,15.4);
      const nextZ=clamp(camera.position.z+velocity.z,-28.2,8.2);
      if(!blocked(nextX,camera.position.z)) camera.position.x=nextX;
      if(!blocked(camera.position.x,nextZ)) camera.position.z=nextZ;
    }
    camera.position.y=1.65;
    camera.rotation.order="YXZ";camera.rotation.y=yaw;camera.rotation.x=pitch;
    if(motionOK)warm.intensity=27+Math.sin(clock.elapsedTime*.7)*1.4;
    renderer.render(scene,camera);
    raf=requestAnimationFrame(animate);
  }
  animate();
  document.addEventListener("visibilitychange",()=>{active=!document.hidden;if(active){clock.getDelta();animate();}else cancelAnimationFrame(raf);});
  window.addEventListener("pagehide",()=>{cancelAnimationFrame(raf);observer.disconnect();renderer.dispose();});
}
