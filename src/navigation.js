import * as THREE from '../vendor/three.module.js';

// Ground movement and camera position are deliberately independent. Orbiting
// cannot change the visitor's map coordinates or nearest garden interaction.
export function createNavigation(camera, canvas, colliders, onMove) {
  const keys = new Set();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const direction = new THREE.Vector3(), previousPlayer = new THREE.Vector3();
  const player = new THREE.Vector3(0, 0, 13);
  const focus = new THREE.Vector3(), desiredCamera = new THREE.Vector3();
  const target = new THREE.Vector3(-3, .9, 0);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mode = 'overview', view = 'third', paused = false, drag = null, transition = null;
  let yaw = 0, cameraYaw = 0, elevation = .35, firstPitch = 0, cameraDistance = 3.6;
  let facing = Math.PI, desiredFacing = Math.PI, movementSpeed = 0;
  let stepPulse = 0, pulseSpeed = 0, restingPose = 'stand';
  let orbitAngle = .08, orbitPitch = .35;
  const orbitDistance = 33;
  camera.position.set(-.5, 12.2, 30.9); camera.lookAt(target);
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'Jardim 3D em terceira pessoa. Arraste para girar a câmera. Use W A S D ou as setas para caminhar.');

  function contains(c, x, z, padding) {
    return c.r != null
      ? Math.hypot(x - c.x, z - c.z) < c.r + padding
      : x > c.minX - padding && x < c.maxX + padding && z > c.minZ - padding && z < c.maxZ + padding;
  }
  function blocked(x, z) {
    return Math.abs(x) > 21 || z < -20 || z > 19 || colliders.some(c => contains(c, x, z, .3));
  }
  function standUp() {
    if (mode !== 'rest') return;
    mode = 'walk'; restingPose = 'stand';
    // A seated visitor begins inside the bench. Clear its nearest edge first.
    for (let pass = 0; pass < 3; pass++) {
      for (const c of colliders) {
        if (!contains(c, player.x, player.z, .32)) continue;
        if (c.r != null) {
          const dx = player.x - c.x, dz = player.z - c.z, d = Math.hypot(dx, dz);
          player.x = c.x + (d ? dx / d : 0) * (c.r + .36);
          player.z = c.z + (d ? dz / d : 1) * (c.r + .36);
        } else {
          const edges = [
            { axis: 'x', value: c.minX - .36 }, { axis: 'x', value: c.maxX + .36 },
            { axis: 'z', value: c.minZ - .36 }, { axis: 'z', value: c.maxZ + .36 }
          ];
          edges.sort((a, b) => Math.abs(player[a.axis] - a.value) - Math.abs(player[b.axis] - b.value));
          player[edges[0].axis] = edges[0].value;
        }
      }
    }
  }
  function move(amount, instant = false) {
    direction.set(0, 0, 0);
    if (keys.has('w') || keys.has('arrowup')) direction.z -= 1;
    if (keys.has('s') || keys.has('arrowdown')) direction.z += 1;
    if (keys.has('a') || keys.has('arrowleft')) direction.x -= 1;
    if (keys.has('d') || keys.has('arrowright')) direction.x += 1;
    if (direction.lengthSq() === 0) return 0;
    const wasResting = mode === 'rest';
    standUp(); previousPlayer.copy(player); cameraDistance = 3.6;
    direction.normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
    const dx = direction.x * amount, dz = direction.z * amount;
    if (!blocked(player.x + dx, player.z)) player.x += dx;
    if (!blocked(player.x, player.z + dz)) player.z += dz;
    const moved = player.distanceTo(previousPlayer);
    if (moved > .00001) {
      desiredFacing = Math.atan2(player.x - previousPlayer.x, player.z - previousPlayer.z);
      if (instant) { stepPulse = .18; pulseSpeed = keys.has('shift') ? 5 : 2.9; }
    }
    if (moved > .00001 || wasResting) onMove?.();
    return moved;
  }

  // Find the first obstacle on the horizontal camera boom. Ignore the collider
  // containing its origin, which allows a camera to follow a visitor on a bench.
  function boomHit(c, origin, dx, dz) {
    const padding = .18;
    if (contains(c, origin.x, origin.z, padding)) return 1;
    if (c.r != null) {
      const ox = origin.x - c.x, oz = origin.z - c.z, r = c.r + padding;
      const a = dx * dx + dz * dz;
      if (a < .000001) return 1;
      const b = 2 * (ox * dx + oz * dz), d = b * b - 4 * a * (ox * ox + oz * oz - r * r);
      if (d < 0) return 1;
      const t = (-b - Math.sqrt(d)) / (2 * a);
      return t >= 0 && t <= 1 ? t : 1;
    }
    let near = 0, far = 1;
    for (const [position, delta, min, max] of [
      [origin.x, dx, c.minX - padding, c.maxX + padding],
      [origin.z, dz, c.minZ - padding, c.maxZ + padding]
    ]) {
      if (Math.abs(delta) < .000001) {
        if (position < min || position > max) return 1;
      } else {
        let a = (min - position) / delta, b = (max - position) / delta;
        if (a > b) [a, b] = [b, a];
        near = Math.max(near, a); far = Math.min(far, b);
        if (near > far) return 1;
      }
    }
    return near >= 0 && near <= 1 ? near : 1;
  }
  function keepCameraClear(position, origin) {
    const dx = position.x - origin.x, dz = position.z - origin.z;
    let t = 1;
    for (const c of colliders) t = Math.min(t, boomHit(c, origin, dx, dz));
    if (t < 1) position.lerpVectors(origin, position, Math.max(0, t - .035));
    position.y = Math.max(.55, position.y);
  }
  function framing(position, frameYaw, pose = 'stand') {
    focus.copy(position); focus.y = pose === 'sit' ? 1.04 : 1.22;
    if (view === 'first') {
      desiredCamera.copy(position); desiredCamera.y = pose === 'sit' ? 1.15 : 1.7;
    } else {
      const horizontal = cameraDistance * Math.cos(elevation);
      desiredCamera.set(position.x + Math.sin(frameYaw) * horizontal,
        focus.y + Math.sin(elevation) * cameraDistance,
        position.z + Math.cos(frameYaw) * horizontal);
      keepCameraClear(desiredCamera, focus);
    }
  }
  function clear() { keys.clear(); drag = null; stepPulse = 0; pulseSpeed = 0; }
  const keydown = e => {
    if (paused || mode === 'overview' || transition || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest?.('dialog') || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) {
      e.preventDefault(); keys.add(key);
      if (!e.repeat && key !== 'shift') move(.07, true);
    }
  };
  document.addEventListener('keydown', keydown);
  document.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', clear);
  canvas.addEventListener('pointerdown', e => {
    if (paused || transition) return;
    canvas.focus({ preventScroll: true }); canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || paused || transition || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    if (mode === 'overview') {
      orbitAngle -= dx * .003; orbitPitch = THREE.MathUtils.clamp(orbitPitch + dy * .002, .15, .8);
    } else {
      yaw -= dx * .003;
      if (view === 'third') elevation = THREE.MathUtils.clamp(elevation + dy * .003, .07, .95);
      else firstPitch = THREE.MathUtils.clamp(firstPitch - dy * .003, -1.2, 1.15);
    }
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { drag = null; });

  function flyTo(position, lookAt, nextMode = 'walk', onComplete) {
    clear(); movementSpeed = 0; cameraDistance = 3.6;
    const requested = new THREE.Vector3(...position), goal = new THREE.Vector3(...lookAt);
    const destinationPlayer = new THREE.Vector3(requested.x, 0, requested.z);
    const pose = nextMode === 'rest' && Math.hypot(requested.x - 7.4, requested.z + 5.88) < .65 ? 'sit' : 'stand';
    const sightDirection = Math.atan2(goal.x - requested.x, goal.z - requested.z);
    const destinationFacing = pose === 'sit' ? 0 : sightDirection;
    const destinationYaw = sightDirection - Math.PI;
    const dummy = new THREE.PerspectiveCamera();
    if (nextMode === 'overview') {
      dummy.position.copy(requested); dummy.lookAt(goal);
    } else {
      framing(destinationPlayer, destinationYaw, pose); dummy.position.copy(desiredCamera);
      if (view === 'first') {
        firstPitch = Math.atan2(goal.y - requested.y, Math.hypot(goal.x - requested.x, goal.z - requested.z));
        euler.set(firstPitch, destinationYaw, 0); dummy.quaternion.setFromEuler(euler);
      } else dummy.lookAt(focus);
    }
    transition = {
      start: camera.position.clone(), destination: dummy.position.clone(),
      startQ: camera.quaternion.clone(), endQ: dummy.quaternion.clone(),
      startPlayer: player.clone(), destinationPlayer,
      startFacing: facing, destinationFacing, destinationYaw, pose,
      elapsed: reduced ? 2.4 : 0, nextMode, onComplete
    };
  }
  function angleLerp(from, to, amount) {
    return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * amount;
  }
  return {
    get mode() { return mode; },
    get busy() { return !!transition; },
    get playerPosition() { return player; },
    get facing() { return facing; },
    get movementSpeed() { return movementSpeed; },
    get view() { return view; },
    get restPose() { return mode === 'rest' && !transition ? restingPose : 'stand'; },
    enter() {
      mode = 'walk'; restingPose = 'stand'; elevation = .35; firstPitch = 0;
      flyTo([0, 1.7, 13], [0, 1.4, 0]);
    },
    home() {
      mode = 'overview'; orbitAngle = .08; orbitPitch = .35; restingPose = 'stand';
      flyTo([target.x + Math.sin(orbitAngle) * orbitDistance * Math.cos(orbitPitch),
        target.y + Math.sin(orbitPitch) * orbitDistance,
        target.z + Math.cos(orbitAngle) * orbitDistance * Math.cos(orbitPitch)], target.toArray(), 'overview');
    },
    flyTo,
    setPaused(value) { paused = !!value; clear(); movementSpeed = 0; },
    setView(value) {
      if (!['third', 'first'].includes(value) || view === value || transition) return;
      view = value; clear();
      if (view === 'first') firstPitch = -.08;
      else { elevation = .35; cameraDistance = 3.6; }
      if (mode !== 'overview') {
        cameraYaw = yaw;
        framing(player, yaw, restingPose); camera.position.copy(desiredCamera);
        if (view === 'third') camera.lookAt(focus);
        else { euler.set(firstPitch, yaw, 0); camera.quaternion.setFromEuler(euler); }
      }
    },
    faceCamera() {
      if (mode === 'overview' || transition || paused) return;
      view = 'third'; clear(); yaw = facing; elevation = .15; cameraDistance = 2.6;
    },
    setMovement(name, pressed) {
      const key = { forward: 'w', back: 's', left: 'a', right: 'd' }[name];
      if (!key) return;
      if (!pressed) { keys.delete(key); return; }
      if (paused || mode === 'overview' || transition) return;
      keys.add(key); move(.1, true);
    },
    update(delta) {
      if (paused) return;
      const dt = Math.min(Math.max(delta, 0), .08);
      if (transition) {
        transition.elapsed += dt;
        const p = Math.min(transition.elapsed / 2.4, 1), eased = p * p * (3 - 2 * p);
        camera.position.lerpVectors(transition.start, transition.destination, eased);
        camera.position.y += Math.sin(Math.PI * p) * (reduced ? 0 : 1.5);
        camera.quaternion.slerpQuaternions(transition.startQ, transition.endQ, eased);
        if (transition.nextMode !== 'overview') {
          player.lerpVectors(transition.startPlayer, transition.destinationPlayer, eased);
          facing = angleLerp(transition.startFacing, transition.destinationFacing, eased);
        }
        if (p === 1) {
          const completed = transition;
          mode = completed.nextMode; restingPose = completed.pose; transition = null;
          if (mode !== 'overview') { cameraYaw = yaw = completed.destinationYaw; desiredFacing = facing = completed.destinationFacing; }
          completed.onComplete?.();
        }
        return;
      }
      if (mode === 'overview') {
        movementSpeed = 0;
        camera.position.set(target.x + Math.sin(orbitAngle) * orbitDistance * Math.cos(orbitPitch),
          target.y + Math.sin(orbitPitch) * orbitDistance,
          target.z + Math.cos(orbitAngle) * orbitDistance * Math.cos(orbitPitch));
        camera.lookAt(target); return;
      }
      const moved = move(dt * (keys.has('shift') ? 5 : 2.9));
      const measuredSpeed = dt > 0 ? moved / dt : 0;
      const animatedSpeed = Math.max(measuredSpeed, stepPulse > 0 ? pulseSpeed : 0);
      movementSpeed = THREE.MathUtils.damp(movementSpeed, animatedSpeed, animatedSpeed > movementSpeed ? 16 : 9, dt);
      if (movementSpeed < .005) movementSpeed = 0;
      stepPulse = Math.max(0, stepPulse - dt);
      facing = angleLerp(facing, desiredFacing, 1 - Math.exp(-12 * dt));
      // Smooth the orbit itself: front view travels around the person instead
      // of passing through their head on a straight camera interpolation.
      cameraYaw = angleLerp(cameraYaw, yaw, 1 - Math.exp(-9 * dt));
      framing(player, view === 'third' ? cameraYaw : yaw, restingPose);
      if (view === 'first') {
        camera.position.copy(desiredCamera); euler.set(firstPitch, yaw, 0); camera.quaternion.setFromEuler(euler);
      } else {
        camera.position.lerp(desiredCamera, 1 - Math.exp(-11 * dt));
        // Also check the smoothed boom so rotations do not cut through obstacles.
        keepCameraClear(camera.position, focus); camera.lookAt(focus);
      }
    }
  };
}
