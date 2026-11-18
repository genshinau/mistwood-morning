import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { beam,bridgeH,generator,ground,obstacles,photo,put,V } from './world'
function fabric(group:T.Group,points:number[][],mat:T.Material,idx:number[]){
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));g.setIndex(idx);g.computeVertexNormals()
  return put(group,g,mat,0,0,0)
}
export function addLandmarks(scene:T.Scene){
  const group=new T.Group(),rand=generator(8234)
  const wood=photo('rough_wood'),norm=photo('rough_wood','nor_gl')
  const plank=new T.MeshStandardMaterial({map:wood,normalMap:norm,normalScale:new T.Vector2(.45,.45),color:0xa99d7d,roughness:.86})
  const log=new T.MeshStandardMaterial({map:photo('bark_brown_02','diff',1,3),color:0xb1a089,roughness:.99})
  const rope=new T.MeshStandardMaterial({color:0x8f8060,roughness:1})
  const iron=new T.MeshStandardMaterial({color:0x3b3830,roughness:.74})
  for(const x of [-.86,.86])beam(group,V(x,.27,-4.25),V(x,.27,4.25),.17,.14,log)
  for(let i=0;i<31;i++){
    const z=-4.08+i*.272,height=bridgeH(z),w=2.33+rand()*.12
    const deck=put(group,new T.BoxGeometry(w,.131,.256-rand()*.015),plank,(rand()-.5)*.055,height-.065,z)
    deck.rotation.y=(rand()-.5)*.014;deck.rotation.z=(rand()-.5)*.013
    const uv=deck.geometry.attributes.uv
    const shift=rand()*6,vShift=rand()*3
    for(let j=0;j<uv.count;j++){const u=uv.getX(j),v=uv.getY(j);uv.setXY(j,v*.14+vShift,u*1.2+shift)}
    for(const x of [-.84,.84])put(group,new T.CylinderGeometry(.016,.016,.007,7),iron,x,height+.006,z)
  }
  for(const side of [-1,1]){
    const posts:T.Vector3[]=[]
    for(const z of [-3.8,0,3.8]){
      const x=side*1.15,b=bridgeH(z),top=V(x+side*.055,b+.85+rand()*.1,z+.045*(rand()-.5))
      beam(group,V(x,b-.37,z),top,.084,.068,log);posts.push(top)
      for(let k=0;k<4;k++){
        const loop=put(group,new T.TorusGeometry(.088,.013,5,10),rope,top.x,top.y-.15-k*.023,top.z)
        loop.rotation.x=Math.PI/2+.095
      }
    }
    for(let j=0;j<2;j++){
      const a=posts[j].clone(),b=posts[j+1].clone();a.y-=.17;b.y-=.17
      if(side===-1){const mid=a.clone().lerp(b,.5);mid.y-=.17;const curve=new T.QuadraticBezierCurve3(a,mid,b)
        put(group,new T.TubeGeometry(curve,16,.029,6,false),rope,0,0,0)
      }else beam(group,a,b,.056,.045,log)
    }
  }
  // Canvas fly and dark inner tent are open at the near gable.
  const tent=new T.Group(),cloth=new T.MeshStandardMaterial({color:0x9e8a61,side:T.DoubleSide,roughness:1,flatShading:true})
  const inner=new T.MeshLambertMaterial({color:0x464334,side:T.DoubleSide})
  tent.position.set(-6.4,ground(-6.4,-9)-.14,-9);tent.rotation.y=.29
  fabric(tent,[[-1.62,.15,1.5],[0,1.87,1.5],[-1.49,.04,0],[0,1.73,0],[-1.61,.15,-1.5],[0,1.85,-1.5],[1.56,.16,1.5],[1.49,.04,0],[1.57,.14,-1.5]],cloth,[0,1,2,2,1,3,2,3,4,4,3,5,1,6,3,3,6,7,3,7,5,5,7,8])
  fabric(tent,[[-1.35,.06,-1.31],[1.35,.06,-1.31],[0,1.65,-1.31],[-1.35,.06,1.25],[-.55,.07,1.13],[0,1.67,1.25],[.91,.06,1.22],[1.35,.06,1.25]],inner,[0,1,2,3,4,5,5,6,7])
  for(const z of [-1.5,1.5]){
    beam(tent,V(.02,0,z),V(0,1.91,z),.039,.027,log)
    beam(tent,V(0,1.83,z),V(.1,.01,z*1.68),.011,.011,rope,5)
  }group.add(tent);obstacles.push({x:-6.4,z:-9,r:1.6})
  const fireX=-4.35,fireZ=-6.95
  for(let i=0;i<12;i++){
    const a=i*.524,x=fireX+Math.cos(a)*.52,z=fireZ+Math.sin(a)*.43
    const m=put(group,new T.DodecahedronGeometry(.15+rand()*.08),iron,x,ground(x,z)+.045,z);m.scale.y=.68
  }
  for(let i=0;i<3;i++)beam(group,V(-8.45,ground(-8.45,-6.4)+.16+i*.075,-6.4+i*.19),V(-6.1,ground(-6.1,-6.4)+.16+i*.075,-6.25+i*.19),.16,.13,log)
  // A gabled silhouette sits beyond the playable bank.
  const cabin=new T.Group(),timber=new T.MeshLambertMaterial({color:0x554c3c}),roof=new T.MeshLambertMaterial({color:0x453e32,side:T.DoubleSide})
  cabin.position.set(8.0,ground(8,-27)-.80,-27);cabin.rotation.y=-.59
  put(cabin,new T.BoxGeometry(4.3,2.7,3.7),timber,0,1.33,0)
  for(const z of [-1.85,1.85])fabric(cabin,[[-2.15,2.65,z],[0,4.45,z],[2.15,2.65,z]],timber,[0,1,2,2,1,0])
  for(const side of [-1,1])fabric(cabin,[[0,4.53,-2.18],[0,4.53,2.18],[2.55*side,2.45,-2.18],[2.55*side,2.45,2.18]],roof,[0,1,2,2,1,3])
  put(cabin,new T.BoxGeometry(.48,1.45,.57),timber,-1.02,4,-.76);group.add(cabin)
  group.updateMatrixWorld(true)
  const batches=new Map<T.Material,T.BufferGeometry[]>()
  group.traverse(obj=>{
    if(!(obj instanceof T.Mesh))return
    const geo=obj.geometry.index?obj.geometry.toNonIndexed():obj.geometry.clone()
    geo.applyMatrix4(obj.matrixWorld)
    if(!geo.attributes.uv)geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2))
    if(!batches.has(obj.material))batches.set(obj.material,[])
    batches.get(obj.material)!.push(geo);obj.geometry.dispose()
  })
  for(const [mat,geos] of batches){const mesh=new T.Mesh(mergeGeometries(geos),mat);mesh.receiveShadow=mesh.castShadow=true;scene.add(mesh);geos.forEach(g=>g.dispose())}
}

