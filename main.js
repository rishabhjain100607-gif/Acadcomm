import RAPIER from '@dimforge/rapier3d-compat'
import * as THREE from 'three'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { TransmissionMaterial } from './TransmissionMaterial.js'
import { FixedTimestep } from './FixedTimestep.js'

await RAPIER.init()

const heroRoot = document.querySelector('#hero-scene')
const resourcesRoot = document.querySelector('#resources-scene')
const feedbackRoot = document.querySelector('#feedback-scene')
const resourcesList = document.querySelector('#resources-list')
const feedbackForm = document.querySelector('#feedback-form')
const anonymousToggle = document.querySelector('#feedback-anonymous')
const feedbackName = document.querySelector('#feedback-name')
const feedbackEmail = document.querySelector('#feedback-email')
const feedbackMessage = document.querySelector('#feedback-message')
const feedbackStatus = document.querySelector('#feedback-status')

const resourceTitles = [
  'Academic Calendar',
  'IPM Intranet',
  'IPM Manual',
  'Sample SPC Resumes',
  'Sample Corp_Intern Resumes',
  'UG Scholarships',
]

populateResourceList(resourcesList, resourceTitles)

const font = await loadFont()
const heroSection = createHeroScene(heroRoot, font)
const resourcesSection = createResourcesScene(resourcesRoot, resourceTitles)
const feedbackSection = createFeedbackScene(feedbackRoot, font)
const sections = [heroSection, resourcesSection, feedbackSection]

for (const link of document.querySelectorAll('a[href^="#"]')) {
  link.addEventListener('click', (event) => {
    const targetSelector = link.getAttribute('href')
    const target = document.querySelector(targetSelector)
    if (!target) return
    event.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function syncAnonymousMode() {
  const isAnonymous = anonymousToggle.checked
  feedbackName.disabled = isAnonymous
  feedbackEmail.disabled = isAnonymous
  feedbackName.placeholder = isAnonymous ? 'Hidden while anonymous is enabled' : 'Your name'
  feedbackEmail.placeholder = isAnonymous ? 'Hidden while anonymous is enabled' : 'you@example.com'
}

anonymousToggle.addEventListener('change', syncAnonymousMode)
syncAnonymousMode()

feedbackForm.addEventListener('submit', (event) => {
  event.preventDefault()

  const message = feedbackMessage.value.trim()
  if (!message) {
    feedbackStatus.textContent = 'Please add a message before submitting.'
    return
  }

  const payload = {
    submittedAt: new Date().toISOString(),
    anonymous: anonymousToggle.checked,
    name: anonymousToggle.checked ? '' : feedbackName.value.trim(),
    email: anonymousToggle.checked ? '' : feedbackEmail.value.trim(),
    category: feedbackForm.elements.category.value,
    message,
  }

  const saved = JSON.parse(window.localStorage.getItem('ipm-acadcomm-feedback') ?? '[]')
  saved.push(payload)
  window.localStorage.setItem('ipm-acadcomm-feedback', JSON.stringify(saved))

  feedbackForm.reset()
  syncAnonymousMode()
  feedbackStatus.textContent = 'Thanks. Your feedback has been saved in this browser preview.'
})

function resizeAll() {
  for (const section of sections) section.resize()
}

window.addEventListener('resize', resizeAll)
resizeAll()

function animate(timestamp) {
  for (const section of sections) section.render(timestamp)
  window.requestAnimationFrame(animate)
}

window.requestAnimationFrame(animate)

function populateResourceList(container, titles) {
  const fragment = document.createDocumentFragment()
  titles.forEach((title, index) => {
    const item = document.createElement('div')
    item.className = 'resource-chip'
    item.innerHTML = `
      <span class="resource-chip__index">${String(index + 1).padStart(2, '0')}</span>
      <span class="resource-chip__title">${title}</span>
    `
    fragment.append(item)
  })
  container.replaceChildren(fragment)
}

function loadFont() {
  const loader = new FontLoader()
  return new Promise((resolve, reject) => {
    loader.load(
      'https://cdn.jsdelivr.net/npm/three@0.183.2/examples/fonts/helvetiker_bold.typeface.json',
      resolve,
      undefined,
      reject,
    )
  })
}

function createRenderer(root, exposure = 1.12) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.AgXToneMapping
  renderer.toneMappingExposure = exposure
  renderer.outputColorSpace = THREE.SRGBColorSpace
  root.append(renderer.domElement)
  return renderer
}

function createGlowTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,0.96)')
  gradient.addColorStop(0.22, 'rgba(255,245,232,0.56)')
  gradient.addColorStop(0.5, 'rgba(255,235,210,0.18)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createLightformerEnvMap(renderer, variant) {
  const envScene = new THREE.Scene()
  const group = new THREE.Group()
  group.rotation.set(variant === 'hero' ? -Math.PI / 4 : -Math.PI / 5, 0.1, variant === 'hero' ? 0.8 : 0.4)
  envScene.add(group)

  const diskGeo = new THREE.CircleGeometry(1, 64)
  const planeGeo = new THREE.PlaneGeometry(1, 1)
  const materialFor = (intensity) =>
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(intensity, intensity, intensity),
      side: THREE.DoubleSide,
    })

  const primary = new THREE.Mesh(diskGeo, materialFor(variant === 'hero' ? 4 : 3.2))
  primary.rotation.x = Math.PI / 2
  primary.position.set(variant === 'hero' ? 1.8 : 0.6, variant === 'hero' ? 7.2 : 6.2, -7)
  primary.scale.setScalar(variant === 'hero' ? 2.8 : 3.6)
  group.add(primary)

  const secondary = new THREE.Mesh(diskGeo, materialFor(variant === 'hero' ? 2.8 : 2.4))
  secondary.rotation.y = Math.PI / 2
  secondary.position.set(variant === 'hero' ? -5.8 : -4.8, variant === 'hero' ? 1.8 : 2.2, -1.8)
  secondary.scale.setScalar(variant === 'hero' ? 2.2 : 2.4)
  group.add(secondary)

  const strip = new THREE.Mesh(planeGeo, materialFor(variant === 'hero' ? 2.2 : 1.8))
  strip.position.set(0, variant === 'hero' ? -4.5 : -3.8, -3.5)
  strip.scale.set(variant === 'hero' ? 12 : 10, 0.7, 1)
  group.add(strip)

  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  const envMap = pmremGenerator.fromScene(envScene, 0.05, 0.1, 100).texture
  pmremGenerator.dispose()
  envScene.clear()
  return envMap
}

