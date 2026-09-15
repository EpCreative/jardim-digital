import * as THREE from '../vendor/three.module.js';

// All scenery is original procedural geometry. Repeated botanical detail is instanced.
export function createGarden(scene) {
  const root = new THREE.Group();
  root.name = 'Jardim — jardim botânico';
  scene.add(root);
  let seed = 73192;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const between = (a, b) => a + rand() * (b - a);
  const colliders = [];
  const animated = [];
  const eveningLights = [];
  const batches = [];
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const mat = (c, props = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...props });
  const green = mat('#647644');
  const grassMat = mat('#ffffff', { side: THREE.DoubleSide, roughness: 1 });
  const leavesMat = mat('#ffffff', { side: THREE.DoubleSide, roughness: 1 });
  const barkMat = mat('#77614b');
  const stoneMat = mat('#d7ceaf');
  const lightStone = mat('#e8dfc4');
  const gravelMat = mat('#d1c7a9');
  const earthMat = mat('#655b3e');
  const woodMat = mat('#a08058');
  const metalMat = mat('#4d5747', { metalness: 0.4, roughness: 0.6 });
  const petalMat = mat('#ffffff', { side: THREE.DoubleSide, roughness: 0.7 });
  const flowerCenterMat = mat('#c3a042');
  const waterMat = mat('#5caaaa', { transparent: true, opacity: 0.78, metalness: 0.28, roughness: 0.2 });
  const foamMat = mat('#d1e8de', { transparent: true, opacity: 0.53, roughness: 0.3 });
  const glassMat = mat('#fff0ba', { emissive: '#ffd896', emissiveIntensity: 0.13, roughness: 0.3 });

  function mesh(geo, material, pos = [0, 0, 0], scale, parent = root) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...pos);
    if (scale) m.scale.set(...scale);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  }
  function box(w, h, d, material, x, y, z, parent) {
    return mesh(new THREE.BoxGeometry(w, h, d), material, [x, y, z], undefined, parent);
  }
  function cylinder(rt, rb, h, material, x, y, z, sides = 24, parent) {
    return mesh(new THREE.CylinderGeometry(rt, rb, h, sides), material, [x, y, z], undefined, parent);
  }
  function batch(geo, material, shadow = false) {
    const b = { geo, material, entries: [], shadow };
    batches.push(b); return b;
  }
  function add(b, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0, c = null) {
    dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(rx, ry, rz); dummy.updateMatrix();
    b.entries.push([dummy.matrix.clone(), c]);
  }
  function finalize() {
    for (const b of batches) {
      if (!b.entries.length) continue;
      const m = new THREE.InstancedMesh(b.geo, b.material, b.entries.length);
      b.entries.forEach(([matrix, c], i) => { m.setMatrixAt(i, matrix); if (c) m.setColorAt(i, color.set(c)); });
      m.castShadow = b.shadow; m.receiveShadow = true;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere(); root.add(m);
    }
  }
  function branch(a, b, radius, topRadius = radius * 0.6, material = barkMat) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b);
    const direction = bv.clone().sub(av);
    const m = mesh(new THREE.CylinderGeometry(topRadius, radius, direction.length(), 7), material);
    m.position.copy(av.add(bv).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return m;
  }
  function terrainTexture() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#82925a'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 11000; i++) {
      ctx.fillStyle = ['#73824a', '#8c9b5b', '#7e8e51', '#a0a76b', '#6b7f46'][i % 5];
      ctx.globalAlpha = 0.1 + rand() * 0.3;
      ctx.fillRect(rand() * 512, rand() * 512, 1 + rand() * 4, 1 + rand() * 5);
    }
    ctx.globalAlpha = 1;
    const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 20); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const terrainMat = mat('#ffffff', { map: terrainTexture() });
  const ground = mesh(new THREE.PlaneGeometry(170, 170), terrainMat, [0, -0.035, 0]);
  ground.rotation.x = -Math.PI / 2; ground.castShadow = false;

  // A gently curved network of gravel walks, with low limestone edging.
  const pathSamples = [];
  const pathStones = batch(new THREE.IcosahedronGeometry(1, 1), stoneMat, true);
  const tinyGravel = batch(new THREE.IcosahedronGeometry(1, 0), gravelMat);
  function path(points, width) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], 0.025, p[1])));
    const positions = [], normals = [], uvs = [], indices = [];
    const count = 110;
    for (let i = 0; i <= count; i++) {
      const t = i / count, p = curve.getPoint(t), dir = curve.getTangent(t);
      const normal = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      const wobble = Math.sin(t * 27) * 0.045;
      for (const sign of [-1, 1]) {
        positions.push(p.x + normal.x * sign * (width / 2 + wobble), p.y, p.z + normal.z * sign * (width / 2 + wobble));
        normals.push(0, 1, 0); uvs.push((sign + 1) / 2, t * 12);
      }
      pathSamples.push({ x: p.x, z: p.z, r: width / 2 + 0.22 });
      if (i < count) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
      if (i % 2 === 0) for (const sign of [-1, 1]) {
        add(pathStones, p.x + normal.x * sign * (width / 2 + 0.05), 0.05, p.z + normal.z * sign * (width / 2 + 0.05), between(.11,.18), .065, between(.14,.23), 0, rand()*6, 0);
      }
      for (let j = 0; j < 4; j++) {
        const d = between(-width / 2 + 0.12, width / 2 - 0.12);
        add(tinyGravel, p.x + normal.x * d + between(-.12,.12), .037, p.z + normal.z*d + between(-.12,.12), .018, .012, .027, 0, rand()*6, 0);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices);
    const m = mesh(geo, gravelMat); m.castShadow = false;
    return curve;
  }
  path([[0,19], [.3,14], [1.5,10], [1.4,6], [0,2.6]], 2.25);
  path([[-2.5,1], [-5,2], [-8,3], [-10,1], [-11,-3], [-8.5,-8.9], [-3,-10], [2,-8.5], [5,-5.4], [7,-2.2], [4.4,.3], [2.6,0]], 1.5);
  path([[1.4,6.3], [4.4,5.8], [7,4], [8.5,.5], [8.4,-3.4]], 1.45);
  path([[-1.5,2.4], [-2.6,5.2], [-5,6.8], [-8,6.1], [-8.8,3.7]], 1.25);
  const plaza = cylinder(3, 3, .045, gravelMat, 0, .015, 0, 96);
  plaza.castShadow = false;
  for (let i=0;i<100;i++) {
    const a=i/100*Math.PI*2;
    add(pathStones,Math.cos(a)*3,.055,Math.sin(a)*3,.12,.06,.18,0,-a,0);
  }

  // Centerpiece: carved limestone fountain, two tiers and moving jets.
  cylinder(1.86,1.96,.17,stoneMat,0,.105,0,80);
  cylinder(1.77,1.86,.16,lightStone,0,.26,0,80);
  const basinProfile = [[1.55,.31],[1.69,.34],[1.76,.48],[1.76,.7],[1.70,.77],[1.57,.77],[1.54,.69],[1.56,.52],[1.46,.41]];
  const basin = mesh(new THREE.LatheGeometry(basinProfile.map(p=>new THREE.Vector2(...p)),96), lightStone);
  const basinWater = cylinder(1.56,1.56,.016,waterMat,0,.635,0,80); basinWater.castShadow=false;
  cylinder(.3,.47,.16,stoneMat,0,.43,0,32);
  cylinder(.19,.29,.74,lightStone,0,.88,0,32);
  const upperProfile = [[0,1.21],[.28,1.21],[.48,1.3],[.7,1.52],[.73,1.58],[.69,1.65],[.60,1.62],[.4,1.4],[.1,1.35]];
  mesh(new THREE.LatheGeometry(upperProfile.map(p=>new THREE.Vector2(...p)),64),lightStone);
  cylinder(.62,.62,.02,waterMat,0,1.57,0,64).castShadow=false;
  cylinder(.08,.13,.4,lightStone,0,1.69,0,24);
  mesh(new THREE.SphereGeometry(.12,18,12),lightStone,[0,1.89,0]);
  const jetMat = mat('#d7f6e6', {transparent:true,opacity:.55,metalness:.05,roughness:.15});
  const fountainStreams=[];
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    const pts=[];
    for(let j=0;j<=30;j++) { const t=j/30; const r=.12+t*1.14; pts.push(new THREE.Vector3(Math.cos(a)*r,1.85+Math.sin(t*Math.PI)*.35-t*1.2,Math.sin(a)*r)); }
    const m=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),32,.012,5,false),jetMat);m.castShadow=false;fountainStreams.push(m);
  }
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    const ring=mesh(new THREE.RingGeometry(.03,.055,32),foamMat,[Math.cos(a)*1.25,.652,Math.sin(a)*1.25]);
    ring.rotation.x=-Math.PI/2;ring.castShadow=false; animated.push({type:'ripple',mesh:ring,phase:i/8});
  }
  const stream=mesh(new THREE.CylinderGeometry(.018,.035,.68,12),jetMat,[0,2.15,0]);stream.castShadow=false;
  const topDrop=mesh(new THREE.SphereGeometry(.04,8,6),jetMat,[0,2.49,0]);topDrop.castShadow=false;
  colliders.push({x:0,z:0,r:1.97});

  // Still water garden: irregular shore, reeds, water lilies and half-submerged rocks.
  const pondX=-7.5,pondZ=-5.75;
  const pondPoints=[];
  for(let i=0;i<80;i++) {const a=i/80*Math.PI*2,r=1+.055*Math.sin(a*5)+.025*Math.cos(a*9);pondPoints.push(new THREE.Vector2(pondX+Math.cos(a)*2.6*r,pondZ+Math.sin(a)*1.9*r));}
  const pondShape=new THREE.Shape();pondShape.moveTo(pondPoints[0].x,-pondPoints[0].y);for(let i=1;i<pondPoints.length;i++)pondShape.lineTo(pondPoints[i].x,-pondPoints[i].y);pondShape.closePath();
  const pond=mesh(new THREE.ShapeGeometry(pondShape),waterMat,[0,.035,0]);pond.rotation.x=-Math.PI/2;pond.castShadow=false;
  const pondRocks=batch(new THREE.DodecahedronGeometry(1,1),stoneMat,true);
  for(let i=0;i<75;i++) {const a=i/75*Math.PI*2,r=1+.055*Math.sin(a*5)+.025*Math.cos(a*9);add(pondRocks,pondX+Math.cos(a)*2.65*r,between(.07,.2),pondZ+Math.sin(a)*1.96*r,between(.18,.38),between(.12,.26),between(.18,.33),rand(),rand()*6,rand(),['#aca98d','#c1baa0','#969c83'][i%3]);}
  const lilyPadMat=mat('#667d47',{side:THREE.DoubleSide});
  const lilyShape=new THREE.Shape();lilyShape.moveTo(0,0);lilyShape.absarc(0,0,1,.14,Math.PI*2-.14,false);lilyShape.lineTo(0,0);
  const lilyGeometry=new THREE.ShapeGeometry(lilyShape);
  for(let i=0;i<18;i++) {
    const a=rand()*Math.PI*2,r=Math.sqrt(rand());const x=pondX+Math.cos(a)*r*2,z=pondZ+Math.sin(a)*r*1.25;
    const pad=mesh(lilyGeometry,lilyPadMat,[x,.063,z],[between(.13,.26),between(.13,.26),1]);pad.rotation.set(-Math.PI/2,0,rand()*6);pad.castShadow=false;
    if(i%4===0) {
      const flower=new THREE.Group();flower.position.set(x,.075,z);root.add(flower);
      for(let j=0;j<9;j++) {const p=mesh(new THREE.SphereGeometry(1,7,5),mat('#edd6cd'),[Math.cos(j/9*6.283)*.07,.045,Math.sin(j/9*6.283)*.07],[.04,.045,.12],flower);p.rotation.y=-j/9*6.283;p.castShadow=false;}
      cylinder(.027,.03,.05,flowerCenterMat,x,.13,z,10);
    }
  }
  colliders.push({x:pondX,z:pondZ,r:2.3});

  // Botanical detail uses low-poly curved leaves, assembled in instanced clusters.
  const leafShape=new THREE.Shape();leafShape.moveTo(0,0);leafShape.quadraticCurveTo(.5,.4,0,1);leafShape.quadraticCurveTo(-.5,.4,0,0);
  const leafGeo=new THREE.ShapeGeometry(leafShape);
  const leafBatch=batch(leafGeo,leavesMat,true);
  const shrubBatch=batch(new THREE.IcosahedronGeometry(1,1),leavesMat,true);
  const stemBatch=batch(new THREE.CylinderGeometry(.006,.01,1,4),green);
  const flowerPetals=batch(new THREE.SphereGeometry(1,5,4),petalMat,false);
  const flowerCenters=batch(new THREE.SphereGeometry(1,6,4),flowerCenterMat,false);
  const lavenderBatch=batch(new THREE.IcosahedronGeometry(1,0),petalMat,false);
  const grassPositions=[-.055,0,0,.012,0,.02,.065,.52,-.015, .01,0,-.035,.055,0,0,-.035,.38,.065, -.025,0,.03,.025,0,-.04,-.07,.44,-.01];
  const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute(grassPositions,3));grassGeo.computeVertexNormals();
  const grass=batch(grassGeo,grassMat,false);
  const reed=batch(new THREE.CylinderGeometry(.008,.013,1,4),green);
  const reedTip=batch(new THREE.CapsuleGeometry(.04,.18,2,5),mat('#6e5b3b'));

  function clearOfWalk(x,z,pad=0) {
    if(Math.hypot(x,z)<3.2+pad)return false;
    if(((x-pondX)/2.95)**2+((z-pondZ)/2.25)**2<1)return false;
    if(x>4.8&&x<10.4&&z>-7.7&&z<-2.7)return false;
    for(const p of pathSamples)if((x-p.x)**2+(z-p.z)**2<(p.r+pad)**2)return false;
    return true;
  }
  function grassTuft(x,z,s=1) {add(grass,x,.01,z,between(.7,1.3)*s,between(.35,.85)*s,s,0,rand()*6.28,0,['#87974f','#b0b173','#788c47','#a0a665','#718044'][Math.floor(rand()*5)]);}
  for(let i=0;i<15000;i++) {const x=between(-23,23),z=between(-24,22);if(clearOfWalk(x,z,.08))grassTuft(x,z,between(.55,1.3));}
  function bush(x,z,r=1,h=.75,foliageColor='#88915c') {
    for(let i=0;i<90*r;i++) {
      const a=rand()*6.283,u=rand(),rr=Math.sqrt(u)*r;
      const xx=x+Math.cos(a)*rr,zz=z+Math.sin(a)*rr,yy=.12+h*Math.sqrt(1-u)*between(.65,1.08);
      add(shrubBatch,xx,yy,zz,between(.085,.17),between(.055,.11),between(.1,.19),rand(),rand()*6,rand(),foliageColor);
      for(let j=0;j<2;j++)add(leafBatch,xx,yy,zz,between(.09,.17),between(.14,.24),1,-Math.PI/2+between(-.7,.7),rand()*6,rand()*6,foliageColor);
    }
  }
  function lavender(x,z,h=.65,c='#9280ae') {
    const count=4+Math.floor(rand()*4);
    for(let i=0;i<count;i++) {
      const a=rand()*6.283,spread=rand()*.17,xx=x+Math.cos(a)*spread,zz=z+Math.sin(a)*spread,hh=h*between(.7,1.2);
      add(stemBatch,xx,hh/2,zz,1,hh,1,between(-.15,.15),0,between(-.15,.15));
      for(let j=0;j<5;j++)add(lavenderBatch,xx+between(-.025,.025),hh-.15+j*.035,zz+between(-.025,.025),.035,.047,.035,0,rand()*6,0,c);
      for(let j=0;j<2;j++)add(leafBatch,xx,.1+hh*.3*j,zz,.045,.17,1,-.65,rand()*6,rand()*3,'#76866a');
    }
  }
  function daisy(x,z,h=.55,c='#f5edd5') {
    add(stemBatch,x,h/2,z,.75,h,.75);
    const angle=rand()*6.28;
    for(let j=0;j<7;j++) {const a=angle+j/7*6.283;add(flowerPetals,x+Math.cos(a)*.059,h,z+Math.sin(a)*.059,.044,.018,.091,.13,-a+Math.PI/2,0,c);}
    add(flowerCenters,x,h+.015,z,.035,.025,.035);
    for(let j=0;j<2;j++)add(leafBatch,x,h*(.3+j*.22),z,.07,.21,1,-1,angle+j*3,0,'#7e9252');
  }
  function flowerBed(x,z,rx,rz,type,count) {
    const bed=mesh(new THREE.CircleGeometry(1,64),earthMat,[x,.008,z],[rx,rz,1]);bed.rotation.x=-Math.PI/2;bed.castShadow=false;
    for(let i=0;i<count;i++) {
      const a=rand()*6.283,r=Math.sqrt(rand()),xx=x+Math.cos(a)*r*rx,zz=z+Math.sin(a)*r*rz;
      if(!clearOfWalk(xx,zz,-.2))continue;
      if(type==='lavender')lavender(xx,zz,between(.45,.78),['#998bb3','#b7a0c5','#8174a1'][i%3]);
      else daisy(xx,zz,between(.32,.88),type==='gold'?['#deb94e','#e1c874','#e9d38c'][i%3]:['#efe9d4','#f7f0e1','#ddd3b5'][i%3]);
      if(i%2===0)grassTuft(xx,zz,1.3);
    }
    for(let i=0;i<rx*rz*22;i++) {
      const a=rand()*6.283,r=Math.sqrt(rand());const xx=x+Math.cos(a)*r*rx,zz=z+Math.sin(a)*r*rz;
      if(clearOfWalk(xx,zz,-.3))add(shrubBatch,xx,.12,zz,.15,.14,.18,0,rand()*6,0,'#697e4e');
    }
  }
  flowerBed(-5.35,4.35,1.8,1.25,'lavender',155);
  flowerBed(-7.65,4.55,.85,1.1,'white',62);
  flowerBed(-4.5,7.9,2.4,.68,'white',100);
  flowerBed(-2.75,-3.65,1.3,1.05,'gold',85);
  flowerBed(4.2,2.5,1.35,1.75,'white',130);
  flowerBed(6.1,6.4,1.45,.75,'lavender',93);
  flowerBed(-11.85,-.2,.75,2.3,'lavender',118);
  flowerBed(2.4,-6,1.2,1,'lavender',87);
  flowerBed(10.5,2.1,.85,2.6,'gold',96);
  flowerBed(-2.2,12.1,.8,2.2,'white',91);
  flowerBed(4.5,11.4,1.4,2.2,'lavender',130);
  flowerBed(-9.9,8.9,1.7,1.2,'gold',89);
  for(let i=0;i<80;i++) {const a=between(2.4,5.6),r=between(1.01,1.15),x=pondX+Math.cos(a)*2.6*r,z=pondZ+Math.sin(a)*1.95*r,h=between(.5,1.4);add(reed,x,h/2,z,1,h,1,between(-.1,.1),rand()*6,between(-.2,.2));if(i%3===0)add(reedTip,x,h,z,1,1,1);for(let j=0;j<2;j++)add(leafBatch,x,h*.25,z,.05,.55,1,-.25,rand()*6,between(-.4,.4),'#718358');}
  bush(-4.7,-6.2,.9,.7,'#819267');bush(-10.6,-6.2,.6,.55,'#8d9769');bush(3,-3.65,.8,.55,'#a0a76f');
  bush(10.55,-4.5,.8,.65,'#899858');bush(-5,9.7,1.1,.65,'#82935b');bush(-12,6.8,1.1,1.05,'#82915c');

  // Olive and deciduous trees, with articulated boughs and thousands of individual leaves.
  function tree(x,z,height=6,radius=2.4,type='olive',distant=false) {
    const trunkHeight=height*.47;
    const trunkTop=[x+between(-.24,.24),trunkHeight,z+between(-.24,.24)];
    branch([x,0,z],trunkTop,height*.037,height*.021);
    if(!distant)colliders.push({x,z,r:height*.06+.1});
    const crowns=[];
    for(let k=0;k<6;k++) {
      const a=k/6*Math.PI*2+between(-.35,.35),reach=radius*between(.48,.82);
      const end=[x+Math.cos(a)*reach,height*between(.64,.85),z+Math.sin(a)*reach];
      branch([trunkTop[0],trunkHeight*.75,trunkTop[2]],end,height*.016,height*.005);
      crowns.push({x:end[0],y:end[1],z:end[2],r:radius*between(.44,.65)});
      if(!distant)for(let q=0;q<2;q++) {
        const a2=a+between(-.8,.8); const ee=[end[0]+Math.cos(a2)*radius*.28,end[1]+radius*.35,end[2]+Math.sin(a2)*radius*.28];
        branch(end,ee,height*.005,height*.0018); crowns.push({x:ee[0],y:ee[1],z:ee[2],r:radius*.38});
      }
    }
    crowns.push({x,y:height*.85,z,r:radius*.62});
    const palette=type==='olive'?['#82906a','#71835d','#99a180','#a5ab81','#6d8056']:['#8a9958','#798b48','#a0ab6b','#657e42','#b2b976'];
    for(const crown of crowns) {
      const pieces=distant?35:65;
      for(let i=0;i<pieces;i++) {
        const a=rand()*Math.PI*2,v=between(-1,1),r=Math.cbrt(rand())*crown.r,s=Math.sqrt(1-v*v);
        const xx=crown.x+Math.cos(a)*s*r,yy=crown.y+v*r*.68,zz=crown.z+Math.sin(a)*s*r;
        const lc=palette[Math.floor(rand()*palette.length)];
        add(shrubBatch,xx,yy,zz,between(.12,.23),between(.055,.13),between(.12,.22),rand(),rand()*6,rand(),lc);
        if(!distant) for(let n=0;n<3;n++)add(leafBatch,xx+between(-.1,.1),yy+between(-.06,.06),zz+between(-.1,.1),type==='olive'?.055:.12,between(.17,.28),1,between(-2.4,-.7),rand()*6,rand()*6,lc);
      }
    }
    for(let i=0;i<20;i++)grassTuft(x+between(-.55,.55),z+between(-.55,.55),1.3);
  }
  tree(-10.8,10.8,7,2.7,'deciduous');
  tree(11.5,8.5,8,3.4,'olive');
  tree(-14,1.2,7.5,2.6,'olive');
  tree(-11.8,-10.1,6.9,2.4,'deciduous');
  tree(-3.8,-12.7,8,3.3,'olive');
  tree(5,-11.9,7.5,2.8,'deciduous');
  tree(12,-8.6,8,3.1,'olive');
  tree(15.8,.8,7.6,3.1,'deciduous');
  tree(-14.5,15,7.6,3.1,'deciduous');
  tree(15.8,18.4,6.5,2.8,'olive');

  function cypress(x,z,h=7) {
    branch([x,0,z],[x,h*.8,z],.16,.06);
    for(let i=0;i<220;i++) {
      const t=rand(),a=rand()*6.28;const rad=Math.sin(t*Math.PI)*.6+.12;
      add(shrubBatch,x+Math.cos(a)*rad*rand(),.6+t*h,z+Math.sin(a)*rad*rand(),between(.15,.24),between(.2,.4),between(.15,.24),rand(),rand()*6,rand(),['#536946','#617950','#728355'][i%3]);
    }
    colliders.push({x,z,r:.48});
  }
  cypress(-15,-7.5,7);cypress(-16,-4.5,8);cypress(10,-12,8.4);cypress(13,-12.8,7.5);cypress(14,5,8);

  // A timber pergola, woven shade canopy, climbing rose vines and a slatted bench.
  const pergolaX=7.4,pergolaZ=-5.2;
  const deck=box(5.3,.13,4.5,stoneMat,pergolaX,.055,pergolaZ);
  for(let i=0;i<10;i++)box(.025,.008,4.42,gravelMat,pergolaX-2.35+i*.52,.126,pergolaZ);
  for(const dx of [-2.25,2.25])for(const dz of [-1.7,1.7]) {
    box(.22,2.8,.22,woodMat,pergolaX+dx,1.5,pergolaZ+dz);
    box(.31,.11,.31,stoneMat,pergolaX+dx,.19,pergolaZ+dz);
    colliders.push({x:pergolaX+dx,z:pergolaZ+dz,r:.23});
    branch([pergolaX+dx,2.12,pergolaZ+dz],[pergolaX+dx-Math.sign(dx)*.62,2.72,pergolaZ+dz],.055,.055,woodMat);
  }
  for(const dz of [-1.7,1.7])box(5.3,.22,.17,woodMat,pergolaX,2.83,pergolaZ+dz);
  for(let i=0;i<9;i++)box(.105,.18,4.3,woodMat,pergolaX-2.38+i*.595,3.02,pergolaZ);
  for(let i=0;i<17;i++)box(5.2,.045,.055,woodMat,pergolaX,3.13,pergolaZ-2+i*.25);
  // Bench facing the fountain and entrance, slightly angled toward the garden.
  const bench=new THREE.Group();bench.position.set(pergolaX,.15,pergolaZ-.95);root.add(bench);
  for(const dx of [-1.2,1.2]) {
    box(.09,.55,.65,metalMat,dx,.275,0,bench);
    box(.075,1.06,.075,metalMat,dx,.69,-.31,bench);
    box(.085,.28,.08,metalMat,dx,.74,.2,bench);
    box(.12,.055,.68,woodMat,dx,.895,.02,bench);
  }
  for(let i=0;i<6;i++)box(2.9,.065,.085,woodMat,0,.57,-.23+i*.095,bench);
  for(let i=0;i<4;i++)box(2.9,.12,.06,woodMat,0,.82+i*.16,-.32,bench);
  colliders.push({minX:pergolaX-1.55,maxX:pergolaX+1.55,minZ:pergolaZ-1.4,maxZ:pergolaZ-.48});
  const potMat=mat('#b68a69');
  for(const dx of [-2,2]) {
    cylinder(.32,.23,.49,potMat,pergolaX+dx,.39,pergolaZ-.85,24);
    cylinder(.355,.35,.085,potMat,pergolaX+dx,.65,pergolaZ-.85,24);
    bush(pergolaX+dx,pergolaZ-.85,.37,.95,'#829758');
  }
  for(let k=0;k<3;k++) {
    const x=pergolaX+[-2.25,2.25,2.25][k],z=pergolaZ+[-1.7,1.7,-1.7][k];
    for(let i=0;i<75;i++) {
      const y=between(.2,3.2),a=y*7;
      add(leafBatch,x+Math.cos(a)*.2,y,z+Math.sin(a)*.2,.14,.24,1,between(-2,-.7),rand()*6,rand()*6,'#7c9057');
      if(i%6===0)add(flowerPetals,x+Math.cos(a)*.23,y,z+Math.sin(a)*.23,.09,.08,.09,0,rand()*6,0,'#e8d4c3');
    }
  }
  for(let i=0;i<600;i++) {
    const x=pergolaX+between(-2.6,2.6),z=pergolaZ+between(-2,2);
    if(rand()<.25&&x<pergolaX)continue;
    add(leafBatch,x,3.17+between(-.04,.2),z,.17,.26,1,-Math.PI/2+between(-.4,.4),rand()*6,rand()*6,['#6f8551','#8d9a5f','#a6ae79'][i%3]);
    if(i%18===0)add(flowerPetals,x,3.25,z,.1,.045,.1,0,rand()*6,0,'#e6d2bf');
  }

  // Low dry-stone garden boundary and a small wrought-iron entrance.
  const wallBlocks=batch(new THREE.BoxGeometry(1,1,1),stoneMat,true);
  for(let row=0;row<3;row++)for(let i=0;i<34;i++) {
    const x=-16.7+i+((row%2)*.5);
    add(wallBlocks,x,.2+row*.27,-15.2,between(.89,.98),.245,.62,0,between(-.012,.012),0,['#c4bda2','#d0c7ae','#b9b496'][i%3]);
  }
  box(35,.09,.72,lightStone,0,.96,-15.2);
  colliders.push({minX:-17.6,maxX:17.6,minZ:-15.6,maxZ:-14.8});
  for(let side of [-1,1]) {
    for(let row=0;row<2;row++)for(let i=0;i<19;i++)add(wallBlocks,side*17,.15+row*.27,-14.5+i*1.3,.55,.25,1.24,0,0,0,['#c7bfa4','#c0b99f'][i%2]);
    box(.67,.08,25,lightStone,side*17,.64,-2.5);
    colliders.push({minX:side*17-.35,maxX:side*17+.35,minZ:-15,maxZ:10});
  }
  for(const side of [-1,1]) {
    cylinder(.39,.43,.11,stoneMat,side*1.55,.1,16.1,16);
    box(.53,1.38,.53,stoneMat,side*1.55,.8,16.1);
    box(.64,.13,.64,lightStone,side*1.55,1.53,16.1);
    mesh(new THREE.SphereGeometry(.16,14,10),lightStone,[side*1.55,1.73,16.1]);
    colliders.push({x:side*1.55,z:16.1,r:.4});
    for(let i=0;i<9;i++) {
      const x=side*(1.85+i*.28);
      cylinder(.015,.015,1.05,metalMat,x,.59,16.1,5);
      mesh(new THREE.ConeGeometry(.037,.09,6),metalMat,[x,1.155,16.1]);
    }
    box(2.8,.038,.04,metalMat,side*3,.33,16.1);box(2.8,.038,.04,metalMat,side*3,.93,16.1);
  }
  function lantern(x,z) {
    cylinder(.12,.17,.12,stoneMat,x,.075,z,12);
    cylinder(.023,.034,.77,metalMat,x,.48,z,8);
    box(.19,.025,.19,metalMat,x,.88,z);
    const glow=box(.125,.19,.125,glassMat,x,.985,z);glow.castShadow=false;
    for(const dx of [-.076,.076])for(const dz of [-.076,.076])box(.014,.21,.014,metalMat,x+dx,.985,z+dz);
    mesh(new THREE.ConeGeometry(.16,.12,4),metalMat,[x,1.14,z]).rotation.y=Math.PI/4;
    const light=new THREE.PointLight('#ffd39a',0,4,2);light.position.set(x,1.05,z);root.add(light);eveningLights.push(light);
  }
  lantern(-1.4,10.5);lantern(3.2,7.8);lantern(-4.1,1.75);lantern(3.7,-1.5);lantern(-9.25,-.35);lantern(7,1.6);

  // A watering can and open gardening book bring a little human presence.
  const canMat=mat('#7a8c7b',{metalness:.4,roughness:.55});
  cylinder(.16,.18,.29,canMat,-7.3,.18,6.1,20);
  branch([-7.2,.25,6.1],[-6.85,.4,6.1],.026,.019,canMat);
  const canHandle=mesh(new THREE.TorusGeometry(.17,.018,6,20,Math.PI*1.65),canMat,[-7.38,.27,6.1]);canHandle.rotation.z=-.8;
  const book=box(.36,.035,.24,mat('#ccbc8d'),7.65,.75,-6.13);book.rotation.y=.2;
  box(.15,.05,.25,mat('#d9d6bb'),7.71,.775,-6.13).rotation.z=-.08;

  // Distant countryside, softened by the scene fog.
  const hillMat=mat('#8a9977');
  for(let i=0;i<14;i++) {
    const a=i/14*6.283;
    const hill=mesh(new THREE.SphereGeometry(1,32,14),hillMat,[Math.cos(a)*between(53,70),-2.6,Math.sin(a)*between(53,70)],[between(18,33),between(5,12),between(14,25)]);hill.castShadow=false;
  }
  for(let i=0;i<24;i++) {const a=i/24*Math.PI*2,dist=between(24,38);tree(Math.cos(a)*dist,Math.sin(a)*dist,between(5,9),between(2.1,3.4),i%2?'olive':'deciduous',true);}

  // Butterflies follow small figure-eight paths around the planting beds.
  const butterflyMat=mat('#efdca1',{side:THREE.DoubleSide,roughness:.7});
  for(let i=0;i<8;i++) {
    const group=new THREE.Group();const wingGeo=new THREE.SphereGeometry(1,8,5);
    const left=mesh(wingGeo,butterflyMat,[-.04,0,0],[.065,.006,.095],group);
    const right=mesh(wingGeo,butterflyMat,[.04,0,0],[.065,.006,.095],group);
    left.castShadow=right.castShadow=false;
    root.add(group);animated.push({type:'butterfly',mesh:group,left,right,base:new THREE.Vector3(i<4?-5:4.5,1.2,i<4?4.8:3.5),phase:i*1.46});
  }
  finalize();
  let fountainOn=true,wateringUntil=0,lastTime=0;
  const wateringDrops=new THREE.InstancedMesh(new THREE.SphereGeometry(1,5,4),jetMat,90);
  wateringDrops.visible=false;wateringDrops.frustumCulled=false;root.add(wateringDrops);
  const dropPaths=Array.from({length:90},()=>({x:between(-1.6,1.6),z:between(-1,1),phase:rand()}));

  const landmarks = [
    { id:'fountain',title:'Fonte dos desejos',subtitle:'Uma pausa ao som da água',position:[0,1.9,0],viewPosition:[0.2,1.7,4.15],lookAt:[0,1.2,0]},
    { id:'flowers',title:'Jardim em flor',subtitle:'Lavandas, margaridas e luz dourada',position:[-5.5,1.1,4.4],viewPosition:[-4,1.7,6.9],lookAt:[-6,.6,4]},
    { id:'pergola',title:'Sombra & sossego',subtitle:'Encontre seu lugar sob as folhas',position:[7.4,1.75,-5.25],viewPosition:[7.4,1.7,-3.6],lookAt:[6.7,1.0,-6.1]},
    { id:'pond',title:'Lago sereno',subtitle:'Um pequeno mundo sobre a água',position:[-7.5,.7,-5.75],viewPosition:[-10.7,1.7,-4.1],lookAt:[-7.3,.3,-5.7]},
  ];
  return {
    colliders,landmarks,
    setFountain(value) {
      fountainOn=value;
      fountainStreams.forEach(m=>{m.visible=value;});stream.visible=topDrop.visible=value;
      animated.filter(a=>a.type==='ripple').forEach(a=>{a.mesh.visible=value;});
    },
    waterFlowers() {wateringUntil=lastTime+4.5;wateringDrops.visible=true;},
    setEvening(value) {
      eveningLights.forEach(l=>{l.intensity=value?3.2:0;});
      glassMat.emissiveIntensity=value?2.4:.13;
    },
    update(time,delta) {
      lastTime=time;
      if(wateringUntil>time) {
        dropPaths.forEach((p,i)=>{const t=(time*.65+p.phase)%1;dummy.position.set(-5.4+p.x*t,2.4-t*1.8,4.4+p.z*t);dummy.rotation.set(0,0,0);dummy.scale.set(.017,.046,.017);dummy.updateMatrix();wateringDrops.setMatrixAt(i,dummy.matrix);});
        wateringDrops.instanceMatrix.needsUpdate=true;
      } else wateringDrops.visible=false;
      waterMat.color.setHSL(.48+Math.sin(time*.2)*.007,.25,.49+Math.sin(time*.7)*.012);
      for(const a of animated) {
        if(a.type==='ripple') {const t=(time*.6+a.phase)%1;a.mesh.scale.setScalar(.25+t*3.5);a.mesh.material.opacity=.4;}
        else {const t=time*.45+a.phase;a.mesh.position.set(a.base.x+Math.sin(t)*1.35,a.base.y+Math.sin(t*2.3)*.27,a.base.z+Math.cos(t*.7)*1.1);a.mesh.rotation.y=Math.cos(t)*1.5;a.left.rotation.z=Math.sin(time*19+a.phase)*.8;a.right.rotation.z=-a.left.rotation.z;}
      }
      stream.scale.x=stream.scale.z=.85+Math.sin(time*7)*.15;
      topDrop.position.y=2.47+Math.sin(time*8)*.035;
    },
  };
}
