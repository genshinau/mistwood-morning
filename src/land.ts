import * as T from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { channel,ground,pathX,photo,clamp,smooth,generator,creek } from './world'
export function addLand(scene:T.Scene) {
  const geo=new T.PlaneGeometry(128,128,280,280);geo.rotateX(-Math.PI/2)
  const p=geo.attributes.position,uv=geo.attributes.uv, trail:number[]=[],colors:number[]=[]
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),bank=channel(x,z)
    p.setY(i,ground(x,z));uv.setXY(i,x*.38,z*.38)
    const jag=.13*Math.sin(x*9+z*4)+.2*Math.sin(z*2.3)
    const route=(1-smooth(.62,1.5,Math.abs(x-pathX(z))+jag))*(1-smooth(14,20,Math.abs(z)))
    const camp=(1-smooth(1.4,4,Math.hypot(x+6,z+9)))
    trail.push(Math.max(route,camp*.8,(1-smooth(1.8,3.15,bank))*.9))
    const moss=.5+.5*Math.sin(x*1.35+Math.sin(z))*Math.cos(z*.87)
    const dark=.72+.24*smooth(1.5,3.4,bank)
    colors.push(dark*(.77+.2*route),dark*(.8+.16*moss),dark*.66)
  }
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('trail',new T.Float32BufferAttribute(trail,1));geo.computeVertexNormals()
  const mud=photo('brown_mud'),mudN=photo('brown_mud','nor_gl')
  const mat=new T.MeshStandardMaterial({map:photo('forest_floor'),normalMap:photo('forest_floor','nor_gl'),normalScale:new T.Vector2(.64,.64),vertexColors:true,roughness:.92})
  mat.onBeforeCompile=s=>{
    s.uniforms.mud={value:mud};s.uniforms.mudN={value:mudN}
    s.vertexShader='attribute float trail; varying float vTrail;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTrail=trail;')
    s.fragmentShader='uniform sampler2D mud; uniform sampler2D mudN; varying float vTrail;\n'+s.fragmentShader
    s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`vec4 forest=texture2D(map,vMapUv);float blend=smoothstep(.03,.96,vTrail+(forest.g-.15)*.35);diffuseColor*=mix(forest,texture2D(mud,vMapUv*.91)*vec4(1.15,1.08,.94,1.),blend);`)
      .replace('#include <normal_fragment_maps>',T.ShaderChunk.normal_fragment_maps.replace('texture2D( normalMap, vNormalMapUv ).xyz','mix(texture2D(normalMap,vNormalMapUv).xyz,texture2D(mudN,vNormalMapUv*.91).xyz,blend)'))
  }
  const mesh=new T.Mesh(geo,mat);mesh.receiveShadow=true;scene.add(mesh)
}
export function addStream(scene:T.Scene) {
  const geo=new T.PlaneGeometry(112,6.3,220,6)
  const p=geo.attributes.position
  for(let i=0;i<p.count;i++)p.setY(i,p.getY(i)-creek(p.getX(i)))
  const uniforms={time:{value:0},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()},color:{value:new T.Color()}}
  const shader={name:'Stream',uniforms,vertexShader:`uniform mat4 textureMatrix;varying vec4 ref;varying vec3 wp;void main(){ref=textureMatrix*vec4(position,1.);wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
    uniform sampler2D tDiffuse; varying vec4 ref;uniform float time; varying vec3 wp;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
    void main(){
      vec2 p=wp.xz;float t=time*.42;
      float wave=sin(p.y*17.+p.x*3.-t*2.+3.*noise(p*1.9+t*.13))*.055+sin(p.y*42.-p.x*5.+t*2.)*.018;
      vec3 n=normalize(vec3(.05*sin(p.x*7.+p.y*9.-t)+.022*cos(p.x*31.-t),1.,wave));
      vec3 v=normalize(cameraPosition-wp),r=reflect(-v,n);
      vec2 reflectedUv=ref.xy/ref.w+n.xz*.032;
      vec3 reflection=texture2D(tDiffuse,clamp(reflectedUv,.001,.999)).rgb;
      float shore=abs(p.y-.19*p.x-1.05*sin(.34*p.x));
      float pebble=noise(p*12.)*.65+noise(p*48.)*.35;
      vec3 bed=mix(vec3(.039,.081,.065),vec3(.17,.19,.12)*(.5+pebble),smoothstep(.6,2.6,shore));
      float fres=.17+.79*pow(1.-max(dot(n,v),0.),3.);
      vec3 col=mix(bed,reflection,fres)+vec3(1.,.75,.37)*pow(max(dot(r,normalize(vec3(.48,.37,-.79))),0.),150.)*.85;
      col=mix(col,vec3(.48,.58,.54),1.-exp(-.00020*dot(cameraPosition-wp,cameraPosition-wp)));
      gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`}
  const stream=new Reflector(geo,{shader,textureWidth:640,textureHeight:400,multisample:0,clipBias:.002})
  stream.rotation.x=-Math.PI/2;stream.position.y=-.12;scene.add(stream)
  const reflect=stream.onBeforeRender,previous=new T.Matrix4(),projection=new T.Matrix4()
  stream.onBeforeRender=function(...args){
    const camera=args[2]
    if(!previous.equals(camera.matrixWorld)||!projection.equals(camera.projectionMatrix)){
      reflect.apply(this,args);previous.copy(camera.matrixWorld);projection.copy(camera.projectionMatrix)
    }
  }
  return(time:number)=>{(stream.material as T.ShaderMaterial).uniforms.time.value=time}
}
export function addStones(scene:T.Scene){
  const rand=generator(410),geo=new T.IcosahedronGeometry(1,1),p=geo.attributes.position
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=.93+.14*Math.sin(8*x+3*y)*Math.cos(z*6);p.setXYZ(i,x*a,y*a,z*a)}
  geo.computeVertexNormals()
  const mat=new T.MeshStandardMaterial({roughness:.88,flatShading:false})
  const amount=460,mesh=new T.InstancedMesh(geo,mat,amount),dummy=new T.Object3D()
  for(let i=0;i<amount;i++){
    const x=(rand()-.5)*70, z=creek(x)+(rand()-.5)*7.2, s=.025+Math.pow(rand(),3)*.17
    dummy.position.set(x,ground(x,z)+s*.09,z);dummy.scale.set(s*(1+rand()),s*(.4+rand()*.5),s);dummy.rotation.set(rand()*.28,rand()*6,rand()*.23);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)
    const light=clamp(.20+rand()*.22+(channel(x,z)>2.4?.05:0),0,1);mesh.setColorAt(i,new T.Color().setHSL(.16+rand()*.08,.09+rand()*.11,light,T.SRGBColorSpace))
  }mesh.receiveShadow=true;mesh.castShadow=true;scene.add(mesh)
}