function updatePointer(event, root, pointer) {
  const rect = root.getBoundingClientRect()
  pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
}

function isElementVisible(element) {
  const rect = element.getBoundingClientRect()
  return rect.bottom > -rect.height * 0.25 && rect.top < window.innerHeight * 1.25
}

function createHeroScene(root, font) {
  const renderer = createRenderer(root, 1.16)
  const scene = new THREE.Scene()
  const world = new RAPIER.World(new RAPIER.Vector3(0, 0, 0))

  const params = {
    color: '#ffffff',
    transmission: 1,
    thickness: 1.2,
    roughness: 0.08,
    ior: 1.5,
    attenuationColor: '#ffffff',
    attenuationDistance: 1.2,
    envMapIntensity: 1.4,
    iridescence: 0.35,
    iridescenceIOR: 1.2,
    iridescenceThicknessMin: 100,
    iridescenceThicknessMax: 500,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    specularIntensity: 1.5,
    specularColor: '#ffffff',
    mouseBallRadius: 1.25,
    wanderStrength: 0.28,
    wanderSpeed: 0.35,
    attractionStrength: 12,
    torqueStrength: 0.16,
    linearDamping: 1.65,
    angularDamping: 4.4,
    friction: 0.4,
    restitution: 0.72,
    ambientIntensity: 2.4,
    keyLightIntensity: 140,
    rimLightIntensity: 50,
  }

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  const ambientLight = new THREE.AmbientLight(0xffffff, params.ambientIntensity)
  const keyLight = new THREE.SpotLight(0xffffff, params.keyLightIntensity, 0, Math.PI / 4, 0.6, 1.5)
  const rimLight = new THREE.PointLight(0xd4f4ff, params.rimLightIntensity, 25, 2)
  keyLight.position.set(6, 10, 10)
  rimLight.position.set(-6, -2, 6)
  scene.add(ambientLight, keyLight, rimLight)
  scene.environment = createLightformerEnvMap(renderer, 'hero')

  const centerGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  )
  centerGlow.position.set(0, 0, -1.2)
  scene.add(centerGlow)

  const glassMaterial = new TransmissionMaterial(params)
  const letters = ['A', 'C', 'A', 'D']
  const letterSize = 1.18
  const letterDepth = 0.4
  const letterSpacing = 1.35
  const startX = -((letters.length - 1) * letterSpacing) / 2

  const letterGeometries = letters.map((char) => {
    const geometry = new TextGeometry(char, {
      font,
      size: letterSize,
      depth: letterDepth,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.03,
      bevelSegments: 4,
    })
    geometry.computeBoundingBox()
    const bounds = geometry.boundingBox
    geometry.translate(
      -((bounds.max.x + bounds.min.x) / 2),
      -((bounds.max.y + bounds.min.y) / 2),
      -((bounds.max.z + bounds.min.z) / 2),
    )
    geometry.computeBoundingBox()
    return geometry
  })

  const letterHalfExtents = letterGeometries.map((geometry) => {
    const bounds = geometry.boundingBox
    return {
      hx: (bounds.max.x - bounds.min.x) / 2,
      hy: (bounds.max.y - bounds.min.y) / 2,
      hz: (bounds.max.z - bounds.min.z) / 2,
    }
  })

  const cubeBodies = letterGeometries.map((geometry, index) => {
    const x = startX + index * letterSpacing
    const mesh = glassMaterial.createMesh(geometry)
    mesh.position.set(x, 0, 0)

    const edgeLines = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
      }),
    )
    mesh.add(edgeLines)
    scene.add(mesh)

    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, 0, 0)
      .setLinearDamping(params.linearDamping)
      .setAngularDamping(params.angularDamping)
    const rigidBody = world.createRigidBody(rigidBodyDesc)
    const halfExtents = letterHalfExtents[index]

    world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfExtents.hx, halfExtents.hy, halfExtents.hz)
        .setRestitution(params.restitution)
        .setFriction(params.friction),
      rigidBody,
    )

    rigidBody.applyTorqueImpulse(
      new RAPIER.Vector3(
        (Math.random() - 0.5) * params.torqueStrength,
        (Math.random() - 0.5) * params.torqueStrength,
        (Math.random() - 0.5) * params.torqueStrength,
      ),
      true,
    )

    return { mesh, rigidBody }
  })

  const wanderSeeds = cubeBodies.map(() => ({
    x: Math.random() * 20,
    y: Math.random() * 20,
    z: Math.random() * 20,
  }))

  const pointer = new THREE.Vector2(10, 10)
  const pointerWorld = new THREE.Vector3(999, 999, 0)
  const raycaster = new THREE.Raycaster()
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  let pointerActive = false

  root.addEventListener('pointermove', (event) => {
    updatePointer(event, root, pointer)
    pointerActive = true
  })

  root.addEventListener('pointerleave', () => {
    pointerActive = false
    pointerWorld.set(999, 999, 0)
  })

  const wallThickness = 1.5
  const zExtent = 2
  let wallBodies = []

  function rebuildWalls() {
    for (const body of wallBodies) world.removeRigidBody(body)

    const halfHeight = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const halfWidth = halfHeight * camera.aspect
    const walls = [
      { position: [-halfWidth - wallThickness / 2, 0, 0], halfExtents: [wallThickness / 2, halfHeight * 2, zExtent] },
      { position: [halfWidth + wallThickness / 2, 0, 0], halfExtents: [wallThickness / 2, halfHeight * 2, zExtent] },
      { position: [0, halfHeight + wallThickness / 2, 0], halfExtents: [halfWidth * 2, wallThickness / 2, zExtent] },
      { position: [0, -halfHeight - wallThickness / 2, 0], halfExtents: [halfWidth * 2, wallThickness / 2, zExtent] },
      { position: [0, 0, zExtent + wallThickness / 2], halfExtents: [halfWidth * 2, halfHeight * 2, wallThickness / 2] },
      { position: [0, 0, -zExtent - wallThickness / 2], halfExtents: [halfWidth * 2, halfHeight * 2, wallThickness / 2] },
    ]

    wallBodies = walls.map(({ position, halfExtents }) => {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...position))
      world.createCollider(RAPIER.ColliderDesc.cuboid(...halfExtents), body)
      return body
    })
  }

  const physicsTimestep = new FixedTimestep()
  const impulse = new THREE.Vector3()
  const wander = new THREE.Vector3()
  const torque = new THREE.Vector3()

  function resize() {
    const width = Math.max(root.clientWidth, 1)
    const height = Math.max(root.clientHeight, 1)
    const isCompact = width < 700
    camera.position.set(0, 0, isCompact ? 9.25 : 6)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    centerGlow.scale.set(isCompact ? 6 : 7.5, isCompact ? 6 : 7.5, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height, false)
    rebuildWalls()
  }

  function render(timestamp) {
    if (!isElementVisible(root)) return

    glassMaterial.update()

    if (pointerActive) {
      raycaster.setFromCamera(pointer, camera)
      raycaster.ray.intersectPlane(interactionPlane, pointerWorld)
    }

    const steps = physicsTimestep.update(timestamp)
    const time = timestamp * 0.001

    for (let step = 0; step < steps; step += 1) {
      for (let index = 0; index < cubeBodies.length; index += 1) {
        const { rigidBody } = cubeBodies[index]
        const position = rigidBody.translation()
        const seed = wanderSeeds[index]

        impulse
          .set(-position.x, -position.y * 0.92, -position.z)
          .normalize()
          .multiplyScalar(params.attractionStrength * physicsTimestep.dt)

        wander
          .set(
            Math.sin(time * params.wanderSpeed + seed.x),
            Math.sin(time * params.wanderSpeed * 0.9 + seed.y),
            Math.sin(time * params.wanderSpeed * 0.7 + seed.z),
          )
          .normalize()
          .multiplyScalar(params.wanderStrength * physicsTimestep.dt)
        impulse.add(wander)

        if (pointerActive) {
          const dx = position.x - pointerWorld.x
          const dy = position.y - pointerWorld.y
          const dz = position.z - pointerWorld.z
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (distance < params.mouseBallRadius && distance > 0.001) {
            const strength = (1 - distance / params.mouseBallRadius) * 160 * physicsTimestep.dt
            impulse.x += (dx / distance) * strength
            impulse.y += (dy / distance) * strength
            impulse.z += (dz / distance) * strength
          }
        }

        torque
          .set(
            Math.cos(time * 0.7 + seed.z),
            Math.sin(time * 0.9 + seed.x),
            Math.sin(time * 0.6 + seed.y),
          )
          .multiplyScalar(params.torqueStrength * physicsTimestep.dt)

        rigidBody.applyImpulse(new RAPIER.Vector3(impulse.x, impulse.y, impulse.z), true)
        rigidBody.applyTorqueImpulse(new RAPIER.Vector3(torque.x, torque.y, torque.z), true)
      }

      world.step()
    }

    for (const { mesh, rigidBody } of cubeBodies) {
      const position = rigidBody.translation()
      const rotation = rigidBody.rotation()
      mesh.position.set(position.x, position.y, position.z)
      mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    }

    renderer.render(scene, camera)
  }

  return { resize, render }
}

