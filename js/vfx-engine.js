import * as THREE from 'three';
import { buildOrganTubeCurve } from './tube-path.js';

/**
 * Clean Medical 3D Organ Rig & Tube-Flow Animation Engine
 * Focused purely on the 3D organ itself (zero cluttered rings/cones/ambient sparks):
 *  - Exact Geodesic Mesh-Centerline Food Bolus & Enzyme Flow running inside EVERY coil/bend
 *  - Smart Auto-Translucent Cutaway Wall when Digestion Flow is active in Realistic Mode
 *  - Subtle Peristalsis Contraction Rings hugging food boluses along the tube
 *  - Custom GLSL Fresnel Hologram & Medical X-Ray Shaders + Smooth Exploded View
 *  - Gentle organic breathing + elastic pop-in + clean hotspot pin highlight
 */

let sharedGlowTex = null;
function getGlowTexture() {
  if (sharedGlowTex) return sharedGlowTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.28, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  sharedGlowTex = new THREE.CanvasTexture(canvas);
  sharedGlowTex.needsUpdate = true;
  return sharedGlowTex;
}

/* Custom GLSL Fresnel + Scanline Hologram Shader */
function createHologramShaderMaterial(primaryColor, secondaryColor) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: primaryColor.clone() },
      uColorB: { value: secondaryColor.clone() },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        vec4 mvPosition = viewMatrix * worldPosition;
        vViewPos = -mvPosition.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      varying vec3 vWorldPos;
      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float fresnel = pow(1.0 - abs(dot(N, V)), 2.1);

        float scanWave = sin((vWorldPos.y + vWorldPos.z * 0.5) * 75.0 - uTime * 6.0);
        float scanLine = smoothstep(0.35, 0.95, scanWave * 0.5 + 0.5);
        float band = pow(0.5 + 0.5 * sin(vWorldPos.y * 8.0 - uTime * 2.2), 6.0);

        vec3 baseCol = mix(uColorA, uColorB, fresnel * 0.72 + band * 0.3);
        vec3 finalCol = baseCol * (0.45 + fresnel * 1.4 + scanLine * 0.25 + band * 0.55);
        float alpha = clamp(0.18 + fresnel * 0.76 + scanLine * 0.12 + band * 0.18, 0.0, 0.94);
        gl_FragColor = vec4(finalCol, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/* Custom GLSL Medical CT / X-Ray Edge Shader */
function createXRayShaderMaterial(xrayColor) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: xrayColor.clone() },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPosition.xyz;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec3 vNormalView;
      varying vec3 vViewPos;
      void main() {
        vec3 N = normalize(vNormalView);
        vec3 V = normalize(vViewPos);
        float rim = pow(1.0 - abs(dot(N, V)), 2.6);
        float pulse = 0.94 + 0.06 * sin(uTime * 3.0);
        vec3 col = mix(uColor, vec3(0.88, 0.97, 1.0), rim * 0.75) * pulse;
        float alpha = clamp(0.06 + rim * 0.84, 0.04, 0.9);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

export function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function normalizeModel(gltfScene, modelRotation = null) {
  const model = gltfScene.clone(true);
  const contentRoot = new THREE.Group();
  contentRoot.add(model);
  if (Array.isArray(modelRotation) && modelRotation.length === 3) {
    contentRoot.rotation.set(modelRotation[0], modelRotation[1], modelRotation[2]);
  }
  contentRoot.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(contentRoot);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 0.78 / maxDim;

  const wrapper = new THREE.Group();
  contentRoot.scale.setScalar(scale);
  contentRoot.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  wrapper.add(contentRoot);
  return { wrapper, model: contentRoot, scale };
}

/**
 * Clean Organ 3D Rig — zero distracting surrounding rings/cones/sparkles.
 */
export function createOrganVFXRig(organ) {
  const accent = new THREE.Color(organ.accentColor);
  const secondary = new THREE.Color(organ.secondaryColor || '#38bdf8');
  const xrayTint = new THREE.Color('#38bdf8');

  const holoShaderMat = createHologramShaderMaterial(accent, secondary);
  const xrayShaderMat = createXRayShaderMaterial(xrayTint);

  const root = new THREE.Group();
  const modelHolder = new THREE.Group();
  root.add(modelHolder);

  // Real Tube-Centerline Food Bolus & Enzyme Flow System
  const flowGroup = new THREE.Group();
  flowGroup.visible = false;
  let flowCurve = null;
  let flowGuideMesh = null;
  const foodBoluses = [];
  const enzymeSparks = [];

  const colFoodStart = new THREE.Color('#fb923c'); // warm golden-orange bolus
  const colFoodMid = new THREE.Color('#fde047');   // enzyme-mixed bright yellow chyme
  const colFoodEnd = new THREE.Color('#34d399');   // digested nutrient emerald
  const colMouthBolus = new THREE.Color('#fb923c');   // chewed food bolus
  const colMouthMaltose = new THREE.Color('#fde047'); // starch -> maltose golden glow
  const colMouthSaliva = new THREE.Color('#38bdf8');  // salivary amylase sparks
  const colLiverBile = new THREE.Color('#22c55e');    // fresh hepatic bile emerald
  const colLiverGold = new THREE.Color('#eab308');    // concentrated gallbladder bile gold
  const colPancreasEnzyme = new THREE.Color('#fbbf24');
  const colPancreasDuct = new THREE.Color('#38bdf8');
  const tmpColor = new THREE.Color();

  function buildDynamicTubeFlow(wrapped) {
    while (flowGroup.children.length > 0) {
      flowGroup.remove(flowGroup.children[0]);
    }
    foodBoluses.length = 0;
    enzymeSparks.length = 0;

    const extracted = buildOrganTubeCurve(organ, wrapped);
    if (!extracted || !extracted.curve) return;

    flowCurve = extracted.curve;
    const isIntestine = organ.id === 'small-intestine';
    const isPancreas = organ.id === 'pancreas';
    const isMouth = organ.id === 'mouth';
    const isLiver = organ.id === 'liver';

    // Thin subtle centerline guide inside the real tube coils / cavity / biliary ducts
    const tubeSegments = isIntestine ? 520 : 84;
    const guideRadius = isIntestine
      ? 0.0036
      : isPancreas
      ? 0.0036
      : isLiver
      ? 0.0044
      : isMouth
      ? 0.0046
      : 0.0055;
    const guideColor = isPancreas
      ? 0x38bdf8
      : isLiver
      ? 0x4ade80
      : isMouth
      ? 0xf97316
      : 0xfde047;
    const tubeGeo = new THREE.TubeGeometry(flowCurve, tubeSegments, guideRadius, 6, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: guideColor,
      transparent: true,
      opacity: isIntestine ? 0.28 : 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    flowGuideMesh = new THREE.Mesh(tubeGeo, tubeMat);
    flowGuideMesh.userData.isVFX = true;
    flowGroup.add(flowGuideMesh);

    // Organic Food Boluses / Bile Droplets / Enzyme Pulses oriented along tangent
    const bolusCount = isIntestine ? 16 : isLiver ? 7 : isPancreas ? 6 : 5;
    const bolusGeo = isIntestine
      ? new THREE.CapsuleGeometry(0.014, 0.021, 8, 14)
      : isLiver
      ? new THREE.CapsuleGeometry(0.011, 0.018, 8, 12)
      : isPancreas
      ? new THREE.SphereGeometry(0.011, 12, 12)
      : isMouth
      ? new THREE.SphereGeometry(0.02, 14, 14)
      : new THREE.SphereGeometry(0.025, 14, 14);
    if (isIntestine || isLiver) bolusGeo.rotateX(Math.PI / 2);

    const waveRingRadius = isIntestine
      ? 0.024
      : isPancreas
      ? 0.019
      : isLiver
      ? 0.022
      : isMouth
      ? 0.034
      : 0.042;
    const waveRingGeo = new THREE.TorusGeometry(waveRingRadius, 0.0028, 8, 28);
    const startCol = isPancreas
      ? colPancreasEnzyme
      : isLiver
      ? colLiverBile
      : isMouth
      ? colMouthBolus
      : colFoodStart;
    const ringCol = isPancreas
      ? 0x38bdf8
      : isLiver
      ? 0xfacc15
      : isMouth
      ? 0x38bdf8
      : 0xffffff;
    const haloScale = isIntestine
      ? 0.08
      : isPancreas
      ? 0.065
      : isLiver
      ? 0.075
      : isMouth
      ? 0.1
      : 0.12;
    const bolusSpeed = isIntestine
      ? 0.036
      : isPancreas
      ? 0.22
      : isLiver
      ? 0.21
      : isMouth
      ? 0.2
      : 0.19;

    for (let i = 0; i < bolusCount; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: startCol,
        emissive: startCol,
        emissiveIntensity: 1.15,
        roughness: 0.25,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(bolusGeo, mat);
      mesh.userData.isVFX = true;

      const haloMat = new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: startCol,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.setScalar(haloScale);
      halo.userData.isVFX = true;
      mesh.add(halo);

      const ringMat = new THREE.MeshBasicMaterial({
        color: ringCol,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(waveRingGeo, ringMat);
      ring.userData.isVFX = true;
      mesh.add(ring);

      flowGroup.add(mesh);
      foodBoluses.push({
        mesh,
        mat,
        haloMat,
        ring,
        tOffset: i / bolusCount,
        speed: bolusSpeed,
        phase: i * 1.15,
      });
    }

    // Enzyme / Saliva / Bile micro-particles streaming tightly along the pathway
    const sparkCount = isIntestine ? 56 : isLiver ? 28 : 22;
    const sparkGeo = new THREE.OctahedronGeometry(isIntestine ? 0.0064 : 0.0085, 0);
    for (let i = 0; i < sparkCount; i++) {
      const isNutrient = i % 2 === 0;
      const col = isPancreas
        ? isNutrient
          ? colPancreasDuct
          : colPancreasEnzyme
        : isLiver
        ? isNutrient
          ? colLiverGold
          : colLiverBile
        : isMouth
        ? isNutrient
          ? colMouthSaliva
          : colMouthMaltose
        : isNutrient
        ? secondary
        : colFoodMid;
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.userData.isVFX = true;
      flowGroup.add(mesh);

      enzymeSparks.push({
        mesh,
        tOffset: i / sparkCount,
        speed: isIntestine ? 0.048 : 0.27,
        wobbleR: isIntestine ? 0.007 : isPancreas ? 0.0065 : isLiver ? 0.01 : isMouth ? 0.016 : 0.018,
        phase: i * 1.9,
      });
    }
  }

  // Minimal Clean Hotspot Surface Marker (tiny glowing pin only when selected)
  const reticleGroup = new THREE.Group();
  reticleGroup.visible = false;
  const reticleCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.016, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  const reticleHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color: accent,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  reticleHalo.scale.setScalar(0.11);
  reticleGroup.add(reticleCore, reticleHalo);

  // State tracked for meshes & visual modes
  const meshEntries = [];
  let wrappedModel = null;
  let visualMode = 'realistic';
  let explodeFactor = 0;
  let highlightedMeshName = null;
  let digestionActive = false;

  function makeGlassMaterial(mat, opacity) {
    if (Array.isArray(mat)) {
      return mat.map((m) => makeGlassMaterial(m, opacity));
    }
    const g = mat.clone();
    g.transparent = true;
    g.opacity = opacity;
    g.depthWrite = false;
    g.side = THREE.DoubleSide;
    return g;
  }

  function attachNormalizedModel(wrapped, modelScale = 1) {
    wrappedModel = wrapped;
    wrapped.rotation.x = Math.PI / 2;
    modelHolder.add(wrapped);
    wrapped.add(flowGroup);
    wrapped.add(reticleGroup);

    const offsets = organ.explodeOffsets || {};
    const glassOpacity = organ.glassOpacity ?? 0.36;
    const invScale = modelScale > 0 ? 1 / modelScale : 1;

    wrapped.updateWorldMatrix(true, true);
    const invWrapped = new THREE.Matrix4().copy(wrapped.matrixWorld).invert();

    wrapped.traverse((obj) => {
      if (!obj.isMesh || obj.userData.isVFX) return;
      const origMat = obj.material;
      const matName = Array.isArray(origMat) ? '' : origMat?.name || '';
      const parentName = obj.parent?.name || '';
      const keyName = obj.name || matName || parentName || '';

      // Smooth semi-translucent glass-flesh cutaway for Digestion Flow mode (supports per-mesh opacity)
      const meshOpacity =
        organ.meshGlassOpacity?.[obj.name] ??
        organ.meshGlassOpacity?.[matName] ??
        organ.meshGlassOpacity?.[parentName] ??
        glassOpacity;
      const glassMat = meshOpacity >= 0.99 ? origMat : makeGlassMaterial(origMat, meshOpacity);

      const wireMat = new THREE.MeshBasicMaterial({
        color: secondary,
        wireframe: true,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const wireMesh = new THREE.Mesh(obj.geometry, wireMat);
      wireMesh.visible = false;
      wireMesh.userData.isVFX = true;
      obj.add(wireMesh);

      const rawOffset = offsets[obj.name] || offsets[matName] || offsets[parentName] || null;
      let explodeVec = new THREE.Vector3();
      if (rawOffset) {
        if (obj.parent) {
          obj.parent.updateWorldMatrix(true, false);
          const parentInWrapped = new THREE.Matrix4().multiplyMatrices(invWrapped, obj.parent.matrixWorld);
          const wrappedToParent = parentInWrapped.clone().invert();
          const linear3 = new THREE.Matrix3().setFromMatrix4(wrappedToParent);
          explodeVec = rawOffset.clone().applyMatrix3(linear3);
        } else {
          explodeVec = rawOffset.clone().multiplyScalar(invScale);
        }
      }

      meshEntries.push({
        mesh: obj,
        name: keyName,
        matName,
        parentName,
        origMat,
        glassMat,
        wireMesh,
        basePos: obj.position.clone(),
        explodeVec,
      });
    });

    buildDynamicTubeFlow(wrapped);
    refreshMaterials();
  }

  function refreshMaterials() {
    meshEntries.forEach((entry) => {
      if (visualMode === 'hologram') {
        entry.mesh.material = holoShaderMat;
        entry.wireMesh.visible = true;
      } else if (visualMode === 'xray') {
        entry.mesh.material = xrayShaderMat;
        entry.wireMesh.visible = false;
      } else if (visualMode === 'realistic' && digestionActive) {
        entry.mesh.material = entry.glassMat;
        entry.wireMesh.visible = false;
      } else {
        entry.mesh.material = entry.origMat;
        entry.wireMesh.visible = false;
      }
    });
  }

  function applyVisualMode(mode) {
    visualMode = mode;
    refreshMaterials();
  }

  function setDigestionActive(active) {
    digestionActive = active;
    flowGroup.visible = active;
    refreshMaterials();
  }

  // Kept as a lightweight no-op hook for compatibility with pop replay / tour calls
  function triggerScanBurst() {}

  function highlightHotspot(annotation) {
    if (!annotation) {
      highlightedMeshName = null;
      reticleGroup.visible = false;
      return;
    }
    highlightedMeshName = annotation.meshName || null;
    reticleGroup.position.copy(annotation.localPos);
    reticleGroup.visible = true;
  }

  const tmpPos = new THREE.Vector3();
  const tmpTan = new THREE.Vector3();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const upVec = new THREE.Vector3(0, 1, 0);
  const altUp = new THREE.Vector3(1, 0, 0);
  const sideVec = new THREE.Vector3();
  const binormVec = new THREE.Vector3();

  function update(dt, elapsed, { isVisible, autoSpin, popProgress }) {
    if (!isVisible) return;

    holoShaderMat.uniforms.uTime.value = elapsed;
    xrayShaderMat.uniforms.uTime.value = elapsed;

    // 1. Pop-in Elastic Scale + Subtle Organic Peristalsis Breathing
    const popScale = Math.max(0.001, easeOutBack(popProgress));
    const breathAmp = digestionActive ? 0.024 : 0.012;
    const breathSpeed = digestionActive ? 4.0 : 2.1;
    const breathWave = Math.sin(elapsed * breathSpeed);
    const sx = popScale * (1 + breathWave * breathAmp);
    const sy = popScale * (1 - breathWave * breathAmp * 0.65);
    const sz = popScale * (1 + Math.cos(elapsed * breathSpeed) * breathAmp * 0.5);
    modelHolder.scale.set(sx, sy, sz);

    // Subtle calm float
    modelHolder.position.z = Math.sin(elapsed * 1.9) * 0.012;

    if (autoSpin) {
      modelHolder.rotation.z += dt * 0.65;
    }

    // 2. Smooth Explode Transition & Selected Sub-Mesh Glow
    const targetExplode = visualMode === 'explode' ? 1 : 0;
    explodeFactor += (targetExplode - explodeFactor) * Math.min(1, dt * 6.5);

    const hasMultiPart = meshEntries.length > 1;
    meshEntries.forEach((entry) => {
      if (hasMultiPart && entry.explodeVec.lengthSq() > 0) {
        entry.mesh.position.copy(entry.basePos).addScaledVector(entry.explodeVec, explodeFactor);
      }

      const activeMat = entry.mesh.material;
      if ((visualMode === 'realistic' || visualMode === 'explode') && activeMat && !Array.isArray(activeMat) && 'emissive' in activeMat) {
        const isHit =
          highlightedMeshName &&
          (entry.name === highlightedMeshName ||
            entry.matName === highlightedMeshName ||
            entry.parentName === highlightedMeshName);
        if (isHit) {
          activeMat.emissive.copy(accent);
          activeMat.emissiveIntensity = 0.25 + Math.sin(elapsed * 4.5) * 0.14;
        } else {
          activeMat.emissiveIntensity *= 0.88;
        }
      }
    });

    // 3. Tube-Centerline Food Bolus, Bile & Enzyme Flow Animation
    if (digestionActive && flowCurve) {
      if (flowGuideMesh) {
        flowGuideMesh.visible = explodeFactor < 0.15;
      }

      const isPancreas = organ.id === 'pancreas';
      const isLiver = organ.id === 'liver';
      const isMouth = organ.id === 'mouth';

      foodBoluses.forEach((b) => {
        const t = (elapsed * b.speed + b.tOffset) % 1;
        flowCurve.getPointAt(t, tmpPos);
        flowCurve.getTangentAt(t, tmpTan).normalize();

        b.mesh.position.copy(tmpPos);
        if (tmpTan.z < -0.9995) {
          b.mesh.quaternion.setFromAxisAngle(upVec, Math.PI);
        } else {
          b.mesh.quaternion.setFromUnitVectors(zAxis, tmpTan);
        }

        if (isPancreas) {
          tmpColor.copy(colPancreasEnzyme).lerp(colPancreasDuct, t * 0.65);
        } else if (isLiver) {
          tmpColor.copy(colLiverBile).lerp(colLiverGold, t * 0.85);
        } else if (isMouth) {
          tmpColor.copy(colMouthBolus).lerp(colMouthMaltose, t * 0.9);
        } else if (t < 0.5) {
          tmpColor.copy(colFoodStart).lerp(colFoodMid, t * 2);
        } else {
          tmpColor.copy(colFoodMid).lerp(colFoodEnd, (t - 0.5) * 2);
        }
        b.mat.color.copy(tmpColor);
        b.mat.emissive.copy(tmpColor);
        b.haloMat.color.copy(tmpColor);

        const edgeFade = Math.min(1, t * 14) * Math.min(1, (1 - t) * 14);
        const digestShrink = isPancreas || isLiver ? 1 : 1.08 - t * 0.32;
        const pulse = 1 + Math.sin(elapsed * 6 + b.phase) * 0.08;
        b.mesh.scale.setScalar(Math.max(0.001, edgeFade * digestShrink * pulse));

        const ringPulseWave = 0.92 + Math.sin(elapsed * 7.5 + b.phase) * 0.16;
        b.ring.scale.setScalar(ringPulseWave);
      });

      enzymeSparks.forEach((s) => {
        const t = (elapsed * s.speed + s.tOffset) % 1;
        flowCurve.getPointAt(t, tmpPos);
        flowCurve.getTangentAt(t, tmpTan);

        const refUp = Math.abs(tmpTan.y) > 0.9 ? altUp : upVec;
        sideVec.crossVectors(tmpTan, refUp).normalize();
        binormVec.crossVectors(tmpTan, sideVec).normalize();

        const ang = elapsed * 5.0 + s.phase;
        const rx = Math.cos(ang) * s.wobbleR;
        const ry = Math.sin(ang) * s.wobbleR;

        s.mesh.position
          .copy(tmpPos)
          .addScaledVector(sideVec, rx)
          .addScaledVector(binormVec, ry);
        s.mesh.rotation.x = elapsed * 3.0;
        s.mesh.rotation.y = elapsed * 2.4;

        const edgeFade = Math.min(1, t * 16) * Math.min(1, (1 - t) * 16);
        s.mesh.scale.setScalar(Math.max(0.001, edgeFade * (0.85 + Math.sin(elapsed * 7 + s.phase) * 0.22)));
      });
    }

    // 4. Subtle Hotspot Halo Pulse
    if (reticleGroup.visible) {
      const rp = 0.95 + Math.sin(elapsed * 5) * 0.18;
      reticleHalo.scale.setScalar(0.11 * rp);
    }
  }

  return {
    root,
    modelHolder,
    attachNormalizedModel,
    applyVisualMode,
    setDigestionActive,
    triggerScanBurst,
    highlightHotspot,
    update,
    getWrappedModel: () => wrappedModel,
  };
}
