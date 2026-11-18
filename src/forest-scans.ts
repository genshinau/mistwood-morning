import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Batch,channel,creek,generator,ground,manager,pathX } from './world'
import fernModel from './assets/fern.glb?url'
import stoneModel from './assets/stone.glb?url'
const atlases=import.meta.glob<string>('./assets/*.webp',{eager:true,query:'?url',import:'default'})
function layers(axis:number,trim:number){
  const pos:number[]=[],uv:number[]=[],idx:number[]=[]
  for(let i=0;i<4;i++){
    const depth=.5-(i+.5)/4,u=(i%2)*.5,v=(1-Math.floor(i/2))*.5
    for(const [x,y] of [[-.5,trim],[.5,trim],[-.5,1],[.5,1]]){
      pos.push(axis===0?x:depth,y,axis===0?depth:-x)
      uv.push(u+(x+.5)*.5,v+y*.5)
    }
    const n=i*4;idx.push(n,n+1,n+2,n+2,n+1,n+3)
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
}
export function forestCrowns(type:'fir'|'pine'|'sapling'){
  return [0,1].map(axis=>{
    const tex=new T.TextureLoader(manager).load(atlases['./assets/'+type+'-'+axis+'.webp'])
    tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4
    const mat=new T.MeshLambertMaterial({map:tex,side:T.DoubleSide,alphaTest:.30,emissive:0x293324,emissiveIntensity:.26})
    mat.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(mat3(viewMatrix)*vec3(.10,.99,-.09));')}
    return new Batch(layers(axis,0),mat)
  })
}
export function addBankPlants(scene:T.Scene) {
  const rand=generator(5718),loader=new GLTFLoader(manager)
  loader.load(fernModel,gltf=>{
    const src=gltf.scene.children[0] as T.Mesh
    const batch=new Batch(src.geometry,src.material as T.Material),tint=new T.Color()
    for(let i=0;i<1680;i++){
      const x=(rand()-.5)*48,z=(rand()-.5)*43,dist=Math.abs(x-pathX(z))
      if(dist<1.35||channel(x,z)<2.5||Math.hypot(x+6,z+9)<2.95||rand()>.52+.28*Math.sin(x*1.29+Math.cos(z))+.19*Math.cos(z*1.31))continue
      const s=.56+rand()*1.04
      tint.setScalar(.83+.34*rand())
      batch.add(x,ground(x,z)-.032,z,s,s,s,0,rand()*6.283,0,tint)
    }
    batch.finish(scene,false)
  })
  loader.load(stoneModel,gltf=>{
    const src=gltf.scene.children[0] as T.Mesh,batch=new Batch(src.geometry,src.material as T.Material)
    for(let i=0;i<112;i++){
      const x=(rand()-.5)*54,z=creek(x)+(rand()<.5?-1:1)*(.7+rand()*3.35)
      if(Math.abs(x)<1.85)continue
      const s=.14+rand()**2*.72
      batch.add(x,ground(x,z)-s*.16,z,s*(.9+rand()*.45),s*.72,s,0,rand()*6.28,(rand()-.5)*.32,new T.Color().setScalar(.78+rand()*.24))
    }
    batch.finish(scene)
  })
}


