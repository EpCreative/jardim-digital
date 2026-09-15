import * as THREE from '../vendor/three.module.js';

// Project a matching side portrait onto the curved sides of the head. The front
// retains its independent portrait, with a soft overlap at the temples/cheeks.
export function createProfileSurface(head,headRings) {
  const group=new THREE.Group();group.name='Perfil personalizado';head.add(group);
  const resources={geometries:[],materials:[]};
  let currentTexture=null,request=0,disposed=false;
  const earOriginals=[];
  function makeMaterial(texture) {
    const material=new THREE.MeshStandardMaterial({color:'#ffffff',map:texture,roughness:1,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.2,transparent:true,side:THREE.DoubleSide,depthWrite:false});
    material.onBeforeCompile=shader=>{
      shader.vertexShader='attribute float profileFade; varying float vProfileFade;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvProfileFade=profileFade;');
      shader.fragmentShader='varying float vProfileFade;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.a*=vProfileFade;');
    };
    material.customProgramCacheKey=()=> 'avatar-side-profile-v1';resources.materials.push(material);return material;
  }
  function resetSurfaces() {
    group.clear();
    for(const {mesh,geometry,material} of earOriginals){mesh.geometry=geometry;mesh.material=material;}
    earOriginals.length=0;
    resources.geometries.forEach(g=>g.dispose());resources.materials.forEach(m=>m.dispose());
    resources.geometries.length=resources.materials.length=0;
  }
  async function setTexture(url,calibration={}) {
    const version=++request,texture=await new THREE.TextureLoader().loadAsync(url);
    if(disposed||version!==request){texture.dispose();return;}
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    resetSurfaces();currentTexture?.dispose();currentTexture=texture;
    // Calibrated against the generated profile's nose (.096,.621), ear
    // (.632,.549) and chin (.235,.899), using their model-space landmarks.
    const {centerU=.60,foreheadV=.261,scaleU=.252,scaleV=.368,foreheadY=.095}=calibration;
    const project=(y,z)=>[centerU-z/scaleU,1-foreheadV+(y-foreheadY)/scaleV];
    const segments=40,rows=48,material=makeMaterial(texture);
    for(const side of [-1,1]) {
      const vertices=[],uvs=[],fades=[],indices=[];
      for(let j=0;j<=rows;j++)for(let i=0;i<=segments;i++) {
        const v=j/rows,y=-.133+v*.231,theta=THREE.MathUtils.degToRad(53+i/segments*95);
        let lo=headRings[0],hi=headRings[1];
        for(let k=0;k<headRings.length-1;k++)if(y>=headRings[k][0]&&y<=headRings[k+1][0]){lo=headRings[k];hi=headRings[k+1];break;}
        const t=(y-lo[0])/(hi[0]-lo[0]),rx=THREE.MathUtils.lerp(lo[1],hi[1],t),rz=THREE.MathUtils.lerp(lo[2],hi[2],t),cz=THREE.MathUtils.lerp(lo[3]||0,hi[3]||0,t);
        const x=side*Math.sin(theta)*(rx+.0065),z=cz+Math.cos(theta)*(rz+.0065);
        vertices.push(x,y,z);uvs.push(...project(y,z));
        const edge=THREE.MathUtils.smoothstep(i/segments,0,.30)*(1-THREE.MathUtils.smoothstep(i/segments,.84,1));
        fades.push(edge*THREE.MathUtils.smoothstep(v,0,.045)*(1-THREE.MathUtils.smoothstep(v,.94,1)));
      }
      for(let j=0;j<rows;j++)for(let i=0;i<segments;i++) {
        const a=j*(segments+1)+i,b=a+1,c=a+segments+1,d=c+1;indices.push(a,b,c,b,d,c);
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('profileFade',new THREE.Float32BufferAttribute(fades,1));geometry.setIndex(indices);geometry.computeVertexNormals();resources.geometries.push(geometry);
      const mesh=new THREE.Mesh(geometry,material);mesh.name=side<0?'Perfil esquerdo':'Perfil direito';mesh.castShadow=mesh.receiveShadow=false;mesh.renderOrder=2;group.add(mesh);
    }
    // The ears retain their modelled depth while receiving the same side colours.
    head.updateMatrixWorld(true);
    const inverseHead=new THREE.Matrix4().copy(head.matrixWorld).invert(),p=new THREE.Vector3();
    for(const ear of head.children.filter(child=>child.name==='Orelha'))ear.traverse(mesh=>{
      if(!mesh.isMesh)return;
      earOriginals.push({mesh,geometry:mesh.geometry,material:mesh.material});
      const geometry=mesh.geometry.clone(),positions=geometry.getAttribute('position'),uvs=[],fades=[];
      const matrix=new THREE.Matrix4().multiplyMatrices(inverseHead,mesh.matrixWorld);
      for(let i=0;i<positions.count;i++){p.fromBufferAttribute(positions,i).applyMatrix4(matrix);uvs.push(...project(p.y,p.z));fades.push(1);}
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('profileFade',new THREE.Float32BufferAttribute(fades,1));resources.geometries.push(geometry);
      mesh.geometry=geometry;mesh.material=material;mesh.receiveShadow=false;
    });
  }
  return {setTexture,dispose(){disposed=true;request++;resetSurfaces();currentTexture?.dispose();head.remove(group);}};
}