function createResourcesScene(root, resourceTitles) {
  const renderer = createRenderer(root, 1.08)
  const scene = new THREE.Scene()
  const world = new RAPIER.World(new RAPIER.Vector3(0, 0, 0))

  const params = {
    color: '#f5efe6',
    transmission: 1,
    thickness: 0.58,
    roughness: 0.08,
    ior: 1.42,
    attenuationColor: '#fff8ef',
    attenuationDistance: 0.95,
    envMapIntensity: 1.2,
    iridescence: 0.18,
    iridescenceIOR: 1.12,
    iridescenceThicknessMin: 80,
    iridescenceThicknessMax: 260,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    specularIntensity: 1.4,
    specularColor: '#fffdf8',
    mouseBallRadius: 2.0,
    wanderStrength: 0.2,
    wanderSpeed: 0.24,
    attractionStrength: 5.4,
    torqueStrength: 0.06,
    linearDamping: 1.9,
    angularDamping: 4.8,
    friction: 0.45,
    restitution: 0.26,
    ambientIntensity: 2.1,
    keyLightIntensity: 88,
    fillLightIntensity: 30,
  }

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
  camera.position.set(0, 0, 8)

  const ambientLight = new THREE.AmbientLight(0xffffff, params.ambientIntensity)
  const keyLight = new THREE.SpotLight(0xffffff, params.keyLightIntensity, 0, 0.38, 0.6, 1.2)
  const fillLight = new THREE.PointLight(0xe8d1ad, params.fillLightIntensity, 30, 2)
  keyLight.position.set(5, 9, 9)
  fillLight.position.set(-5, -2, 5)
  scene.add(ambientLight, keyLight, fillLight)
  scene.environment = createLightformerEnvMap(renderer, 'resources')

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: new THREE.Color('#f7d8ab'),
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
  )
  halo.position.set(0, 0, -1.3)
  scene.add(halo)

  const glassMaterial = new TransmissionMaterial(params)
  const cardGeometry = new RoundedBoxGeometry(2.55, 1.85, 0.22, 6, 0.12)
  const cardEdges = new THREE.EdgesGeometry(cardGeometry)
  const labelPlane = new THREE.PlaneGeometry(1.9, 1.22)

  const cards = resourceTitles.map((title) => {
    const group = new THREE.Group()
    const base = glassMaterial.createMesh(cardGeometry)
    const outline = new THREE.LineSegments(
      cardEdges,
      new THREE.LineBasicMaterial({
        color: 0xfff4e3,
        transparent: true,
        opacity: 0.24,
      }),
    )

    const labelTexture = createCardLabelTexture(title)
    const label = new THREE.Mesh(
      labelPlane,
      new THREE.MeshBasicMaterial({
        map: labelTexture,
        transparent: true,
        toneMapped: false,
      }),
    )
    label.position.z = 0.125

    group.add(base, outline, label)
    scene.add(group)

    const rigidBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setLinearDamping(params.linearDamping).setAngularDamping(params.angularDamping),
    )
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(1.275, 0.925, 0.11).setRestitution(params.restitution).setFriction(params.friction),
      rigidBody,
    )

    rigidBody.applyTorqueImpulse(
      new RAPIER.Vector3((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08),
      true,
    )

    return {
      group,
      rigidBody,
      home: new THREE.Vector3(),
      seed: {
        x: Math.random() * 18,
        y: Math.random() * 18,
        z: Math.random() * 18,
      },
    }
  })

  const pointer = new THREE.Vector2(10, 10)
  const pointerWorld = new THREE.Vector3(999, 999, 0)
  const raycaster = new THREE.Raycaster()
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  let pointerActive = false

  root.addEventListener('pointermove', (event) => {
    updatePointer(event, root, pointer)
    pointerActive = true
  })

  root.addEventListener('pointerleave', () => {
    pointerActive = false
    pointerWorld.set(999, 999, 0)
  })

  const wallThickness = 1.4
  const zExtent = 2.3
  let wallBodies = []

  function rebuildWalls() {
    for (const body of wallBodies) world.removeRigidBody(body)

    const halfHeight = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const halfWidth = halfHeight * camera.aspect
    const walls = [
      { position: [-halfWidth - wallThickness / 2, 0, 0], halfExtents: [wallThickness / 2, halfHeight * 2, zExtent] },
      { position: [halfWidth + wallThickness / 2, 0, 0], halfExtents: [wallThickness / 2, halfHeight * 2, zExtent] },
      { position: [0, halfHeight + wallThickness / 2, 0], halfExtents: [halfWidth * 2, wallThickness / 2, zExtent] },
      { position: [0, -halfHeight - wallThickness / 2, 0], halfExtents: [halfWidth * 2, wallThickness / 2, zExtent] },
      { position: [0, 0, zExtent + wallThickness / 2], halfExtents: [halfWidth * 2, halfHeight * 2, wallThickness / 2] },
      { position: [0, 0, -zExtent - wallThickness / 2], halfExtents: [halfWidth * 2, halfHeight * 2, wallThickness / 2] },
    ]

    wallBodies = walls.map(({ position, halfExtents }) => {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...position))
      world.createCollider(RAPIER.ColliderDesc.cuboid(...halfExtents), body)
      return body
    })
  }

  function updateCardHomes(isCompact) {
    const columns = isCompact ? 2 : 3
    const gapX = isCompact ? 3.15 : 3.35
    const gapY = isCompact ? 2.28 : 2.55
    const rows = Math.ceil(cards.length / columns)
    const xOffset = (columns - 1) / 2
    const yOffset = (rows - 1) / 2

    cards.forEach((card, index) => {
      const row = Math.floor(index / columns)
      const col = index % columns
      card.home.set((col - xOffset) * gapX, (yOffset - row) * gapY, 0)
      if (!card.initialized) {
        card.group.position.copy(card.home)
        card.rigidBody.setTranslation(card.home, true)
        card.initialized = true
      }
    })
  }

  const physicsTimestep = new FixedTimestep()
  const impulse = new THREE.Vector3()
  const wander = new THREE.Vector3()
  const torque = new THREE.Vector3()

  function resize() {
    const width = Math.max(root.clientWidth, 1)
    const height = Math.max(root.clientHeight, 1)
    const isCompact = width < 760

    camera.fov = isCompact ? 48 : 42
    camera.position.set(0, 0, isCompact ? 11 : 8)
    camera.aspect = width / height
    camera.updateProjectionMatrix()

    halo.scale.set(isCompact ? 9 : 11, isCompact ? 9 : 11, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height, false)
    updateCardHomes(isCompact)
    rebuildWalls()
  }

  function render(timestamp) {
    if (!isElementVisible(root)) return

    glassMaterial.update()

    if (pointerActive) {
      raycaster.setFromCamera(pointer, camera)
      raycaster.ray.intersectPlane(interactionPlane, pointerWorld)
    }

    const steps = physicsTimestep.update(timestamp)
    const time = timestamp * 0.001

    for (let step = 0; step < steps; step += 1) {
      for (const card of cards) {
        const position = card.rigidBody.translation()

        impulse
          .set(card.home.x - position.x, card.home.y - position.y, -position.z * 0.75)
          .multiplyScalar(params.attractionStrength * physicsTimestep.dt)

        wander
          .set(
            Math.sin(time * params.wanderSpeed + card.seed.x),
            Math.cos(time * params.wanderSpeed * 0.85 + card.seed.y),
            Math.sin(time * params.wanderSpeed * 0.65 + card.seed.z),
          )
          .multiplyScalar(params.wanderStrength * physicsTimestep.dt)
        impulse.add(wander)

        if (pointerActive) {
          const dx = position.x - pointerWorld.x
          const dy = position.y - pointerWorld.y
          const dz = position.z - pointerWorld.z
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (distance < params.mouseBallRadius && distance > 0.001) {
            const strength = (1 - distance / params.mouseBallRadius) * 120 * physicsTimestep.dt
            impulse.x += (dx / distance) * strength
            impulse.y += (dy / distance) * strength
            impulse.z += (dz / distance) * strength
          }
        }

        torque
          .set(
            Math.cos(time * 0.55 + card.seed.x),
            Math.sin(time * 0.7 + card.seed.y),
            Math.sin(time * 0.45 + card.seed.z),
          )
          .multiplyScalar(params.torqueStrength * physicsTimestep.dt)

        card.rigidBody.applyImpulse(new RAPIER.Vector3(impulse.x, impulse.y, impulse.z), true)
        card.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(torque.x, torque.y, torque.z), true)
      }

      world.step()
    }

    for (const card of cards) {
      const position = card.rigidBody.translation()
      const rotation = card.rigidBody.rotation()
      card.group.position.set(position.x, position.y, position.z)
      card.group.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    }

    renderer.render(scene, camera)
  }

  return { resize, render }
}

