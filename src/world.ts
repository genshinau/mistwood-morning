import * as T from 'three'
export const clamp = T.MathUtils.clamp
export const smooth = (a:number,b:number,x:number) => T.MathUtils.smoothstep(x,a,b)
export function generator(seed:number) {
  return () => { seed = (Math.imul(1664525,seed) + 1013904223) >>> 0; return seed / 4294967296 }
}
export const creek = (x:number) => .19*x + 1.05*Math.sin(.34*x)
export const channel = (x:number,z:number) => Math.abs(z-creek(x))
export const pathX = (z:number) => z>=0 ? -2.5*smooth(3,13,z) + .33*Math.sin(z*.43)*smooth(3,8,z) : -4.2*smooth(3,11,-z)
export function ground(x:number,z:number) {
  const bank = smooth(1.45,3.65,channel(x,z))
  const pathEdge = smooth(1.3,4,Math.abs(x-pathX(z)))
  const hill = pathEdge*smooth(2.7,6.7,channel(x,z))*(.30*Math.sin(x*.48+z*.22)+.24*Math.cos(z*.6)+.65)
  const ridge=2.6*Math.exp(-((x-6.8)**2/28+(z+23.0)**2/5.8))
  return -.68 + bank*(.98+hill+ .09*Math.sin(.61*z)) + 2.2*smooth(16,34,-z)+ridge
}
export const bridgeH = (z:number) => .48 + .22*(1-Math.min(z*z/17.64,1))
export const onBridge = (x:number,z:number) => Math.abs(x)<1.19 && Math.abs(z)<=4.22
export const floorAt = (x:number,z:number) => onBridge(x,z) ? Math.max(bridgeH(z),ground(x,z)) : ground(x,z)
export const obstacles:{x:number,z:number,r:number}[]=[]
export function allowed(x:number,z:number) {
  if (Math.abs(x)>20 || Math.abs(z)>15) return false
  if (!onBridge(x,z) && channel(x,z)<2.55) return false
  if (Math.abs(z)<3.95 && Math.abs(x)>.99 && Math.abs(x)<1.35) return false
  return !obstacles.some(o=>(x-o.x)**2+(z-o.z)**2<o.r*o.r)
}
export const V = (x:number,y:number,z:number)=>new T.Vector3(x,y,z)
export function put(scene:T.Object3D,geo:T.BufferGeometry,mat:T.Material,x:number,y:number,z:number) {
  const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m
}
export function beam(scene:T.Object3D,a:T.Vector3,b:T.Vector3,r1:number,r2:number,mat:T.Material,sides=10) {
  const mid=a.clone().lerp(b,.5), vec=b.clone().sub(a)
  const m=put(scene,new T.CylinderGeometry(r2,r1,vec.length(),sides),mat,mid.x,mid.y,mid.z)
  m.quaternion.setFromUnitVectors(V(0,1,0),vec.normalize());return m
}
export class Batch {
  matrices:T.Matrix4[]=[]; colors:T.Color[]=[]
  constructor(public geo:T.BufferGeometry,public mat:T.Material){}
  add(x:number,y:number,z:number,sx:number,sy:number,sz:number,rx:number,ry:number,rz:number,color:T.Color){
    const q=new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz,'YXZ'))
    this.matrices.push(new T.Matrix4().compose(V(x,y,z),q,V(sx,sy,sz)));this.colors.push(color)
  }
  finish(scene:T.Scene,cast=true) {
    const m=new T.InstancedMesh(this.geo,this.mat,this.matrices.length)
    this.matrices.forEach((a,i)=>{m.setMatrixAt(i,a);m.setColorAt(i,this.colors[i])})
    m.castShadow=cast;m.receiveShadow=true;scene.add(m)
  }
}
const sources=import.meta.glob<string>('./assets/*.jpg',{eager:true,query:'?url',import:'default'})
export const manager=new T.LoadingManager()
export function photo(id:string,kind='diff',repeatX=1,repeatY=1) {
  const tex=new T.TextureLoader(manager).load(sources['./assets/'+id+'_'+kind+'_1k.jpg'])
  tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(repeatX,repeatY);tex.anisotropy=4
  if(kind==='diff')tex.colorSpace=T.SRGBColorSpace
  return tex
}

