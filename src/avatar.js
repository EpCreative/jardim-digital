import * as THREE from '../vendor/three.module.js';
import { createAvatarHair } from './hair.js?v=2';
import { createProfileSurface } from './profile.js?v=1';

/** An original, articulated likeness, modelled in metres. Local forward is +Z. */
export function createAvatar(scene) {
  const root = new THREE.Group();
  root.name = 'Seu personagem';
  const rig = new THREE.Group(); root.add(rig); scene.add(root);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const makeMaterial = (color, roughness = .86, more = {}) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness, ...more });
    materials.add(material); return material;
  };
  const skin = makeMaterial('#ca9478', .86);
  const skinWarm = makeMaterial('#bb7f68', .9);
  const earInner = makeMaterial('#ad7463', .94);
  const lip = makeMaterial('#9f655b', .88);
  const lipLine = makeMaterial('#6d4540', .94);
  const eyeWhite = makeMaterial('#cec9b8', .62);
  const iris = makeMaterial('#4e382b', .58);
  const pupil = makeMaterial('#191917', .6);
  const brow = makeMaterial('#40312c', .97);
  const facialHair = makeMaterial('#4c3730', .97);
  const cloth = makeMaterial('#252b3c', .98);
  const clothEdge = makeMaterial('#202635', 1);
  const clothLight = makeMaterial('#303749', .97);
  const denim = makeMaterial('#303843', .99);
  const denimSeam = makeMaterial('#3b4551', 1);
  const shoe = makeMaterial('#d7d0bd', .89);
  const sole = makeMaterial('#b9b6a9', .95);
  const nail = makeMaterial('#d4a993', .82);
  const gold = makeMaterial('#c99435', .78);
  const hairMaterials = ['#805c3d', '#916b45', '#a57b50', '#b18a5b', '#bd9666', '#c49f71'].map(c => makeMaterial(c, .93));

  function mesh(geometry, material, parent = rig, position) {
    geometries.add(geometry);
    const result = new THREE.Mesh(geometry, material);
    result.castShadow = true; result.receiveShadow = true;
    if (position) result.position.set(...position);
    parent.add(result); return result;
  }
  function ellipsoid(parent, position, scale, material, segments = 24) {
    const result = mesh(new THREE.SphereGeometry(1, segments, 18), material, parent, position);
    result.scale.set(...scale); return result;
  }
  // Smooth, individually shaped cross-sections give clothes and anatomy their silhouettes.
  function loft(parent, rings, material, segments = 24, position = [0, 0, 0]) {
    const vertices = [], indices = [], uvs = [];
    rings.forEach(([y, rx, rz, cz = 0, cx = 0], i) => {
      for (let j = 0; j <= segments; j++) {
        const a = j / segments * Math.PI * 2;
        vertices.push(cx + Math.cos(a) * rx, y, cz + Math.sin(a) * rz);
        uvs.push(j / segments, i / (rings.length - 1));
      }
    });
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j, b = a + 1, d = a + segments + 1, c = d + 1;
      indices.push(a, d, b, b, d, c);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    return mesh(geometry, material, parent, position);
  }
  function tube(parent, points, radius, material, segments = 20) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(new THREE.TubeGeometry(curve, segments, radius, 6, false), material, parent);
  }
  function joint(parent, position, name) {
    const group = new THREE.Group(); group.position.set(...position); group.name = name;
    parent.add(group); return group;
  }
  function seam(parent, points, radius = .0021, material = clothLight) { return tube(parent, points, radius, material, 18); }
  function softCloth(parent,rings,material,segments=32) {
    const smooth=[];
    const interpolate=(p0,p1,p2,p3,t)=>.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);
    for(let i=0;i<rings.length-1;i++)for(let k=0;k<4;k++) {
      const t=k/4,a=rings[Math.max(0,i-1)],b=rings[i],c=rings[i+1],d=rings[Math.min(rings.length-1,i+2)];
      const ring=[THREE.MathUtils.lerp(b[0],c[0],t)];
      for(let n=1;n<5;n++)ring.push(interpolate(a[n]||0,b[n]||0,c[n]||0,d[n]||0,t));
      ring[1]=Math.max(.001,ring[1]);ring[2]=Math.max(.001,ring[2]);smooth.push(ring);
    }
    smooth.push(rings[rings.length-1]);return loft(parent,smooth,material,segments);
  }
  // Longitudinal sections form a fitted heel, narrower arch and rounded toe box.
  function sneakerSurface(parent,sections,material,roundness=.75) {
    const positions=[],indices=[],uvs=[],sides=32;
    sections.forEach(([z,width,bottom,top],i)=>{
      const center=(bottom+top)/2,height=(top-bottom)/2;
      for(let j=0;j<=sides;j++) {
        const a=j/sides*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
        positions.push(Math.sign(c)*Math.pow(Math.abs(c),roundness)*width,center+Math.sign(s)*Math.pow(Math.abs(s),roundness)*height,z);
        uvs.push(j/sides,i/(sections.length-1));
      }
    });
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<sides;j++){
      const a=i*(sides+1)+j,b=a+1,c=a+sides+1,d=c+1;indices.push(a,b,c,b,d,c);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    return mesh(geometry,material,parent);
  }
  function fingerSegment(parent,length,width) {
    return softCloth(parent,[[-length,.001,.001],[-length*.85,width*.62,width*.57],[-length*.53,width*.88,width*.76],[-length*.16,width,width*.88],[.004,width*.85,width*.82]],skin,16);
  }

  // Torso: a soft shoulder line, generous hoodie folds, a fitted ribbed hem.
  softCloth(rig, [[.793,.173,.116],[.827,.185,.124],[.865,.197,.136],[.925,.2,.139],[1.015,.202,.138],[1.13,.197,.13],[1.225,.202,.124],[1.33,.213,.11],[1.385,.207,.095],[1.42,.179,.078],[1.447,.111,.062],[1.466,.053,.048]], cloth, 40);
  softCloth(rig, [[.787,.174,.114],[.793,.18,.122],[.837,.189,.129],[.85,.181,.119]], clothEdge);
  for (let i = 0; i < 9; i++) {
    const x=-.16+i*.04;
    seam(rig, [[x,.796,Math.sqrt(Math.max(0,1-(x/.18)**2))*.123],[x,.832,Math.sqrt(Math.max(0,1-(x/.189)**2))*.13]], .0006, clothLight);
  }
  // Kangaroo pocket sits on the actual front contour.
  softCloth(rig, [[.852,.123,.003,.14],[.873,.157,.006,.14],[.965,.166,.008,.141],[1.047,.154,.005,.137],[1.088,.119,.002,.13]], cloth, 32);
  seam(rig, [[-.119,1.086,.135],[-.148,1.038,.146],[-.159,.943,.15]], .0022, clothEdge);
  seam(rig, [[.119,1.086,.135],[.148,1.038,.146],[.159,.943,.15]], .0022, clothEdge);
  seam(rig, [[-.149,.871,.147],[0,.855,.148],[.149,.871,.147]], .0015, clothLight);
  seam(rig, [[-.119,1.088,.136],[0,1.077,.139],[.119,1.088,.136]], .0013, clothLight);
  // Natural compressed cloth creases are fine ridges instead of dark drawn stripes.
  seam(rig, [[-.189,.86,.034],[-.178,.884,.078],[-.163,.918,.099]], .002, clothLight);
  seam(rig, [[.184,.852,.035],[.174,.887,.07],[.17,.938,.084]], .002, clothLight);
  for(const side of [-1,1])seam(rig,[[side*.111,1.444,.034],[side*.173,1.401,.052],[side*.211,1.348,.066]],.0018,clothLight);
  // Hood folded behind the neck, opening forwards.
  softCloth(rig,[[1.275,.017,.009,-.113],[1.305,.06,.027,-.113],[1.355,.105,.039,-.108],[1.416,.126,.044,-.093],[1.462,.104,.036,-.074],[1.489,.062,.017,-.05],[1.497,.047,.009,-.044]],cloth,32);
  ellipsoid(rig, [0,1.465,-.05], [.068,.027,.051], clothEdge);
  tube(rig, [[-.09,1.421,.025],[-.108,1.457,-.03],[0,1.491,-.086],[.108,1.457,-.03],[.09,1.421,.025]], .01, clothLight, 30);
  seam(rig,[[-.105,1.425,-.124],[-.092,1.36,-.143],[0,1.298,-.135],[.092,1.36,-.143],[.105,1.425,-.124]],.0018,clothEdge);
  softCloth(rig, [[1.417,.059,.05],[1.455,.054,.047],[1.487,.048,.042],[1.505,.05,.044],[1.524,.06,.052]], skin, 28);
  // Ribbed front collar and hanging drawstrings.
  tube(rig, [[-.092,1.46,.04],[-.055,1.435,.083],[0,1.421,.097],[.055,1.435,.083],[.092,1.46,.04]], .015, clothEdge);
  loft(rig,[[1.399,.071,.064,.019],[1.426,.074,.063,.012],[1.462,.062,.051],[1.468,.058,.047]],clothEdge,24);
  [-1,1].forEach(side => {
    ellipsoid(rig, [side*.055,1.392,.112], [.009,.008,.003], clothEdge, 12);
    tube(rig, [[side*.055,1.395,.12],[side*.064,1.32,.133],[side*.059,1.247,.138],[side*.071,1.218,.133]], .0041, clothEdge);
    ellipsoid(rig, [side*.071,1.216,.133], [.0047,.012,.0047], clothLight, 12);
  });
  // Small abstract golden embroidered emblem, drawn as a curved leaf.
  const badge = new THREE.Shape();
  badge.moveTo(-.012,-.01); badge.bezierCurveTo(-.018,.006,-.006,.021,.009,.016);
  badge.bezierCurveTo(.02,.013,.018,-.005,.007,-.008); badge.bezierCurveTo(.002,.006,-.005,.007,-.004,-.004);
  badge.bezierCurveTo(-.006,-.008,-.01,-.006,-.012,-.01);
  mesh(new THREE.ShapeGeometry(badge,14), gold, rig, [-.099,1.313,.116]);

  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const hip = joint(rig, [side*.091,.936,0], side < 0 ? 'Perna esquerda' : 'Perna direita');
    loft(hip, [[-.429,.061,.073,.004],[-.392,.067,.078,.004],[-.28,.078,.086,-.007],[-.14,.09,.096,-.011],[-.035,.096,.097],[.035,.082,.087]], denim);
    const knee = joint(hip, [0,-.423,0], 'Joelho');
    ellipsoid(knee,[0,0,.002],[.061,.067,.071],denim);
    loft(knee,[[-.412,.045,.053],[-.38,.048,.054],[-.25,.055,.06,-.006],[-.115,.062,.073,-.008],[-.035,.061,.074],[.02,.057,.067]],denim);
    seam(hip,[[side*.073,-.047,.046],[side*.078,-.18,.015],[side*.064,-.34,.019],[side*.054,-.406,.025]],.0015,denimSeam);
    seam(knee,[[side*.052,-.04,.022],[side*.05,-.22,.021],[side*.043,-.388,.022]],.0014,denimSeam);
    loft(knee,[[-.413,.047,.055],[-.39,.049,.056],[-.38,.047,.053]],denimSeam,20);
    const foot = joint(knee,[0,-.406,0],'Tênis');
    sneakerSurface(foot,[[-.069,.003,-.093,-.073],[-.064,.039,-.093,-.066],[-.05,.054,-.093,-.064],[-.012,.055,-.092,-.064],[.027,.052,-.09,-.065],[.075,.063,-.091,-.066],[.12,.07,-.093,-.067],[.16,.064,-.091,-.066],[.192,.044,-.087,-.063],[.207,.015,-.081,-.064],[.209,.001,-.075,-.07]],sole,.55);
    sneakerSurface(foot,[[-.067,.002,-.069,-.06],[-.06,.035,-.069,-.009],[-.046,.048,-.066,.016],[-.016,.05,-.065,.022],[.018,.052,-.065,.016],[.05,.057,-.066,.008],[.1,.063,-.067,-.014],[.145,.062,-.066,-.029],[.179,.049,-.064,-.038],[.198,.026,-.062,-.045],[.205,.001,-.058,-.054]],shoe,.83);
    // Padded ankle opening, tongue, lace rows and a stitched toe panel.
    tube(foot,[[-.035,.012,-.012],[-.036,.014,-.037],[0,.017,-.05],[.036,.014,-.037],[.035,.012,-.012]],.0045,shoe,20);
    ellipsoid(foot,[0,.009,.035],[.026,.012,.041],shoe);
    for(let i=0;i<5;i++) {
      const z=.025+i*.017,y=.025-i*.0053;
      seam(foot,[[-.029,y-.003,z],[0,y+.001,z+.006],[.029,y-.003,z]],.0016,sole);
    }
    seam(foot,[[-.047,-.034,.073],[-.054,-.03,.12],[-.036,-.034,.164],[0,-.033,.18],[.036,-.034,.164],[.054,-.03,.12],[.047,-.034,.073]],.0012,sole);
    for(const shoeSide of [-1,1])seam(foot,[[shoeSide*.047,-.012,-.041],[shoeSide*.052,-.046,-.015],[shoeSide*.053,-.055,.037],[shoeSide*.061,-.053,.091]],.0012,sole);
    legs.push({hip,knee,foot,side});

    const shoulder = joint(rig,[side*.187,1.414,0],side<0?'Braço esquerdo':'Braço direito');
    softCloth(shoulder,[[-.291,.049,.052],[-.269,.056,.058],[-.224,.064,.063,-.002],[-.17,.068,.07,-.006],[-.112,.072,.072,-.003],[-.056,.076,.07],[.003,.064,.058],[.036,.033,.035],[.044,.003,.004]],cloth,36);
    const elbow = joint(shoulder,[0,-.278,0],'Cotovelo');
    softCloth(elbow,[[-.249,.04,.043],[-.221,.046,.047],[-.19,.05,.052,-.004],[-.145,.056,.057,-.007],[-.102,.054,.058,-.003],[-.051,.059,.06],[0,.056,.058],[.03,.045,.044]],cloth,32);
    loft(elbow,[[-.258,.041,.041],[-.248,.044,.047],[-.211,.046,.049],[-.207,.043,.044]],clothEdge);
    seam(shoulder,[[side*.058,-.048,.034],[side*.064,-.145,.028],[side*.052,-.26,.027]],.0016,clothLight);
    seam(elbow,[[side*.048,-.045,.022],[side*.045,-.077,.034],[side*.05,-.09,.024]],.0021,clothLight);
    const hand = joint(elbow,[0,-.27,.003],'Mão');
    softCloth(hand,[[-.069,.022,.011,.001],[-.056,.033,.014,.002],[-.029,.034,.016,.001],[-.006,.027,.019],[.024,.024,.022]],skin,28);
    const digits=[];
    const fingers=[{x:-side*.024,length:.071,width:.0081},{x:-side*.008,length:.081,width:.0087},{x:side*.009,length:.077,width:.0082},{x:side*.024,length:.062,width:.0069}];
    fingers.forEach((finger,index)=>{
      const proximal=joint(hand,[finger.x,-.054+(index===3?.004:0),.002],'Dedo');
      proximal.rotation.z=side*(index-1.3)*.025;
      const firstLength=finger.length*.45,secondLength=finger.length*.30,lastLength=finger.length*.25;
      fingerSegment(proximal,firstLength,finger.width);
      const middle=joint(proximal,[0,-firstLength+.003,0],'Falange média');fingerSegment(middle,secondLength,finger.width*.87);
      const distal=joint(middle,[0,-secondLength+.002,0],'Falange distal');fingerSegment(distal,lastLength,finger.width*.73);
      ellipsoid(distal,[0,-lastLength+.008,finger.width*.69],[finger.width*.52,.0065,.0011],nail,14);
      seam(middle,[[-finger.width*.55,-.001,finger.width*.8],[0,.001,finger.width*.88],[finger.width*.55,-.001,finger.width*.8]],.0005,skinWarm);
      digits.push({proximal,middle,distal,rest:.10+index*.035});
    });
    const thumb=joint(hand,[-side*.031,-.012,.002],'Polegar');thumb.rotation.z=-side*.55;thumb.rotation.x=-.19;
    fingerSegment(thumb,.037,.012);
    const thumbTip=joint(thumb,[0,-.031,0],'Ponta do polegar');thumbTip.rotation.x=.22;fingerSegment(thumbTip,.03,.0101);
    ellipsoid(thumbTip,[0,-.021,.0087],[.0065,.008,.0012],nail,14);
    arms.push({shoulder,elbow,hand,side,digits});
  }

  const head = joint(rig,[0,1.616,.002],'Rosto');
  head.scale.setScalar(.82);
  // A narrow adult jaw, cheekbones, rounded cranium and a distinct chin.
  const headRings = [[-.15,.018,.029,.027],[-.14,.04,.063,.019],[-.124,.056,.078,.009],[-.103,.073,.087,.003],[-.076,.086,.0915,.0005],[-.04,.098,.096,-.005],[0,.104,.101,-.005],[.035,.105,.103,-.005],[.07,.104,.106,-.008],[.105,.097,.105,-.012],[.136,.07,.082,-.013],[.154,.031,.044,-.014],[.16,.001,.001,-.013]];
  const skull = loft(head,headRings,skin,48);
  // Broad, shallow planes soften the cheeks without the detached sphere appearance.
  const cheekParts = [ellipsoid(head,[-.064,-.041,.066],[.032,.043,.027],skin),
    ellipsoid(head,[.064,-.041,.066],[.032,.043,.027],skin)];
  [-1,1].forEach(side=>{
    const ear=joint(head,[side*.107,-.011,-.008],'Orelha'); ear.rotation.z=-side*.13;
    ellipsoid(ear,[0,0,0],[.022,.043,.018],skin);
    ellipsoid(ear,[side*.004,.003,.011],[.011,.027,.005],earInner);
    tube(ear,[[side*.011,-.023,.009],[side*.017,.005,.01],[side*.011,.027,.01],[side*.002,.031,.012]],.0033,skin,14);
    ellipsoid(ear,[-side*.005,-.005,.015],[.007,.01,.004],skin);
  });
  const facialFeatureStart = head.children.length;
  // Almond eye openings; the iris is partly covered by eyelids.
  for(const side of [-1,1]) {
    const x=side*.043, y=.014;
    ellipsoid(head,[x,y,.092],[.029,.0105,.008],skinWarm);
    ellipsoid(head,[x,y,.096],[.026,.0082,.0055],eyeWhite);
    ellipsoid(head,[x-side*.002,y,.101],[.0078,.008,.0024],iris,20);
    ellipsoid(head,[x-side*.002,y,.103],[.0038,.0055,.0012],pupil,16);
    ellipsoid(head,[x-side*.002-.0015,y+.0025,.1043],[.00135,.0015,.0005],eyeWhite,10);
    tube(head,[[x-.026,y-.001,.097],[x-.013,y+.0074,.100],[x+.002,y+.009,.101],[x+.018,y+.005,.099],[x+.026,y-.001,.096]],.0032,skin,20);
    tube(head,[[x-.026,y-.001,.097],[x-.012,y-.006,.1],[x+.011,y-.0064,.1],[x+.026,y-.001,.096]],.0024,skinWarm,20);
    // Strong dark eyebrows, with a tapered lateral end and visible direction.
    const browPoints = side < 0
      ? [[-.077,.041,.091],[-.058,.05,.099],[-.038,.052,.104],[-.018,.043,.102]]
      : [[.018,.043,.102],[.038,.052,.104],[.058,.05,.099],[.077,.041,.091]];
    tube(head,browPoints,.0052,brow,18);
    for(let h=0;h<9;h++) {
      const xx=side*(.023+h*.0055), yy=.047+Math.sin(h/8*Math.PI)*.005;
      tube(head,[[xx,yy-.003,.103-(Math.abs(xx)-.024)*.16],[xx+side*.004,yy+.005,.103-(Math.abs(xx)-.024)*.16]],.0009,brow,2);
    }
  }
  // Sculpted bridge, nasal tip and wings. The nose has depth in profile.
  loft(head,[[-.06,.007,.008,.103],[-.053,.013,.013,.116],[-.043,.015,.018,.12],[-.024,.01,.017,.114],[.002,.009,.013,.104],[.031,.009,.009,.093]],skin,24);
  ellipsoid(head,[0,-.043,.132],[.014,.011,.014],skin);
  for(const side of [-1,1]) {
    ellipsoid(head,[side*.014,-.052,.112],[.01,.007,.01],skin);
    ellipsoid(head,[side*.012,-.057,.119],[.0044,.0025,.0033],earInner,14);
    tube(head,[[side*.004,-.061,.109],[side*.005,-.07,.106]],.0015,skinWarm,8);
  }
  // Natural, modest lips and the short moustache in the supplied portrait.
  tube(head,[[-.03,-.084,.091],[-.014,-.079,.103],[-.004,-.081,.107],[0,-.079,.108],[.004,-.081,.107],[.014,-.079,.103],[.03,-.084,.091]],.0038,lip,28);
  tube(head,[[-.028,-.086,.094],[-.013,-.09,.104],[0,-.091,.109],[.013,-.09,.104],[.028,-.086,.094]],.0048,lip,24);
  tube(head,[[-.026,-.085,.098],[0,-.085,.111],[.026,-.085,.098]],.00115,lipLine,24);
  for(const side of [-1,1]) {
    tube(head,[[side*.004,-.07,.108],[side*.013,-.071,.108],[side*.023,-.075,.104],[side*.031,-.08,.096]],.0036,facialHair,14);
    for(let i=0;i<12;i++) {
      const x=side*(.004+i*.00225), y=-.068-i*.00063, z=.108-Math.pow(i/11,2)*.01;
      tube(head,[[x,y,z],[x+side*.0018,y-.007,z+.001]],.00068,facialHair,2);
    }
    // Fine sparse jaw stubble follows the chin curve and leaves the cheeks clear.
    for(let i=0;i<22;i++) {
      const a=i/21, x=side*(.02+a*.061), y=-.129+a*.026;
      const z=.065-a*.024;
      tube(head,[[x,y,z],[x+side*.0012,y+.003,z+.001]],.00048,facialHair,2);
    }
    for(let i=0;i<7;i++) {
      const x=side*(.094+i*.0009), y=.035-i*.008;
      tube(head,[[x,y,.021],[x+side*.001,y-.01,.018]],.0012,hairMaterials[0],2);
    }
  }

  const proceduralFeatures = [...cheekParts, ...head.children.slice(facialFeatureStart)];
  const facialFeatures = joint(head,[0,0,0],'Traços faciais modelados');
  proceduralFeatures.forEach(part=>facialFeatures.add(part));
  const hair = createAvatarHair(head);
  const profile = createProfileSurface(head,headRings);

  // Optional generated front-face atlas. Loading happens only after an explicit URL.
  // UVs cover the neutral facial region, while the underlying mesh retains volume.
  let facePatch=null, faceTexture=null, disposed=false, textureRequest=0;
  async function setFaceTexture(url) {
    const request=++textureRequest;
    const texture=await new THREE.TextureLoader().loadAsync(url);
    if(disposed || request!==textureRequest) { texture.dispose(); return; }
    texture.colorSpace=THREE.SRGBColorSpace;
    hair.setTexture(texture);
    texture.anisotropy=4; textures.add(texture);
    const vertices=[],uvs=[],indices=[],fades=[],columns=64,rows=64;
    const gaussian=(x,y,cx,cy,sx,sy)=>Math.exp(-.5*((x-cx)**2/sx**2+(y-cy)**2/sy**2));
    // One orthographic projection preserves the portrait's eye/nose/mouth proportions.
    // There is no independent UV stretching for each jaw/cheek ring.
    const metresPerPhotoUnit=.392, photoForeheadY=.355, photoChinY=.945, foreheadY=.095, minimumClearance=.006;
    let smallestClearance=Infinity;
    for(let j=0;j<=rows;j++) for(let i=0;i<=columns;i++) {
      const v=j/rows,y=foreheadY-(1-v)*(photoChinY-photoForeheadY)*metresPerPhotoUnit;
      let lo=headRings[0],hi=headRings[1];
      for(let k=0;k<headRings.length-1;k++) if(y>=headRings[k][0] && y<=headRings[k+1][0]) {lo=headRings[k];hi=headRings[k+1];break;}
      const f=(y-lo[0])/(hi[0]-lo[0]),rx=THREE.MathUtils.lerp(lo[1],hi[1],f),rz=THREE.MathUtils.lerp(lo[2],hi[2],f),cz=THREE.MathUtils.lerp(lo[3]||0,hi[3]||0,f);
      const u=i/columns,a=(u-.5)*Math.PI*.82, x=Math.sin(a)*rx;
      // Positive relief only: a textured eye socket must never dip behind the skull.
      // The photograph already supplies fine facial shading, so the relief stays gentle.
      const depth=.009*gaussian(x,y,0,.021,.013,.033)+.025*gaussian(x,y,0,-.037,.015,.018)
        +.004*gaussian(x,y,-.015,-.045,.013,.009)+.004*gaussian(x,y,.015,-.045,.013,.009)
        +.004*gaussian(x,y,-.055,-.019,.031,.037)+.004*gaussian(x,y,.055,-.019,.031,.037)
        +.003*gaussian(x,y,0,-.079,.029,.017)+.003*gaussian(x,y,0,-.118,.031,.02);
      const skullZ=cz+Math.cos(a)*rz, faceZ=skullZ+minimumClearance+depth;
      vertices.push(x,y,faceZ);
      smallestClearance=Math.min(smallestClearance,faceZ-skullZ);
      uvs.push(.5+x/metresPerPhotoUnit,1-photoForeheadY+(y-foreheadY)/metresPerPhotoUnit);
      fades.push(THREE.MathUtils.smoothstep(u,0,.075)*(1-THREE.MathUtils.smoothstep(u,.925,1))*THREE.MathUtils.smoothstep(v,0,.025));
    }
    for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;indices.push(a,b,c,b,d,c);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('faceFade',new THREE.Float32BufferAttribute(fades,1));geometry.setIndex(indices);geometry.computeVertexNormals();
    if(facePatch) {head.remove(facePatch);facePatch.geometry.dispose();facePatch.material.dispose();}
    if(faceTexture) {faceTexture.dispose();textures.delete(faceTexture);}
    faceTexture=texture;
    const material=makeMaterial('#ffffff',1,{map:texture,emissive:'#ffffff',emissiveMap:texture,emissiveIntensity:.2,transparent:true,depthWrite:true,polygonOffset:true,polygonOffsetFactor:-1});
    material.onBeforeCompile=shader=>{
      shader.vertexShader='attribute float faceFade; varying float vFaceFade;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFaceFade=faceFade;');
      shader.fragmentShader='varying float vFaceFade;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.a*=vFaceFade;');
    };
    material.customProgramCacheKey=()=> 'avatar-face-projection-v2';
    facePatch=mesh(geometry,material,head);facePatch.name='Textura facial personalizada';
    facePatch.castShadow=false;
    facePatch.receiveShadow=false;
    facePatch.userData.geometryAudit={minimumSkullClearance:smallestClearance,metresPerPhotoUnit,vertices:vertices.length/3};
    facialFeatures.visible=false;
  }

  // Batch stationary details within each joint, retaining every moving articulation.
  // Hair strands, cloth seams and tiny features should not each cost a draw call.
  function batchStaticParts(parent) {
    [...parent.children].filter(child=>child.isGroup&&child.name!=='Cabelo personalizado').forEach(batchStaticParts);
    const batches=new Map();
    parent.children.filter(child=>child.isMesh).forEach(part=>{
      if(!batches.has(part.material))batches.set(part.material,[]);
      batches.get(part.material).push(part);
    });
    for(const [material,parts] of batches) {
      if(parts.length<2)continue;
      const positions=[],normals=[],uvs=[],indices=[];
      let offset=0;
      for(const part of parts) {
        part.updateMatrix();
        const geometry=part.geometry.clone().applyMatrix4(part.matrix);
        const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
        for(let i=0;i<p.count;i++){
          positions.push(p.getX(i),p.getY(i),p.getZ(i));
          normals.push(n?.getX(i)||0,n?.getY(i)||0,n?.getZ(i)||0);
          uvs.push(uv?.getX(i)||0,uv?.getY(i)||0);
        }
        if(geometry.index)for(let i=0;i<geometry.index.count;i++)indices.push(geometry.index.getX(i)+offset);
        else for(let i=0;i<p.count;i++)indices.push(i+offset);
        offset+=p.count;geometry.dispose();parent.remove(part);
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
      mesh(geometry,material,parent);
    }
  }
  batchStaticParts(rig);
  // Sitting gathers the long hoodie above the seat instead of clipping its hem through the bench.
  const seatedCloth=[];
  for(const part of rig.children)if(part.isMesh&&[cloth,clothEdge,clothLight].includes(part.material)) {
    const position=part.geometry.attributes.position,array=new Float32Array(position.array);
    for(let i=0;i<position.count;i++)array[i*3+1]+=.108*(1-THREE.MathUtils.smoothstep(position.getY(i),.84,1.07));
    part.geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(array,3)];
    part.updateMorphTargets();seatedCloth.push(part);
  }

  let stride=0, walking=0, seated=0, initialized=false;
  const damp=THREE.MathUtils.damp;
  const deltaAngle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
  function update({delta=1/60,time=0,position,facing=0,speed=0,sitting=false,visible=true}={}) {
    const dt=Math.min(Math.max(delta,0),.07);
    root.visible=visible;
    if(position) root.position.copy(position);
    if(!initialized) {root.rotation.y=facing;initialized=true;}
    else root.rotation.y+=deltaAngle(root.rotation.y,facing)*(1-Math.exp(-12*dt));
    walking=damp(walking,Math.min(Math.abs(speed)/2.8,1.2),8,dt);
    seated=damp(seated,sitting?1:0,8,dt);
    for(const part of seatedCloth)part.morphTargetInfluences[0]=seated;
    stride+=dt*(3.5+Math.min(Math.abs(speed),4)*2.45)*(walking>.025?1:0);
    const walk=walking*(1-seated), breathe=Math.sin(time*1.7);
    rig.rotation.z=Math.sin(stride)*walk*.014;
    head.rotation.x=Math.sin(time*.8)*.014*(1-walk)+seated*.035;
    head.rotation.y=Math.sin(time*.43)*.025*(1-walk);
    let supportY=Infinity;
    for(const {hip,knee,foot,side} of legs) {
      const phase=stride+(side<0?Math.PI:0), swing=Math.sin(phase);
      hip.rotation.x=-swing*walk*.47-seated*1.1;
      hip.rotation.z=side*(.015+seated*.055);
      knee.rotation.x=Math.max(0,-swing)*walk*.62+seated*1.11;
      foot.rotation.x=Math.max(0,swing)*walk*.1-Math.max(0,-swing)*walk*.13;
      const ankleY=.936-.423*Math.cos(hip.rotation.x)-.406*Math.cos(hip.rotation.x+knee.rotation.x);
      const footAngle=hip.rotation.x+knee.rotation.x+foot.rotation.x;
      const contactY=ankleY-.093*Math.cos(footAngle)+Math.min(.069*Math.sin(footAngle),-.209*Math.sin(footAngle));
      supportY=Math.min(supportY,contactY);
    }
    rig.position.y=(.014-supportY)*(1-seated)-seated*.11;
    for(const {shoulder,elbow,hand,side,digits} of arms) {
      const swing=Math.sin(stride+(side<0?Math.PI:0));
      shoulder.rotation.x=swing*walk*.34-seated*.28;
      shoulder.rotation.z=side*(.055+walk*.016+seated*.028);
      elbow.rotation.x=-.12-walk*.10-seated*.91;
      hand.rotation.x=-.055-seated*.1;
      hand.rotation.y=side*(1.05-seated*.38);
      hand.rotation.z=side*.035;
      for(const {proximal,middle,distal,rest} of digits) {
        proximal.rotation.x=rest+walk*.04+seated*.07;
        middle.rotation.x=.20+walk*.035+seated*.09;
        distal.rotation.x=.15+seated*.04;
      }
      shoulder.position.y=1.414+breathe*.002;
    }
    rig.scale.y=1+breathe*.0008*(1-walk);
  }
  update();
  return {root,update,setFaceTexture,setProfileTexture:profile.setTexture,dispose(){
    disposed=true;textureRequest++;scene.remove(root);profile.dispose();hair.dispose();
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  }};
}
