import * as T from 'three'
import { Batch,channel,generator,ground,obstacles,pathX,photo,smooth,V } from './world'
import { forestCrowns,addBankPlants } from './forest-scans'
function barkMesh(){
  const pos:number[]=[],uv:number[]=[],ix:number[]=[],color:number[]=[]
  const rand=generator(514)
  function trunk(x:number,y:number,z:number,h:number,r:number,birch:boolean,leanX:number,leanZ:number){
    const base=pos.length/3,n=8,az=rand()*6,offset=rand()*6,shade=.79+.21*rand()
    const rings=[0,.025,.15,.45,.74,1],rs=[1.52,1.13,.96,.71,.42,.035]
    rings.forEach((t,k)=>{
      for(let j=0;j<=n;j++){
        const a=j/n*Math.PI*2+az,rad=r*rs[k]*(1+.07*Math.sin(a*3+offset)+.05*Math.cos(a*5))
        pos.push(x+leanX*t*t+Math.cos(a)*rad,y+h*t,z+leanZ*t*t+Math.sin(a)*rad)
        uv.push(j/n*Math.max(.7,r*2.8)+offset,t*h*.46+offset)
        const moss=k===0?.66:1, s=shade*moss*(1+.08*Math.cos(a))
        color.push(s*(birch?1.5:1.02),s*(birch?1.53:.93),s*(birch?1.33:.77))
        if(k<rings.length-1&&j<n){const a=base+k*(n+1)+j;ix.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2)}
      }
    })
  }
  function finish(scene:T.Scene) {
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.setIndex(ix);g.computeVertexNormals()
    const m=new T.Mesh(g,new T.MeshStandardMaterial({map:photo('bark_brown_02'),normalMap:photo('bark_brown_02','nor_gl'),normalScale:new T.Vector2(.75,.75),vertexColors:true,roughness:1}))
    m.receiveShadow=m.castShadow=true;scene.add(m)
  }
  return {trunk,finish}
}
export function addForest(scene:T.Scene) {
  const rand=generator(84912), crowns={fir:forestCrowns('fir'),pine:forestCrowns('pine'),sapling:forestCrowns('sapling')},bark=barkMesh()
  const centers:{x:number,z:number}[]=[]
  const branchRand=generator(713),limbs=new Batch(new T.CylinderGeometry(.32,1,1,6),new T.MeshStandardMaterial({map:photo('bark_brown_02'),roughness:1}))
  function limb(a:T.Vector3,b:T.Vector3,r:number){
    const d=b.clone().sub(a),length=d.length(),rotation=new T.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize())
    limbs.matrices.push(new T.Matrix4().compose(a.clone().lerp(b,.5),rotation,V(r,length,r)))
    limbs.colors.push(new T.Color(0xbba88c))
  }
  function tree(x:number,z:number,h:number,r:number,full:boolean){
    const y=ground(x,z)-.07,phase=rand()*6.28,small=h<6
    const species=small?'sapling':full?'pine':'fir'
    const width=h*(small?.69:full?.57:.45)*(.82+.35*rand())
    const trunkR=small?h*.022:r, shade=.69+.41*rand()
    bark.trunk(x,y,z,h*.96,trunkR,false,(rand()-.5)*.29,(rand()-.5)*.29)
    if(!small&&Math.hypot(x,z)<29){
      for(let j=0;j<10;j++){
        const t=.25+j*.063+branchRand()*.06,a=phase+j*2.396+branchRand()*.8
        const len=width*(.10+.21*Math.sin(t*2.9))*(.68+.56*branchRand()),dx=Math.cos(a)*len,dz=Math.sin(a)*len
        const p=V(x,y+h*t,z),q=p.clone().add(V(dx*.62,-len*.09,dz*.62)),end=p.clone().add(V(dx,len*.15,dz))
        limb(p,q,r*(.20+.12*(1-t)));limb(q,end,r*.105)
      }
      for(let j=0;j<5;j++){
        const a=phase+j*1.257+branchRand()*.4,len=r*(2.9+branchRand()*1.4),xx=x+Math.cos(a)*len,zz=z+Math.sin(a)*len
        limb(V(x,y+r*.86,z),V(xx,ground(xx,zz)-.025,zz),r*.39)
      }
    }
    centers.push({x,z})
    if(Math.abs(x)<21&&Math.abs(z)<16)obstacles.push({x,z,r:trunkR+.22})
    for(const batch of crowns[species]) batch.add(x,y,z,width,h,width,0,phase,0,new T.Color().setScalar(shade))
  }
  for(const [x,z,h,r] of [[-5.1,10,17,.42],[3.9,8,18,.53],[-4.4,4.3,13,.37],[5.1,3.6,14,.34],[3.5,-5.8,16,.38],[-4.6,-4.6,15,.41],[-10.5,-7,19,.58]])tree(x,z,h,r,false)
  for(let i=0;i<2400;i++){
    const x=(rand()-.5)*94,z=(rand()-.5)*94, near=Math.hypot(x,z)<24
    if(channel(x,z)<2.9||Math.abs(z)<19&&Math.abs(x-pathX(z))<(z>2?2.9:2.25)||Math.hypot(x+6,z+9)<4.3||Math.hypot(x-8,z+27)<5.5)continue
    if(z<-4&&z>-26&&Math.abs(x-(-z)*.29)<1.65)continue
    // Leave a narrow opening in the canopy on the sunward side of the bridge.
    if(z<2 && z>-30 && Math.abs(x+z*.615)<2.15+(-z)*.049 && rand()<.93)continue
    if(centers.some(c=>(c.x-x)**2+(c.z-z)**2<(near?7.1:11.4)))continue
    const h=7+rand()*13;tree(x,z,h,h*(.010+rand()*.010),rand()<.53)
  }
  for(let i=0;i<140;i++){
    const x=(rand()-.5)*51,z=(rand()-.5)*46
    if(channel(x,z)<3.3 || Math.abs(x-pathX(z))<2.65 || Math.hypot(x+6,z+9)<4.2||z<0&&Math.abs(x+z*.29)<2.1)continue
    const h=1.2+rand()*3.6;tree(x,z,h,h*.025,false)
  }
  for(const pair of Object.values(crowns))for(const batch of pair)batch.finish(scene)
  bark.finish(scene);limbs.finish(scene);addBankPlants(scene)
  grass(scene,rand)
}
function grass(scene:T.Scene,rand:()=>number){
  const pos:number[]=[],colors:number[]=[],ix:number[]=[]
  const col=new T.Color()
  for(let i=0;i<12000;i++){
    const x=(rand()-.5)*50,z=(rand()-.5)*44,edge=Math.abs(x-pathX(z))
    if(channel(x,z)<2.4||edge<1+.27*Math.sin(z*2.7)||Math.hypot(x+6,z+9)<2.5||rand()>.5+.29*Math.sin(x*2)*Math.cos(z*.9))continue
    const lush=smooth(1.1,2.1,edge),h=(.13+rand()*.28)*(.38+.62*lush)
    const count=4+Math.floor(rand()*8)
    for(let k=0;k<count;k++){
      const xx=x+(rand()-.5)*.16,zz=z+(rand()-.5)*.16,yy=ground(xx,zz)-.02
      const a=rand()*6.28,w=.012+rand()*.021,dx=Math.cos(a),dz=Math.sin(a),hh=h*(.5+rand()),lean=hh*(.22+rand()*.66)
      const n=pos.length/3
      pos.push(xx-w*dz,yy,zz+w*dx,xx+w*dz,yy,zz-w*dx,xx+dx*lean*.38+w*dz*.6,yy+hh*.66,zz+dz*lean*.38-w*dx*.6,xx+dx*lean*.38-w*dz*.6,yy+hh*.66,zz+dz*lean*.38+w*dx*.6,xx+dx*lean,yy+hh,zz+dz*lean)
      col.setHSL(.18+rand()*.065,.24+rand()*.26,.24+rand()*.18,T.SRGBColorSpace)
      for(const b of [.48,.48,.88,.88,1.26])colors.push(col.r*b,col.g*b,col.b*b)
      ix.push(n,n+1,n+2,n,n+2,n+3,n+3,n+2,n+4)
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(ix);g.computeVertexNormals()
  const mat=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide,emissive:0x1f2817,emissiveIntensity:.35})
  mat.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(normal*.32+mat3(viewMatrix)*vec3(0.,.9,0.));')}
  const m=new T.Mesh(g,mat);m.receiveShadow=true;scene.add(m)
}

