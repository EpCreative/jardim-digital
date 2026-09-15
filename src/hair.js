import * as THREE from '../vendor/three.module.js';

// A rounded hair volume with a portrait-projected front, keeping individual
// strands in the texture instead of turning them into oversized solid locks.
export function createAvatarHair(head) {
  const group=new THREE.Group();group.name='Cabelo personalizado';head.add(group);
  const geometries=[],materials=[];
  const baseMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,emissive:'#ffffff',emissiveIntensity:.22});
  const frontMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,emissive:'#ffffff',emissiveIntensity:.22,side:THREE.DoubleSide});
  materials.push(baseMaterial,frontMaterial);
  function add(geometry,material,shadow=true) {
    geometries.push(geometry);
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=shadow;mesh.receiveShadow=false;group.add(mesh);return mesh;
  }
  function surface(positions,uvs,indices) {
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
  }
  const positions=[],uvs=[],indices=[],columns=72,rows=28;
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++) {
    const angle=i/columns*Math.PI*2,forward=(Math.sin(angle)+1)/2;
    const bottom=-.06+Math.pow(forward,3)*.149;
    const edge=Math.acos(THREE.MathUtils.clamp((bottom-.073)/.153,-1,1));
    const theta=j/rows*edge,s=Math.sin(theta),c=Math.cos(theta);
    const depth=Math.sin(angle)>0?.071:.124;
    positions.push(Math.cos(angle)*s*.126,.073+c*.153,-.018+Math.sin(angle)*s*depth);
    // Sample a hair-only region of the reference for sides and back. Its strand
    // detail continues around the head instead of leaving a flat brown cap.
    uvs.push(.27+i/columns*.44,1-(.09+j/rows*.18));
  }
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++) {
    const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;indices.push(a,b,c,b,d,c);
  }
  add(surface(positions,uvs,indices),baseMaterial);

  // Outline follows only hair pixels in avatar-face.png. All portrait coordinates
  // share the face's constant scale, so the hairline and facial features agree.
  const outline=[
    [.18,.235,.374],[.21,.153,.425],[.245,.107,.456],[.30,.055,.395],
    [.36,.031,.36],[.42,.021,.352],[.49,.015,.374],[.56,.018,.385],
    [.63,.035,.364],[.70,.063,.384],[.76,.111,.454],[.80,.17,.428],[.82,.245,.366]
  ];
  function bounds(x) {
    for(let i=0;i<outline.length-1;i++)if(x>=outline[i][0]&&x<=outline[i+1][0]) {
      const a=outline[i],b=outline[i+1],t=(x-a[0])/(b[0]-a[0]);
      return [THREE.MathUtils.lerp(a[1],b[1],t),THREE.MathUtils.lerp(a[2],b[2],t)];
    }
    return [outline[0][1],outline[0][2]];
  }
  const frontPositions=[],frontUvs=[],frontIndices=[],width=90,height=40;
  for(let j=0;j<=height;j++)for(let i=0;i<=width;i++) {
    const imageX=.18+i/width*.64,[top,bottom]=bounds(imageX);
    const imageY=THREE.MathUtils.lerp(bottom,top,j/height);
    const x=(imageX-.5)*.392,y=.095+(.355-imageY)*.392;
    const dome=Math.sqrt(Math.max(.035,1-(x/.132)**2-((y-.078)/.169)**2));
    const z=.002+.133*dome;
    frontPositions.push(x,y,z);frontUvs.push(imageX,1-imageY);
  }
  for(let j=0;j<height;j++)for(let i=0;i<width;i++) {
    const a=j*(width+1)+i,b=a+1,c=a+width+1,d=c+1;frontIndices.push(a,b,c,b,d,c);
  }
  const front=add(surface(frontPositions,frontUvs,frontIndices),frontMaterial,false);
  front.visible=false;

  // Fine directional grooves add depth to the back and sides without large locks.
  const strandMaterial=new THREE.MeshStandardMaterial({color:'#987045',roughness:1});materials.push(strandMaterial);
  for(let i=0;i<30;i++) {
    const azimuth=Math.PI+(.1+i/29*.8)*Math.PI;
    const points=[];
    for(let k=0;k<8;k++) {
      const theta=.17+k/7*1.86,a=azimuth+Math.sin(k/7*Math.PI)*.12;
      points.push(new THREE.Vector3(Math.cos(a)*Math.sin(theta)*.127,.073+Math.cos(theta)*.154,-.018+Math.sin(a)*Math.sin(theta)*.125));
    }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.00055,3,false),strandMaterial,false);
  }
  return {
    setTexture(texture){
      for(const material of [frontMaterial,baseMaterial]){material.map=texture;material.emissiveMap=texture;material.needsUpdate=true;}
      front.visible=true;
    },
    dispose(){head.remove(group);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  };
}
