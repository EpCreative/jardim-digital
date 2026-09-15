import * as THREE from '../vendor/three.module.js';
import { createRendering } from './rendering.js';
import { createGarden } from './world.js?v=2';
import { createNavigation } from './navigation.js?v=5';
import { createAvatar } from './avatar.js?v=8';
import { createAmbience } from './audio.js';

const $ = id => document.getElementById(id);
const icon = name => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
const app = $('garden-app');
const dialogs = [...document.querySelectorAll('dialog')];
const descriptions = {
  fountain: {eyebrow:'01 / O SOM DA CALMA',copy:'Água que sobe, cai e recomeça. A fonte é o coração deste jardim — um convite para ouvir os pequenos movimentos do mundo.',note:'Às vezes, tudo o que a gente precisa é parar por um instante.'},
  flowers: {eyebrow:'02 / PEQUENAS DESCOBERTAS',copy:'Lavandas, margaridas e flores douradas dividem o mesmo canteiro. Olhe mais de perto: as borboletas também encontraram um lugar para ficar.',note:'Regue as flores e reserve alguns segundos para observar.'},
  pergola: {eyebrow:'03 / FIQUE UM POUCO',copy:'Sob a madeira e as folhas, a luz chega mais devagar. Este banco está aqui para isso: sentar, respirar e não fazer mais nada.',note:'Um lugar à sombra, sem nada na agenda.'},
  pond: {eyebrow:'04 / UM OUTRO RITMO',copy:'Entre pedras e folhas flutuantes, o lago guarda um pedaço do céu. Aproxime-se da margem e acompanhe a luz sobre a água.',note:'Nem toda pausa precisa ter um motivo.'}
};
let render, garden, navigation, ambience, avatar, nearest = null, activePlace = null;
let entered = false, evening = false, sound = false, fountain = true, toastTimer;
let elapsed = 0, previous = performance.now();