function createFeedbackScene(root, font) {
  const renderer = createRenderer(root, 1.02)
  const scene = new THREE.Scene()
  const world = new RAPIER.World(new RAPIER.Vector3(0, 0, 0))

  const params = {
    color: '#fff8f2',
    transmission: 1,
    thickness: 0.92,
    roughness: 0.1,
    ior: 1.48,
    attenuationColor: '#ffe8c3',
    attenuationDistance: 1.05,
    envMapIntensity: 1.18,
    iridescence: 0.22,
    iridescenceIOR: 1.18,
    iridescenceThicknessMin: 100,
    iridescenceThicknessMax: 320,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    specularIntensity: 1.45,
    specularColor: '#fffdf9',
    mouseBallRadius: 1.5,
    wanderStrength: 0.42,
    wanderSpeed: 0.3,
    attractionStrength: 9.5,
    torqueStrength: 0.08,
    linearDamping: 1.6,
    angularDamping: 4.2,
    friction: 0.45,
    restitution: 0.24,
    ambientIntensity: 1.8,
    keyLightIntensity: 92,
    rimLightIntensity: 36,
  }

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 0, 6)

  const ambientLight = new THREE.AmbientLight(0xffffff, params.ambientIntensity)
  const keyLight = new THREE.SpotLight(0xffffff, params.keyLightIntensity, 0, 0.3, 0.8, 1.2)
  const rimLight = new THREE.PointLight(0xf4c890, params.rimLightIntensity, 20, 2)
  keyLight.position.set(5.5, 8, 8)
  rimLight.position.set(-4.5, -1.5, 4.5)
  scene.add(ambientLight, keyLight, rimLight)
  scene.environment = createLightformerEnvMap(renderer, 'resources')

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 9),
    new THREE.MeshBasicMaterial({
      map: createFeedbackBackdropTexture(),
      transparent: true,
      opacity: 0.95,
      toneMapped: false,
    }),
  )
  backdrop.position.set(0, 0, -3.6)
  scene.add(backdrop)

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: new THREE.Color('#f7c58d'),
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  )
  halo.position.set(0, -0.2, -1.8)
  scene.add(halo)

  const glassMaterial = new TransmissionMaterial(params)
  const letters = ['F', 'E', 'E', 'D', 'B', 'A', 'C', 'K']
  const letterSize = 0.8
  const letterDepth = 0.3
  const letterBodies = []

  for (const char of letters) {
    const geometry = new TextGeometry(char, {
      font,
      size: letterSize,
      depth: letterDepth,
      curveSegments: 12,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.02,
      bevelSegments: 4,
    })
    geometry.computeBoundingBox()
    const bounds = geometry.boundingBox
    geometry.translate(
      -((bounds.max.x + bounds.min.x) / 2),
      -((bounds.max.y + bounds.min.y) / 2),
      -((bounds.max.z + bounds.min.z) / 2),
    )
    geometry.computeBoundingBox()

    const mesh = glassMaterial.createMesh(geometry)
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
      }),
    )
    mesh.add(edges)
    scene.add(mesh)

    const halfExtents = {
      hx: (geometry.boundingBox.max.x - geometry.boundingBox.min.x) / 2,
      hy: (geometry.boundingBox.max.y - geometry.boundingBox.min.y) / 2,
      hz: (geometry.boundingBox.max.z - geometry.boundingBox.min.z) / 2,
    }

    const rigidBody = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setLinearDamping(params.linearDamping).setAngularDamping(params.angularDamping),
    )
    world.createCollider(RAPIER.ColliderDesc.cuboid(halfExtents.hx, halfExtents.hy, halfExtents.hz), rigidBody)

    letterBodies.push({
      mesh,
      rigidBody,
      home: new THREE.Vector3(),
      seed: {
        x: Math.random() * 16,
        y: Math.random() * 16,
        z: Math.random() * 16,
      },
    })
  }

  const pointer = new THREE.Vector2(10, 10)
  const pointerWorld = new THREE.Vector3(999, 999, 0)
  const raycaster = new THREE.Raycaster()
  const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  let pointerActive = false

  root.addEventListener('pointermove', (event) => {
    updatePointer(event, root, pointer)
    pointerActive = true
  })

  root.addEventListener('pointerleave', () => {
    pointerActive = false
    pointerWorld.set(999, 999, 0)
  })

  const wallThickness = 1.25
  const zExtent = 1.7
  let wallBodies = []

  function rebuildWalls() {
    for (const body of wallBodies) world.removeRigidBody(body)

    const halfHeight = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const halfWidth = halfHeight * camera.aspect
    const walls = [
      { position: [-halfWidth - wallThickness / 2, 0, 0], halfExtents: [wallThickness / 2, halfHeight * 2, zExtent] },
      { position: [halfWidth + wallThickness / 2, 0, 0], halfExtents: [wallThickness / 2, halfHeight * 2, zExtent] },
      { position: [0, halfHeight + wallThickness / 2, 0], halfExtents: [halfWidth * 2, wallThickness / 2, zExtent] },
      { position: [0, -halfHeight - wallThickness / 2, 0], halfExtents: [halfWidth * 2, wallThickness / 2, zExtent] },
      { position: [0, 0, zExtent + wallThickness / 2], halfExtents: [halfWidth * 2, halfHeight * 2, wallThickness / 2] },
      { position: [0, 0, -zExtent - wallThickness / 2], halfExtents: [halfWidth * 2, halfHeight * 2, wallThickness / 2] },
    ]

    wallBodies = walls.map(({ position, halfExtents }) => {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...position))
      world.createCollider(RAPIER.ColliderDesc.cuboid(...halfExtents), body)
      return body
    })
  }

  function updateLetterHomes(isCompact) {
    const spacing = isCompact ? 0.9 : 0.98
    const startX = -((letterBodies.length - 1) * spacing) / 2
    letterBodies.forEach((letter, index) => {
      letter.home.set(startX + index * spacing, 0, 0)
      if (!letter.initialized) {
        letter.mesh.position.copy(letter.home)
        letter.rigidBody.setTranslation(letter.home, true)
        letter.initialized = true
      }
    })
  }

  const physicsTimestep = new FixedTimestep()
  const impulse = new THREE.Vector3()
  const wander = new THREE.Vector3()
  const torque = new THREE.Vector3()

  function resize() {
    const width = Math.max(root.clientWidth, 1)
    const height = Math.max(root.clientHeight, 1)
    const isCompact = width < 640

    camera.position.set(0, 0, isCompact ? 8.4 : 6)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    halo.scale.set(isCompact ? 8 : 10, isCompact ? 8 : 10, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height, false)
    updateLetterHomes(isCompact)
    rebuildWalls()
  }

  function render(timestamp) {
    if (!isElementVisible(root)) return

    glassMaterial.update()

    if (pointerActive) {
      raycaster.setFromCamera(pointer, camera)
      raycaster.ray.intersectPlane(interactionPlane, pointerWorld)
    }

    const steps = physicsTimestep.update(timestamp)
    const time = timestamp * 0.001

    for (let step = 0; step < steps; step += 1) {
      for (const letter of letterBodies) {
        const position = letter.rigidBody.translation()

        impulse
          .set(letter.home.x - position.x, -position.y * 0.95, -position.z)
          .multiplyScalar(params.attractionStrength * physicsTimestep.dt)

        wander
          .set(
            Math.sin(time * params.wanderSpeed + letter.seed.x),
            Math.sin(time * params.wanderSpeed * 0.82 + letter.seed.y),
            Math.cos(time * params.wanderSpeed * 0.6 + letter.seed.z),
          )
          .multiplyScalar(params.wanderStrength * physicsTimestep.dt)
        impulse.add(wander)

        if (pointerActive) {
          const dx = position.x - pointerWorld.x
          const dy = position.y - pointerWorld.y
          const dz = position.z - pointerWorld.z
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (distance < params.mouseBallRadius && distance > 0.001) {
            const strength = (1 - distance / params.mouseBallRadius) * 132 * physicsTimestep.dt
            impulse.x += (dx / distance) * strength
            impulse.y += (dy / distance) * strength
            impulse.z += (dz / distance) * strength
          }
        }

        torque
          .set(
            Math.cos(time * 0.75 + letter.seed.z),
            Math.sin(time * 0.62 + letter.seed.x),
            Math.sin(time * 0.48 + letter.seed.y),
          )
          .multiplyScalar(params.torqueStrength * physicsTimestep.dt)

        letter.rigidBody.applyImpulse(new RAPIER.Vector3(impulse.x, impulse.y, impulse.z), true)
        letter.rigidBody.applyTorqueImpulse(new RAPIER.Vector3(torque.x, torque.y, torque.z), true)
      }

      world.step()
    }

    for (const letter of letterBodies) {
      const position = letter.rigidBody.translation()
      const rotation = letter.rigidBody.rotation()
      letter.mesh.position.set(position.x, position.y, position.z)
      letter.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
    }

    renderer.render(scene, camera)
  }

  return { resize, render }
}

function createFeedbackBackdropTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 640
  const context = canvas.getContext('2d')

  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  gradient.addColorStop(0, '#0d101c')
  gradient.addColorStop(0.45, '#16131c')
  gradient.addColorStop(1, '#2a1a13')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const glow = context.createRadialGradient(canvas.width * 0.5, canvas.height * 0.42, 20, canvas.width * 0.5, canvas.height * 0.42, 320)
  glow.addColorStop(0, 'rgba(255, 215, 154, 0.55)')
  glow.addColorStop(0.45, 'rgba(255, 215, 154, 0.12)')
  glow.addColorStop(1, 'rgba(255, 215, 154, 0)')
  context.fillStyle = glow
  context.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function createCardLabelTexture(title) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 660
  const context = canvas.getContext('2d')

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(255, 255, 255, 0.94)'
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  context.font = '700 94px Montserrat, Aptos, Segoe UI, sans-serif'
  wrapCenteredText(context, title, canvas.width / 2, canvas.height / 2 - 16, 700, 108)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function wrapCenteredText(context, text, x, startY, maxWidth, lineHeight) {
  const words = text.split(' ')
  const lines = []
  let currentLine = ''

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (context.measureText(nextLine).width <= maxWidth || !currentLine) {
      currentLine = nextLine
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine) lines.push(currentLine)

  const totalHeight = (lines.length - 1) * lineHeight
  const yStart = startY - totalHeight / 2
  lines.forEach((line, index) => {
    context.fillText(line, x, yStart + index * lineHeight)
  })
}
