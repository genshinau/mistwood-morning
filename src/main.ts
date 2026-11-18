import * as T from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import './style.css'
import { allowed,clamp,floorAt,manager,pathX,V } from './world'
import { addLand,addStream,addStones } from './land'
import { addForest } from './foliage'
import { addLandmarks } from './landmarks'
import { atmosphere,lightForest } from './atmosphere'
const host=document.querySelector<HTMLElement>('#forest')!,welcome=document.querySelector<HTMLElement>('#welcome')!
const enter=document.querySelector<HTMLButtonElement>('#enter')!,message=document.querySelector<HTMLElement>('#message')!
function start() {
  const renderer=new T.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'})
  host.appendChild(renderer.domElement);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(62,1,.09,130)
  const z=13.3;camera.position.set(pathX(z),floorAt(pathX(z),z)+1.64,z);camera.lookAt(.72,1.69,-4)
  const controls=new PointerLockControls(camera,renderer.domElement);controls.pointerSpeed=.76
  controls.minPolarAngle=.14;controls.maxPolarAngle=Math.PI-.14
  const sun=lightForest(scene);addLand(scene);addLandmarks(scene);const water=addStream(scene);addStones(scene);addForest(scene)
  const pass=atmosphere(renderer,scene,camera,sun)
  const keys=new Set<string>(),forward=new T.Vector3(),right=new T.Vector3()
  let fallback=false,drag=false,active=false,seen=false,ready=false,assetsFailed=false
  function resize(){
    const scale=Math.min(window.devicePixelRatio||1,1.5,1600/window.innerWidth)
    renderer.setPixelRatio(scale);renderer.setSize(window.innerWidth,window.innerHeight)
    const buf=renderer.getDrawingBufferSize(new T.Vector2());pass.size(buf.x,buf.y)
    camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix()
  }
  function mode(enabled:boolean){
    active=enabled;welcome.hidden=enabled;keys.clear();drag=false
    if(enabled){seen=true;message.textContent=fallback?'按住鼠标拖动环顾，Esc 暂停。':''
      if(fallback)window.setTimeout(()=>{if(fallback&&active)message.textContent=''},3200)
    }
    else {fallback=false;message.textContent='';enter.textContent=seen?'继续漫步':'进入森林'}
  }
  controls.addEventListener('lock',()=>{fallback=false;mode(true)})
  controls.addEventListener('unlock',()=>mode(false))
  const useDrag=()=>{if(!controls.isLocked&&ready){fallback=true;mode(true)}}
  document.addEventListener('pointerlockerror',e=>{useDrag();e.stopImmediatePropagation()},{capture:true})
  enter.addEventListener('click',()=>{
    if(!ready)return
    try {
      const request=renderer.domElement.requestPointerLock?.()
      if(!renderer.domElement.requestPointerLock)useDrag()
      else request?.catch(useDrag)
    }catch{useDrag()}
  })
  renderer.domElement.addEventListener('pointerdown',e=>{if(fallback){drag=true;renderer.domElement.setPointerCapture(e.pointerId)}})
  renderer.domElement.addEventListener('pointerup',()=>{drag=false})
  const euler=new T.Euler(0,0,0,'YXZ')
  renderer.domElement.addEventListener('pointermove',e=>{
    if(!fallback||!drag)return
    euler.setFromQuaternion(camera.quaternion);euler.y-=e.movementX*.0016;euler.x=clamp(euler.x-e.movementY*.0016,-1.42,1.42);camera.quaternion.setFromEuler(euler)
  })
  window.addEventListener('keydown',e=>{
    if(!active)return
    if(e.code==='Escape'){if(document.pointerLockElement)document.exitPointerLock();mode(false);return}
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){keys.add(e.code);e.preventDefault()}
  })
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(active){if(document.pointerLockElement)document.exitPointerLock();mode(false)}})
  function walk(dt:number){
    const f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))
    const s=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))
    if(f||s){
      camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,V(0,1,0)).normalize()
      const speed=2.05*dt/Math.hypot(s,f),p=camera.position
      const x=p.x+(forward.x*f+right.x*s)*speed,z=p.z+(forward.z*f+right.z*s)*speed
      if(allowed(x,p.z))p.x=x
      if(allowed(p.x,z))p.z=z
    }
    const p=camera.position;p.y=T.MathUtils.damp(p.y,floorAt(p.x,p.z)+1.64,17,dt)
  }
  let last=0
  function frame(now:number){
    const dt=Math.min((now-last)/1000,.14);last=now
    if(!document.hidden&&ready){if(active)walk(dt);water(now*.001);pass.draw()}
    requestAnimationFrame(frame)
  }
  manager.onError=()=>{assetsFailed=true;message.textContent='材质读取失败，请重新打开样片。'}
  manager.onLoad=()=>{
    if(assetsFailed)return
    renderer.shadowMap.needsUpdate=true;pass.draw();ready=true;enter.disabled=false;enter.textContent='进入森林'
  }
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;enter.disabled=true;mode(false);message.textContent='图形设备已暂停。请刷新页面恢复森林。'})
  window.addEventListener('resize',resize);resize();requestAnimationFrame(frame)
}
try{start()}catch(error){console.error(error);message.textContent='森林未能启动。请使用开启硬件加速的桌面版 Chrome 或 Edge，再刷新页面。';enter.textContent='暂时无法进入'}