function toast(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('visible');
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4200);
}
function showDialog(dialog) { navigation.setPaused(true); dialog.showModal(); }
function changeMode(mode) {
  app.dataset.mode = mode;
  const walk = mode !== 'overview';
  $('avatar-controls').hidden = !walk;
  $('intro').inert = walk;
  $('walk-hint').hidden = !walk; $('overview-hint').hidden = walk;
  $('touch-controls').hidden = !(walk && (innerWidth<=768 || matchMedia('(pointer: coarse)').matches));
  $('location-label').textContent = walk ? 'EXPLORE NO SEU RITMO' : 'UM PEQUENO REFÚGIO';
}
function enter() {
  entered = true; changeMode('walk'); navigation.enter();
  render.renderer.domElement.focus({preventScroll:true});
  toast(innerWidth<=768?'Use as setas para caminhar. Deslize para girar a câmera.':'Seu personagem está no jardim. W A S D para caminhar; arraste para girar a câmera.');
}
function visit(place) {
  $('places-dialog').close(); entered = true; changeMode('walk');
  navigation.flyTo(place.viewPosition,place.lookAt,'walk',()=>toast(`${place.title}. Pressione E ou toque no convite para interagir.`));
  $('location-label').textContent = place.title.toUpperCase();
  render.renderer.domElement.focus({preventScroll:true});
}
function openPlace() {
  if (!nearest || navigation.busy) return;
  activePlace = nearest;
  const details = descriptions[activePlace.id];
  $('detail-eyebrow').textContent = details.eyebrow; $('detail-title').textContent = activePlace.title;
  $('detail-copy').textContent = details.copy; $('detail-note').textContent = details.note;
  const labels = {fountain:fountain?'Pausar a fonte':'Ligar a fonte',flowers:'Regar as flores',pergola:'Sentar e contemplar',pond:'Contemplar o lago'};
  $('detail-action').innerHTML = `<span>${labels[activePlace.id]}</span>${icon('arrow')}`;
  showDialog($('detail-dialog'));
}
function interact() {
  if (!activePlace) return;
  $('detail-dialog').close();
  switch (activePlace.id) {
    case 'fountain': fountain = !fountain; garden.setFountain(fountain); toast(fountain?'A água voltou a correr.':'A fonte descansou. Aproveite o silêncio.'); break;
    case 'flowers': garden.waterFlowers(); toast('Um pouco de cuidado faz o jardim florescer.'); break;
    case 'pergola': navigation.flyTo([7.4,1.15,-6.05],[0,1.1,1],'rest'); changeMode('rest'); toast('Inspire. Expire. Fique o tempo que quiser. Use as setas ou W A S D para levantar.'); break;
    case 'pond': navigation.flyTo([-10.15,1.2,-4.3],[-7.4,.3,-5.7],'rest'); changeMode('rest'); toast('Observe os pequenos detalhes. Caminhe quando quiser continuar.'); break;
  }
}
function bindUI() {
  const syncView=()=>{
    const third=navigation.view==='third';app.dataset.view=navigation.view;
    $('view-label').textContent=third?'3ª pessoa':'1ª pessoa';
    $('view-toggle').setAttribute('aria-pressed',String(third));
    $('view-toggle').setAttribute('aria-label',third?'Alternar para primeira pessoa':'Alternar para terceira pessoa');
  };
  const toggleView=()=>{navigation.setView(navigation.view==='third'?'first':'third');syncView();};
  $('view-toggle').addEventListener('click',toggleView);
  $('front-view').addEventListener('click',()=>{navigation.setView('third');navigation.faceCamera();syncView();});
  window.addEventListener('resize',()=>{$('touch-controls').hidden=!(entered&&(innerWidth<=768||matchMedia('(pointer: coarse)').matches));});
  $('enter').addEventListener('click',enter);
  $('home').addEventListener('click',()=>{navigation.home();changeMode('overview');entered=false;$('interact').hidden=true;$('enter').focus();});
  $('help-toggle').addEventListener('click',()=>showDialog($('help-dialog')));
  $('help-done').addEventListener('click',()=>{$('help-dialog').close();if(!entered)enter();});
  $('map-toggle').addEventListener('click',()=>showDialog($('places-dialog')));
  $('interact').addEventListener('click',openPlace); $('detail-action').addEventListener('click',interact);
  dialogs.forEach(dialog => {
    dialog.addEventListener('close',()=>navigation.setPaused(dialogs.some(d=>d.open)));
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  });
  $('time-toggle').addEventListener('click',()=>{
    evening=!evening;render.setEvening(evening);garden.setEvening(evening);ambience.setEvening(evening);
    $('time-toggle').setAttribute('aria-pressed',String(evening));
    $('time-toggle').setAttribute('aria-label',evening?'Mudar para fim de tarde':'Mudar para entardecer');
    $('time-label').textContent=evening?'Entardecer':'Fim de tarde';
    $('time-toggle').querySelector('use').setAttribute('href',evening?'#moon':'#sun');
  });
  $('sound-toggle').addEventListener('click',async()=>{
    const next=!sound; $('sound-toggle').disabled=true;
    try { sound=await ambience.setEnabled(next);$('sound-toggle').setAttribute('aria-pressed',String(sound));$('sound-toggle').setAttribute('aria-label',sound?'Silenciar som ambiente':'Ativar som ambiente');$('sound-toggle').innerHTML=icon(sound?'sound':'mute');toast(sound?'Sons do jardim ativados.':'Som ambiente silenciado.'); }
    catch { toast('O navegador não conseguiu ativar o áudio. Você pode continuar o passeio.'); }
    finally { $('sound-toggle').disabled=false; }
  });
  garden.landmarks.forEach((place,index)=>{
    const button=document.createElement('button');button.className='place-item';button.setAttribute('aria-label',`Visitar ${place.title}`);
    button.innerHTML=`<span class="place-index">0${index+1}</span><span><span class="place-name">${place.title}</span><span class="place-subtitle">${place.subtitle}</span></span>${icon('arrow')}`;
    button.addEventListener('click',()=>visit(place));$('places-list').appendChild(button);
  });
  document.addEventListener('keydown',e=>{
    if(dialogs.some(d=>d.open)||!entered)return;
    if(e.key.toLowerCase()==='v'){e.preventDefault();toggleView();}
    if(e.key.toLowerCase()==='e'){e.preventDefault();openPlace();}
    if(e.key==='Escape'){e.preventDefault();showDialog($('help-dialog'));}
  });
  document.querySelectorAll('[data-move]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);navigation.setMovement(button.dataset.move,true);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>navigation.setMovement(button.dataset.move,false));
  });
  window.addEventListener('pagehide',event=>{
    if(!event.persisted)ambience.dispose();
    else { ambience.setEnabled(false).catch(()=>{});sound=false;$('sound-toggle').setAttribute('aria-pressed','false');$('sound-toggle').setAttribute('aria-label','Ativar som ambiente');$('sound-toggle').innerHTML=icon('mute'); }
  });
}
const projected = new THREE.Vector3(), avatarPosition = new THREE.Vector3();
function updateUI() {
  const {camera} = render;
  const player=navigation.playerPosition;
  $('view-toggle').disabled=navigation.busy;
  $('front-view').disabled=navigation.busy;
  if(entered && !navigation.busy && !dialogs.some(d=>d.open)) {
    let distance=5.1; nearest=null;
    garden.landmarks.forEach(place=>{const d=Math.hypot(player.x-place.position[0],player.z-place.position[2]);if(d<distance){distance=d;nearest=place;}});
    $('interact').hidden=!nearest;
    if(nearest)$('interact').querySelector('span').textContent=`${nearest.id==='pergola'?'Descansar em':'Explorar'} ${nearest.title}`;
  } else $('interact').hidden=true;
  const x=THREE.MathUtils.clamp(74+player.x*3.1,9,139),y=THREE.MathUtils.clamp(54+player.z*3.1,6,105);
  $('map-player').setAttribute('transform',`translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  if(!entered){projected.set(0,3.2,0).project(camera);$('place-marker').style.left=`${(projected.x*.5+.5)*100}%`;$('place-marker').style.top=`${(-projected.y*.5+.5)*100}%`;}
}
async function init() {
  try {
    render=createRendering($('scene'));garden=createGarden(render.scene);ambience=createAmbience();
    navigation=createNavigation(render.camera,render.renderer.domElement,garden.colliders,()=>{if(app.dataset.mode==='rest')changeMode('walk');});
    avatar=createAvatar(render.scene);
    avatar.root.visible=false;
    try { await avatar.setFaceTexture('./assets/avatar-face.webp'); }
    catch(error) { console.warn('A textura facial não carregou; usando o rosto modelado.',error); }
    try { await avatar.setProfileTexture('./assets/avatar-profile.webp'); }
    catch(error) { console.warn('A referência lateral não carregou; usando o perfil modelado.',error); }
    bindUI();
    await render.renderer.compileAsync(render.scene,render.camera);
    $('enter').disabled=false;$('enter').querySelector('span').textContent='Entrar no jardim';
    render.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('load-error').hidden=false;});
    function frame(now) {
      requestAnimationFrame(frame);
      const delta=Math.min((now-previous)/1000,.05);previous=now;
      if(document.hidden)return;
      elapsed+=delta;navigation.update(delta,elapsed);garden.update(elapsed,delta);render.update(delta);
      const sitting=navigation.restPose==='sit';
      avatarPosition.copy(navigation.playerPosition);
      // The pergola deck sits 12 cm above the paths; the seated rig uses the bench's world height.
      if(!sitting && avatarPosition.x>4.75 && avatarPosition.x<10.05 && avatarPosition.z>-7.45 && avatarPosition.z<-2.95)avatarPosition.y=.12;
      avatar.update({delta,time:elapsed,position:avatarPosition,facing:navigation.facing,speed:navigation.movementSpeed,sitting,visible:entered&&navigation.view==='third'});
      updateUI();
      render.renderer.render(render.scene,render.camera);
    }
    requestAnimationFrame(frame);
  } catch(error) { console.error('O jardim não pôde iniciar:',error);$('load-error').hidden=false;$('enter').querySelector('span').textContent='Não foi possível carregar'; }
}
init();
