import * as THREE from '../vendor/three.module.js';

export function createRendering(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, .08, 230);
  const renderer = new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  scene.fog = new THREE.Fog('#d9dfc9', 33, 100);
  const hemi = new THREE.HemisphereLight('#f2f2d7','#68764d', 2.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1cf', 3.2);
  sun.position.set(-15,22,13); sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-27,right:27,top:27,bottom:-27,near:1,far:80});
  sun.shadow.normalBias = .045; sun.shadow.bias = -.0002; sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#b9d8ec', .5); fill.position.set(12,9,-16); scene.add(fill);
  const uniforms = {
    topColor:{value:new THREE.Color('#95bfce')},
    horizonColor:{value:new THREE.Color('#e5e4c7')},
    sunColor:{value:new THREE.Color('#fff0c9')},
    sunDirection:{value:sun.position.clone().normalize()}
  };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(180,32,16), new THREE.ShaderMaterial({
    uniforms, side:THREE.BackSide, depthWrite:false,
    vertexShader:'varying vec3 vDirection; void main(){vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec3 vDirection; uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 sunColor; uniform vec3 sunDirection; void main(){ vec3 d=normalize(vDirection); float h=pow(max(0.0,d.y),0.6); vec3 col=mix(horizonColor,topColor,h); float glow=pow(max(dot(d,sunDirection),0.0),12.0); col=mix(col,sunColor,glow*0.6); gl_FragColor=vec4(col,1.0); }'
  }));
  sky.renderOrder = -1; scene.add(sky);
  let evening = 0, goal = 0;
  const light = {day:new THREE.Color('#fff1cf'),night:new THREE.Color('#ffc394')};
  const skyColors = {topDay:new THREE.Color('#95bfce'),topNight:new THREE.Color('#828dba'),horizonDay:new THREE.Color('#e5e4c7'),horizonNight:new THREE.Color('#e8b899')};
  const fogDay = new THREE.Color('#d9dfc9'), fogNight = new THREE.Color('#c6ac9c');
  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.fov = innerWidth < 700 ? 57 : 46;
    camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
  }
  window.addEventListener('resize', resize); resize();
  return {scene,camera,renderer, setEvening(value){goal = value ? 1 : 0;},update(delta){
    evening = THREE.MathUtils.damp(evening,goal,2,delta);
    sun.color.copy(light.day).lerp(light.night,evening);
    sun.intensity = 3.2 - evening*1.5; hemi.intensity = 2.1-evening*.7;
    sun.position.y = 22 - evening*13;
    uniforms.topColor.value.copy(skyColors.topDay).lerp(skyColors.topNight,evening);
    uniforms.horizonColor.value.copy(skyColors.horizonDay).lerp(skyColors.horizonNight,evening);
    uniforms.sunDirection.value.copy(sun.position).normalize();
    scene.fog.color.copy(fogDay).lerp(fogNight,evening);
  }};
}
