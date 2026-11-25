import * as THREE from 'three';
import { buildOrganTubeCurve } from './tube-path.js';

/**
 * Clean Medical 3D Organ Rig & Tube-Flow + Side-by-Side Explode Lineup Engine
 * Features:
 *  - Exact Geodesic Mesh-Centerline Food Bolus, Bile & Enzyme Flow inside real organ coils/ducts
 *  - Smart Auto-Translucent Cutaway Wall when Digestion Flow is active in Realistic Mode
 *  - Two-Stage Explode -> Side-by-Side Horizontal Lineup Animation:
 *      Phase 1: Parts separate outward from the assembled organ
 *      Phase 2: Parts glide into a clean side-by-side horizontal gallery with balanced showcase sizing
 *      Carousel Focus: Smoothly slides the lineup along X to center any selected part (works in 3D Lab & AR!)
 *      In-Place Turntable: When Auto-Spin is on during Explode, each part rotates cleanly around its OWN center!
 *  - Custom GLSL Fresnel Hologram & Medical X-Ray Shaders
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

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutCubic(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
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
 * Clean Organ 3D Rig with Two-Stage Explode -> Side-by-Side Lineup & Mobile Carousel Focus.
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

  const colFoodStart = new THREE.Color('#fb923c');
  const colFoodMid = new THREE.Color('#fde047');
  const colFoodEnd = new THREE.Color('#34d399');
  const colMouthBolus = new THREE.Color('#fb923c');
  const colMouthMaltose = new THREE.Color('#fde047');
  const colMouthSaliva = new THREE.Color('#38bdf8');
  const colLiverBile = new THREE.Color('#22c55e');
  const colLiverGold = new THREE.Color('#eab308');
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

  // Minimal Clean Hotspot Surface Marker (marked isVFX so Explode never treats it as an organ part!)
  const reticleGroup = new THREE.Group();
  reticleGroup.visible = false;
  reticleGroup.userData.isVFX = true;
  const reticleCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.016, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  reticleCore.userData.isVFX = true;
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
  reticleHalo.userData.isVFX = true;
  reticleGroup.add(reticleCore, reticleHalo);

  // State tracked for meshes, parts & explode lineup
  const meshEntries = [];
  const partEntries = []; // { index, meta, pivot, entries, assembledPos, burstPos, lineupPos, gridPos, lineupScale, curScale, curRotY }
  let wrappedModel = null;
  let visualMode = 'realistic';
  let explodeProgress = 0; // 0 = assembled, 0..0.34 = burst apart, 0.34..1 = side-by-side lineup
  let focusedPartIndex = null; // null = Overview All, 0..N-1 = Centered Focused Part
  let lineupShiftX = 0;
  let highlightedMeshName = null;
  let digestionActive = false;

  const SLOT_SPACING = 0.45;

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

  function attachNormalizedModel(wrapped) {
    wrappedModel = wrapped;
    wrapped.rotation.x = Math.PI / 2;
    modelHolder.add(wrapped);
    wrapped.add(flowGroup);
    wrapped.add(reticleGroup);

    const offsets = organ.explodeOffsets || {};
    const glassOpacity = organ.glassOpacity ?? 0.36;

    // 1. Build geodesic flow first while meshes are in pristine assembled state
    buildDynamicTubeFlow(wrapped);

    // 2. Collect all real meshes & compute their materials
    const collectedMeshes = [];
    wrapped.traverse((obj) => {
      if (!obj.isMesh || obj.userData.isVFX) return;
      const origMat = obj.material;
      const matName = Array.isArray(origMat) ? '' : origMat?.name || '';
      const parentName = obj.parent?.name || '';
      const keyName = obj.name || matName || parentName || '';

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

      const entry = {
        mesh: obj,
        name: keyName,
        matName,
        parentName,
        origMat,
        glassMat,
        wireMesh,
        partIndex: 0,
      };
      meshEntries.push(entry);
      collectedMeshes.push(entry);
    });

    // 3. Build Per-Part Pivot Groups directly under `wrapped` (preserves exact assembled world transform!)
    wrapped.updateWorldMatrix(true, true);
    const invWrapped = new THREE.Matrix4().copy(wrapped.matrixWorld).invert();

    const partDefs =
      Array.isArray(organ.explodeParts) && organ.explodeParts.length > 0
        ? organ.explodeParts
        : collectedMeshes.map((e, idx) => ({
            id: e.name || `part-${idx}`,
            title: e.name || `ส่วนที่ ${idx + 1}`,
            en: e.name || '',
            desc: '',
            meshes: [e.name],
          }));

    const assigned = new Set();
    const matchedGroups = [];

    partDefs.forEach((def) => {
      const targetNames = new Set(def.meshes || []);
      const groupEntries = collectedMeshes.filter(
        (e) =>
          !assigned.has(e) &&
          (targetNames.has(e.mesh.name) || targetNames.has(e.matName) || targetNames.has(e.parentName))
      );
      if (groupEntries.length > 0) {
        groupEntries.forEach((e) => assigned.add(e));
        matchedGroups.push({ meta: def, entries: groupEntries });
      }
    });

    // Catch any unmatched mesh cleanly into the last or its own group
    collectedMeshes.forEach((e) => {
      if (!assigned.has(e)) {
        assigned.add(e);
        matchedGroups.push({
          meta: { id: e.name, title: e.name, en: e.name, desc: '', meshes: [e.name] },
          entries: [e],
        });
      }
    });

    const numParts = matchedGroups.length;
    const tmpBox = new THREE.Box3();
    const tmpPt = new THREE.Vector3();

    matchedGroups.forEach((grp, idx) => {
      // Compute combined bounding box of this part's meshes in `wrapped` local space
      tmpBox.makeEmpty();
      grp.entries.forEach((e) => {
        e.mesh.updateWorldMatrix(true, false);
        const toWrapped = new THREE.Matrix4().multiplyMatrices(invWrapped, e.mesh.matrixWorld);
        const posAttr = e.mesh.geometry.attributes.position;
        for (let vi = 0; vi < posAttr.count; vi++) {
          tmpPt.fromBufferAttribute(posAttr, vi).applyMatrix4(toWrapped);
          tmpBox.expandByPoint(tmpPt);
        }
      });

      const partCenter = tmpBox.isEmpty() ? new THREE.Vector3() : tmpBox.getCenter(new THREE.Vector3());
      const partSize = tmpBox.isEmpty() ? new THREE.Vector3(0.3, 0.3, 0.3) : tmpBox.getSize(new THREE.Vector3());
      const partMaxDim = Math.max(partSize.x, partSize.y, partSize.z) || 0.2;

      // Create centered Pivot Group inside `wrapped` and attach meshes preserving exact world transform
      const pivot = new THREE.Group();
      pivot.name = `explode-part-${idx}`;
      pivot.position.copy(partCenter);
      wrapped.add(pivot);
      pivot.updateWorldMatrix(true, false);

      grp.entries.forEach((e) => {
        e.partIndex = idx;
        e.mesh.userData.explodePartIndex = idx;
        pivot.attach(e.mesh);
      });

      // Phase 1 Burst target (uses curated explodeOffsets if available, or radial outward burst)
      const firstEntry = grp.entries[0];
      const rawOff =
        offsets[firstEntry.mesh.name] ||
        offsets[firstEntry.matName] ||
        offsets[firstEntry.parentName] ||
        null;
      const burstVec = rawOff
        ? rawOff.clone().multiplyScalar(1.35)
        : partCenter.clone().normalize().multiplyScalar(0.18);
      if (burstVec.lengthSq() < 0.001 && numParts > 1) {
        burstVec.set((idx - (numParts - 1) / 2) * 0.14, 0.08, 0.06);
      }
      const burstPos = partCenter.clone().add(burstVec);

      // Phase 2 Side-by-Side Lineup target (horizontal row along X, balanced showcase sizing!)
      const slotX = numParts > 1 ? (idx - (numParts - 1) / 2) * SLOT_SPACING : 0;
      const lineupPos = new THREE.Vector3(slotX, 0.02, 0);

      // Compact 2-Row Portrait Shelf target (used ONLY in mobile portrait 'ดูรวม' overview when >= 5 parts)
      let gridPos = lineupPos.clone();
      if (numParts >= 5) {
        const topCount = Math.ceil(numParts / 2);
        const botCount = numParts - topCount;
        const isTop = idx < topCount;
        const col = isTop ? idx : idx - topCount;
        const rowLen = isTop ? topCount : botCount;
        const gx = (col - (rowLen - 1) / 2) * 0.44;
        const gy = isTop ? 0.27 : -0.23;
        gridPos = new THREE.Vector3(gx, gy, 0);
      }

      const lineupScale =
        numParts > 1 ? THREE.MathUtils.clamp(0.36 / partMaxDim, 0.52, 2.05) : 1.0;

      partEntries.push({
        index: idx,
        meta: grp.meta,
        pivot,
        entries: grp.entries,
        assembledPos: partCenter.clone(),
        burstPos,
        lineupPos,
        gridPos,
        lineupScale,
        curScale: 1,
        curRotY: 0,
      });
    });

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
    if (mode !== 'explode') {
      focusedPartIndex = null;
    }
    refreshMaterials();
  }

  function setFocusedExplodePart(partIdx) {
    if (partIdx === null || partIdx === undefined || partEntries.length <= 1) {
      focusedPartIndex = null;
    } else {
      focusedPartIndex = Math.max(0, Math.min(partEntries.length - 1, partIdx));
    }
  }

  function getExplodeParts() {
    return partEntries.map((p) => p.meta);
  }

  function getLineupHalfWidth(isPortrait = false) {
    if (partEntries.length <= 1) return 0.4;
    if (isPortrait && partEntries.length >= 5) {
      const topCount = Math.ceil(partEntries.length / 2);
      return ((topCount - 1) * 0.44) / 2 + 0.24;
    }
    return ((partEntries.length - 1) * SLOT_SPACING) / 2 + 0.24;
  }

  function setDigestionActive(active) {
    digestionActive = active;
    flowGroup.visible = active && explodeProgress < 0.08;
    refreshMaterials();
  }

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

    const isExploding = visualMode === 'explode';
    const hasMultiPart = partEntries.length > 1;

    // 1. Advance Two-Stage Explode Progress (0 -> 1 over ~1.05s; smooth faster reassembly 1 -> 0)
    if (isExploding && hasMultiPart) {
      explodeProgress = Math.min(1, explodeProgress + dt * 0.96);
    } else {
      explodeProgress = Math.max(0, explodeProgress - dt * 1.8);
    }

    // 2. Pop-in Elastic Scale + Organic Peristalsis Breathing (calmed cleanly during Explode Lineup)
    const popScale = Math.max(0.001, easeOutBack(popProgress));
    const breathScale = 1 - Math.min(1, explodeProgress * 2.5);
    const breathAmp = (digestionActive ? 0.024 : 0.012) * breathScale;
    const breathSpeed = digestionActive ? 4.0 : 2.1;
    const breathWave = Math.sin(elapsed * breathSpeed);
    const sx = popScale * (1 + breathWave * breathAmp);
    const sy = popScale * (1 - breathWave * breathAmp * 0.65);
    const sz = popScale * (1 + Math.cos(elapsed * breathSpeed) * breathAmp * 0.5);
    modelHolder.scale.set(sx, sy, sz);

    modelHolder.position.z = Math.sin(elapsed * 1.9) * 0.012 * (0.4 + 0.6 * breathScale);

    // Rotation control:
    //  - Normal modes: spin whole organ around vertical axis (local Z of modelHolder)
    //  - Explode Lineup: smoothly unwind whole row to face front (0 rad) so parts never swing off-screen,
    //    while each lined-up part spins cleanly in-place around its OWN vertical center!
    if (explodeProgress > 0.02 && hasMultiPart) {
      const wrappedAngle = Math.atan2(Math.sin(modelHolder.rotation.z), Math.cos(modelHolder.rotation.z));
      modelHolder.rotation.z = wrappedAngle * Math.max(0, 1 - dt * 7.5);
    } else if (autoSpin) {
      modelHolder.rotation.z += dt * 0.65;
    }

    // 3. Smooth Horizontal Carousel Shift (centers focused part right in front of mobile/AR view!)
    const targetShiftX =
      isExploding && hasMultiPart && focusedPartIndex !== null && partEntries[focusedPartIndex]
        ? -partEntries[focusedPartIndex].lineupPos.x
        : 0;
    lineupShiftX += (targetShiftX - lineupShiftX) * Math.min(1, dt * 7.5);

    // 4. Two-Stage Part Positions, Balanced Scaling, Focus Pop & Individual Turntable Spin
    const phase1Split = 0.34;
    let p1 = 0;
    let p2 = 0;
    if (explodeProgress <= phase1Split) {
      p1 = easeOutCubic(explodeProgress / phase1Split);
      p2 = 0;
    } else {
      p1 = 1;
      p2 = easeInOutCubic((explodeProgress - phase1Split) / (1 - phase1Split));
    }

    const usePortraitGrid =
      isExploding &&
      hasMultiPart &&
      focusedPartIndex === null &&
      partEntries.length >= 5 &&
      window.innerWidth < window.innerHeight * 0.82;

    const tmpTargetPos = new THREE.Vector3();

    partEntries.forEach((part) => {
      const isFocused = isExploding && hasMultiPart && focusedPartIndex === part.index;
      const hasFocusOther = isExploding && hasMultiPart && focusedPartIndex !== null && !isFocused;

      if (hasMultiPart && explodeProgress > 0.001) {
        if (p2 <= 0) {
          // Stage 1: Burst outward from assembled organ
          part.pivot.position.lerpVectors(part.assembledPos, part.burstPos, p1);
        } else {
          // Stage 2: Glide smoothly from burst into side-by-side lineup (or compact 2-row shelf on portrait mobile overview!)
          const destBase = usePortraitGrid ? part.gridPos : part.lineupPos;
          tmpTargetPos.lerpVectors(part.burstPos, destBase, p2);
          if (!usePortraitGrid) {
            tmpTargetPos.x += lineupShiftX * p2;
          }
          if (isFocused) {
            tmpTargetPos.z += 0.08 * p2;
            tmpTargetPos.y += 0.02 * p2;
          }
          // Smoothly blend between overview grid <-> single-row carousel!
          if (explodeProgress >= 0.99) {
            part.pivot.position.lerp(tmpTargetPos, Math.min(1, dt * 9.5));
          } else {
            part.pivot.position.copy(tmpTargetPos);
          }
        }

        // Smooth balanced showcase scale + focused pop-up
        const focusMult = isFocused ? 1.3 : hasFocusOther ? 0.78 : usePortraitGrid ? 0.92 : 1.0;
        const targetScale = THREE.MathUtils.lerp(1.0, part.lineupScale * focusMult, p2);
        part.curScale += (targetScale - part.curScale) * Math.min(1, dt * 8.5);
        part.pivot.scale.setScalar(part.curScale);

        // In-place turntable spin when lineup is active & autoSpin is ON
        if (autoSpin && p2 > 0.25) {
          part.curRotY += dt * (isFocused ? 0.78 : 0.45);
          part.pivot.rotation.y = part.curRotY;
        } else if (!isExploding) {
          const a = Math.atan2(Math.sin(part.curRotY), Math.cos(part.curRotY));
          part.curRotY = a * Math.max(0, 1 - dt * 10);
          part.pivot.rotation.y = part.curRotY;
        }
      } else {
        part.pivot.position.copy(part.assembledPos);
        part.curScale = 1;
        part.pivot.scale.setScalar(1);
        part.curRotY = 0;
        part.pivot.rotation.y = 0;
      }

      // Emissive highlight for either Hotspot selection (normal) OR Focused Part (explode carousel)
      part.entries.forEach((entry) => {
        const activeMat = entry.mesh.material;
        if (
          (visualMode === 'realistic' || visualMode === 'explode') &&
          activeMat &&
          !Array.isArray(activeMat) &&
          'emissive' in activeMat
        ) {
          const isHotspotHit =
            !isExploding &&
            highlightedMeshName &&
            (entry.name === highlightedMeshName ||
              entry.matName === highlightedMeshName ||
              entry.parentName === highlightedMeshName);
          if (isHotspotHit) {
            activeMat.emissive.copy(accent);
            activeMat.emissiveIntensity = 0.25 + Math.sin(elapsed * 4.5) * 0.14;
          } else if (isFocused) {
            activeMat.emissive.copy(accent);
            activeMat.emissiveIntensity = 0.16 + Math.sin(elapsed * 3.8) * 0.07;
          } else {
            activeMat.emissiveIntensity *= 0.88;
          }
        }
      });
    });

    // 5. Tube-Centerline Food Bolus, Bile & Enzyme Flow (cleanly paused while exploded into lineup)
    const showFlowNow = digestionActive && flowCurve && explodeProgress < 0.08;
    flowGroup.visible = Boolean(showFlowNow);
    if (showFlowNow) {
      if (flowGuideMesh) {
        flowGuideMesh.visible = true;
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

    // 6. Subtle Hotspot Halo Pulse (hidden while exploded into lineup)
    if (reticleGroup.visible && !isExploding) {
      const rp = 0.95 + Math.sin(elapsed * 5) * 0.18;
      reticleHalo.scale.setScalar(0.11 * rp);
    }
  }

  return {
    root,
    modelHolder,
    attachNormalizedModel,
    applyVisualMode,
    setFocusedExplodePart,
    getExplodeParts,
    getLineupHalfWidth,
    setDigestionActive,
    triggerScanBurst,
    highlightHotspot,
    update,
    getWrappedModel: () => wrappedModel,
  };
}
