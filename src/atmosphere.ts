import * as T from 'three'
import { V } from './world'
export const lightDirection=V(.51,.40,-.83).normalize()
export function lightForest(scene:T.Scene) {
  scene.fog=new T.FogExp2(0xaabbb4,.023)
  const hemi=new T.HemisphereLight(0xd5e4ef,0x8c805f,1.54);scene.add(hemi)
  const sun=new T.DirectionalLight(0xffdf9e,3.45)
  sun.position.copy(lightDirection).multiplyScalar(47);sun.target.position.set(0,0,0);scene.add(sun,sun.target)
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048)
  Object.assign(sun.shadow.camera,{left:-27,right:27,top:26,bottom:-26,near:1,far:101})
  sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.035;sun.shadow.bias=-.00018
  const sky=new T.Mesh(new T.SphereGeometry(103,32,16), new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{sun:{value:lightDirection}},vertexShader:`varying vec3 d;void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec3 d;uniform vec3 sun;void main(){
  vec3 dir=normalize(d);float s=max(0.,dot(dir,sun));vec3 c=mix(vec3(.53,.64,.62),vec3(.25,.46,.60),smoothstep(.02,.82,dir.y));c+=vec3(.48,.34,.14)*pow(s,10.)+vec3(.8,.54,.22)*pow(s,125.)+vec3(2.6,2.1,1.2)*smoothstep(.9998,.99996,s);
  gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`}))
  sky.renderOrder=-1;scene.add(sky);return sun
}
// Integrate sunlight through the actual tree shadow map along each view ray.
// A quarter-size target keeps light shafts inexpensive as the player turns.
export function atmosphere(renderer:T.WebGLRenderer,scene:T.Scene,camera:T.PerspectiveCamera,sun:T.DirectionalLight){
  const world=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:true,samples:Math.min(4,renderer.capabilities.maxSamples)})
  world.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType)
  const air=new T.WebGLRenderTarget(1,1,{depthBuffer:false})
  const quadScene=new T.Scene(),quadCam=new T.OrthographicCamera(-1,1,1,-1,0,1)
  const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}'
  const density=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{depth:{value:world.depthTexture},shadowTex:{value:null},invProjection:{value:camera.projectionMatrixInverse},matrixWorldCamera:{value:camera.matrixWorld},lightMatrix:{value:sun.shadow.matrix},eye:{value:camera.position}},vertexShader:vertex,fragmentShader:`
    #include <packing>
    varying vec2 vUv; uniform sampler2D depth,shadowTex;uniform mat4 invProjection,matrixWorldCamera,lightMatrix;uniform vec3 eye;
    void main(){
      float d=texture2D(depth,vUv).x;vec4 v=invProjection*vec4(vUv*2.-1.,d*2.-1.,1.);vec3 w=(matrixWorldCamera*vec4(v.xyz/v.w,1.)).xyz;
      vec3 dir=normalize(w-eye);float len=min(length(w-eye),45.);
      float jitter=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));float sum=0.;
      for(int i=0;i<36;i++){float t=(float(i)+jitter)*len/36.;vec3 p=eye+dir*t;vec4 l=lightMatrix*vec4(p,1.);
        float lit=step(l.z-.00035,unpackRGBAToDepth(texture2D(shadowTex,l.xy)));
        lit*=step(0.,l.x)*step(l.x,1.)*step(0.,l.y)*step(l.y,1.);
        float low=exp(-max(p.y-.15,0.)*.63);float height=.25+.75*low;
        sum+=lit*height*exp(-t*.034)*len/36.;
      }
      gl_FragColor=vec4(vec3(clamp(sum*.046,0.,1.)),1.);
    }`})
  const output=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{frame:{value:world.texture},rays:{value:air.texture}},vertexShader:vertex,fragmentShader:`varying vec2 vUv;uniform sampler2D frame,rays;
  void main(){vec3 c=texture2D(frame,vUv).rgb;float shafts=texture2D(rays,vUv).r;
    c+=vec3(.80,.64,.36)*shafts*.73;
    gl_FragColor=vec4(c,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`})
  const quad=new T.Mesh(new T.PlaneGeometry(2,2),density);quad.frustumCulled=false;quadScene.add(quad)
  return {
    size(w:number,h:number){world.setSize(w,h);air.setSize(Math.max(1,Math.round(w*.32)),Math.max(1,Math.round(h*.32)))},
    draw(){renderer.setRenderTarget(world);renderer.render(scene,camera);density.uniforms.shadowTex.value=sun.shadow.map?.texture
      quad.material=density;renderer.setRenderTarget(air);renderer.render(quadScene,quadCam)
      quad.material=output;renderer.setRenderTarget(null);renderer.render(quadScene,quadCam)}
  }
}
