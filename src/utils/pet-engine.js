/**
 * 3D 宠物引擎 - 纯 Three.js，完全不依赖 Vue
 * 使用闭包隔离所有 Three.js 对象，避免 Vue 3 Proxy 干扰
 */
import * as THREE from 'three'

export function createPetEngine() {
  // ===== 闭包内部状态，外部完全无法访问 =====
  let scene, camera, renderer, catGroup, accGroup
  let bodyMesh, headGroup, leftEye, rightEye
  let animId = null
  let clock = null
  let blinkTimer = 0
  let isBlinking = false
  let mood = 'normal'
  let mouthMeshes = null
  let blushMeshes = []

  // ===== 构建香烟小人 =====
  let cherryMesh = null  // 燃烧端
  let smokeParticles = []

  function buildCat() {
    // 材质
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xFAF5EE, roughness: 0.6 })
    const filterMat = new THREE.MeshStandardMaterial({ color: 0xD4944A, roughness: 0.75 })
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xC8A84E, metalness: 0.5, roughness: 0.3 })
    const cherryMat = new THREE.MeshStandardMaterial({ color: 0xFF4500, emissive: 0xFF2200, emissiveIntensity: 0.6, roughness: 0.9 })
    const ashMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.95 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff })
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x4BA8BF, roughness: 0.3 })
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xFFDBAC, roughness: 0.8 })

    // ---- 滤嘴（底部）----
    const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.30, 0.7, 24), filterMat)
    filter.position.y = 0.35
    catGroup.add(filter)

    // 滤嘴纹理环
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.008, 6, 24), filterMat.clone())
      ring.material.color.setHex(0xBF7F30)
      ring.rotation.x = Math.PI / 2
      ring.position.y = 0.15 + i * 0.2
      catGroup.add(ring)
    }

    // ---- 金色环带（纸和滤嘴交界）----
    const goldRing = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 24), goldMat)
    goldRing.position.y = 0.73
    catGroup.add(goldRing)

    // ---- 烟身（白色纸身，主体）----
    bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.32, 2.0, 24), paperMat)
    bodyMesh.position.y = 1.76
    catGroup.add(bodyMesh)

    // ---- 燃烧端（顶部红色）----
    cherryMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.30, 0.1, 24), cherryMat)
    cherryMesh.position.y = 2.81
    catGroup.add(cherryMesh)

    // ---- 烟灰（顶部灰色）----
    const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.29, 0.12, 24), ashMat)
    ash.position.y = 2.92
    catGroup.add(ash)

    // ---- 脸部（在烟身上部）----
    headGroup = new THREE.Group()
    headGroup.position.set(0, 2.2, 0)
    catGroup.add(headGroup)

    // 眼睛
    leftEye = makeEye(-0.14, 0, 0.28, whiteMat, irisMat, darkMat)
    rightEye = makeEye(0.14, 0, 0.28, whiteMat, irisMat, darkMat)
    headGroup.add(leftEye)
    headGroup.add(rightEye)

    // 腮红
    const blushMat = new THREE.MeshStandardMaterial({ color: 0xFFB6C1, transparent: true, opacity: 0.4 })
    const lBlush = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), blushMat)
    lBlush.scale.set(1.2, 0.7, 0.5)
    lBlush.position.set(-0.22, -0.1, 0.25)
    headGroup.add(lBlush)
    const rBlush = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), blushMat)
    rBlush.scale.set(1.2, 0.7, 0.5)
    rBlush.position.set(0.22, -0.1, 0.25)
    headGroup.add(rBlush)
    blushMeshes = [lBlush, rBlush]
    blushMeshes.forEach(b => { b.visible = mood !== 'sad' })

    // 嘴巴（随心情切换：开心/普通/难过）
    const makeMouth = (type) => {
      let curve
      if (type === 'sad') {
        curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-0.08, -0.14, 0.30),
          new THREE.Vector3(0, -0.08, 0.33),
          new THREE.Vector3(0.08, -0.14, 0.30)
        )
      } else {
        const d = type === 'happy' ? -0.22 : -0.17
        curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-0.08, -0.14, 0.30),
          new THREE.Vector3(0, d, 0.33),
          new THREE.Vector3(0.08, -0.14, 0.30)
        )
      }
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 10, 0.01, 6, false),
        new THREE.MeshBasicMaterial({ color: 0x5B4335 })
      )
      return mesh
    }
    mouthMeshes = {
      happy: makeMouth('happy'),
      normal: makeMouth('normal'),
      sad: makeMouth('sad')
    }
    mouthMeshes.happy.visible = mood === 'happy'
    mouthMeshes.normal.visible = mood === 'normal'
    mouthMeshes.sad.visible = mood === 'sad'
    headGroup.add(mouthMeshes.happy, mouthMeshes.normal, mouthMeshes.sad)

    // ---- 小手臂 ----
    const armMat = skinMat
    // 左手
    const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 8), armMat)
    lArm.position.set(-0.36, 1.5, 0)
    lArm.rotation.z = 0.5
    catGroup.add(lArm)
    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), armMat)
    lHand.position.set(-0.48, 1.38, 0)
    catGroup.add(lHand)
    // 右手
    const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 8), armMat)
    rArm.position.set(0.36, 1.5, 0)
    rArm.rotation.z = -0.5
    catGroup.add(rArm)
    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), armMat)
    rHand.position.set(0.48, 1.38, 0)
    catGroup.add(rHand)

    // ---- 小腿 ----
    const legMat = skinMat
    const lLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 8), legMat)
    lLeg.position.set(-0.12, -0.1, 0.05)
    catGroup.add(lLeg)
    const lFoot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), legMat)
    lFoot.scale.set(1, 0.6, 1.4)
    lFoot.position.set(-0.12, -0.2, 0.08)
    catGroup.add(lFoot)
    const rLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 8), legMat)
    rLeg.position.set(0.12, -0.1, 0.05)
    rLeg.rotation.z = 0
    catGroup.add(rLeg)
    const rFoot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), legMat)
    rFoot.scale.set(1, 0.6, 1.4)
    rFoot.position.set(0.12, -0.2, 0.08)
    catGroup.add(rFoot)

    // ---- 烟雾粒子 ----
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.3 })
    for (let i = 0; i < 5; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.04 + i * 0.01, 8, 6), smokeMat.clone())
      puff.position.set(
        (Math.random() - 0.5) * 0.1,
        3.0 + i * 0.15,
        (Math.random() - 0.5) * 0.1
      )
      puff.userData.baseY = puff.position.y
      puff.userData.speed = 0.3 + Math.random() * 0.3
      puff.userData.offset = Math.random() * Math.PI * 2
      catGroup.add(puff)
      smokeParticles.push(puff)
    }
  }

  function makeEye(x, y, z, whiteMat, irisMat, darkMat) {
    const g = new THREE.Group()
    g.position.set(x, y, z)
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), whiteMat)
    sclera.scale.set(1, 1.15, 0.6)
    g.add(sclera)
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), irisMat)
    iris.position.z = 0.025
    g.add(iris)
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), darkMat)
    pupil.position.z = 0.04
    g.add(pupil)
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }))
    hl.position.set(0.015, 0.02, 0.05)
    g.add(hl)
    // 眼皮
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshStandardMaterial({ color: 0xFAF5EE, roughness: 0.6 }))
    lid.scale.set(1.05, 0.01, 0.65)
    lid.position.z = 0.005
    g.add(lid)
    g.userData.lid = lid
    return g
  }

  // ===== 动画循环 =====
  function animate() {
    animId = requestAnimationFrame(animate)
    const t = clock.getElapsedTime()

    // 身体轻微摇摆
    if (catGroup) {
      catGroup.rotation.y = Math.sin(t * 0.8) * 0.05
      catGroup.rotation.z = Math.sin(t * 1.2) * 0.015
    }

    // 头部微动
    if (headGroup) {
      headGroup.rotation.y = Math.sin(t * 0.6) * 0.06
      headGroup.rotation.x = Math.sin(t * 0.9) * 0.03
    }

    // 燃烧端脉冲发光
    if (cherryMesh) {
      cherryMesh.material.emissiveIntensity = 0.4 + Math.sin(t * 3) * 0.3
    }

    // 烟雾上升动画
    for (const puff of smokeParticles) {
      const elapsed = t * puff.userData.speed + puff.userData.offset
      puff.position.y = puff.userData.baseY + (elapsed % 2) * 0.3
      puff.position.x = Math.sin(elapsed * 2) * 0.06
      puff.material.opacity = 0.3 - (elapsed % 2) * 0.15
      if (puff.material.opacity < 0.02) puff.material.opacity = 0.3
      const s = 1 + (elapsed % 2) * 0.5
      puff.scale.set(s, s, s)
    }

    // 眨眼
    blinkTimer += 0.033
    isBlinking = blinkTimer > 3.5 && blinkTimer <= 3.7
    if (blinkTimer > 3.7) blinkTimer = 0
    if (leftEye && leftEye.userData.lid) leftEye.userData.lid.scale.y = isBlinking ? 1.2 : 0.01
    if (rightEye && rightEye.userData.lid) rightEye.userData.lid.scale.y = isBlinking ? 1.2 : 0.01

    renderer.render(scene, camera)
  }

  // ===== 装扮 =====
  function clearAccGroup() {
    if (!accGroup) return
    while (accGroup.children.length > 0) {
      accGroup.remove(accGroup.children[0])
    }
  }

  function attachHead(acc) {
    const g = new THREE.Group()
    g.position.set(0, 3.05, 0) // 烟顶上方
    if (acc.type === 'crown') {
      const gold = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.6, roughness: 0.3 })
      const base = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 8, 16), gold)
      base.rotation.x = Math.PI / 2; g.add(base)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), gold)
        spike.position.set(Math.cos(a) * 0.18, 0.06, Math.sin(a) * 0.18); g.add(spike)
      }
      const gem = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshStandardMaterial({ color: 0xFF0000, metalness: 0.3 }))
      gem.position.set(0, 0.03, 0.18); g.add(gem)
    } else if (acc.type === 'tophat') {
      const black = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 })
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 24), black))
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.28, 24), black)
      top.position.y = 0.14; g.add(top)
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.04, 24), new THREE.MeshStandardMaterial({ color: 0x8B0000 }))
      band.position.y = 0.04; g.add(band)
    } else if (acc.type === 'bow') {
      const bowMat = new THREE.MeshStandardMaterial({ color: 0xFF69B4 })
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), bowMat)
      l.scale.set(1.5, 0.8, 0.5); l.position.x = -0.1; g.add(l)
      const r = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), bowMat)
      r.scale.set(1.5, 0.8, 0.5); r.position.x = 0.1; g.add(r)
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshStandardMaterial({ color: 0xFF1493 })))
    } else if (acc.type === 'flower') {
      const petalMat = new THREE.MeshStandardMaterial({ color: 0xFFB7C5 })
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), petalMat)
        p.scale.set(1, 0.6, 1.6); p.position.set(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08); g.add(p)
      }
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), new THREE.MeshStandardMaterial({ color: 0xFFD700 })))
    }
    accGroup.add(g)
  }

  function attachEyes(acc) {
    const g = new THREE.Group()
    g.position.set(0, 2.2, 0.28)
    if (acc.type === 'glasses') {
      const frame = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4 })
      const lR = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 24), frame)
      lR.position.x = -0.18; g.add(lR)
      const rR = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 24), frame)
      rR.position.x = 0.18; g.add(rR)
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), frame)
      bridge.rotation.z = Math.PI / 2; bridge.position.set(0, 0, 0.02); g.add(bridge)
    } else if (acc.type === 'sunglasses') {
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5, roughness: 0.1 })
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.4 })
      const lL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), lensMat)
      lL.scale.set(1, 0.85, 0.3); lL.position.x = -0.18; g.add(lL)
      const rL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), lensMat)
      rL.scale.set(1, 0.85, 0.3); rL.position.x = 0.18; g.add(rL)
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6), frameMat)
      bridge.rotation.z = Math.PI / 2; g.add(bridge)
    } else if (acc.type === 'monocle') {
      const gold = new THREE.MeshStandardMaterial({ color: 0xDAA520, metalness: 0.6 })
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 8, 24), gold)
      ring.position.x = 0.18; g.add(ring)
      const chainPts = [new THREE.Vector3(0.18, -0.1, 0), new THREE.Vector3(0.2, -0.25, 0.05), new THREE.Vector3(0.15, -0.4, 0)]
      const chain = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(chainPts), 12, 0.006, 6, false), gold)
      g.add(chain)
    }
    accGroup.add(g)
  }

  function attachNeck(acc) {
    const g = new THREE.Group()
    g.position.set(0, 0.73, 0)
    if (acc.type === 'bowtie') {
      const mat = new THREE.MeshStandardMaterial({ color: 0xDC143C })
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), mat)
      l.scale.set(1.8, 0.8, 0.5); l.position.x = -0.08; g.add(l)
      const r = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), mat)
      r.scale.set(1.8, 0.8, 0.5); r.position.x = 0.08; g.add(r)
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshStandardMaterial({ color: 0xB22222 })))
    } else if (acc.type === 'necklace') {
      const gold = new THREE.MeshStandardMaterial({ color: 0xDAA520, metalness: 0.5 })
      const chain = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 32), gold)
      chain.rotation.x = Math.PI / 2; chain.position.y = -0.05; g.add(chain)
      const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), new THREE.MeshStandardMaterial({ color: 0xFF4500, metalness: 0.3 }))
      pendant.position.set(0, -0.27, 0.15); g.add(pendant)
    } else if (acc.type === 'scarf') {
      const mat = new THREE.MeshStandardMaterial({ color: 0x4169E1 })
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.06, 8, 24), mat)
      scarf.rotation.x = Math.PI / 2; scarf.position.y = -0.05; g.add(scarf)
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.03), mat)
      tail.position.set(0.15, -0.15, 0.2); tail.rotation.z = -0.3; g.add(tail)
    } else if (acc.type === 'collar') {
      const mat = new THREE.MeshStandardMaterial({ color: 0xDC143C })
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 8, 32), mat)
      collar.rotation.x = Math.PI / 2; g.add(collar)
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.6 }))
      bell.position.set(0, -0.23, 0.18); g.add(bell)
    }
    accGroup.add(g)
  }

  // ===== 公开 API =====
  return {
    init(container) {
      const w = container.clientWidth || 280
      const h = 340

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100)
      camera.position.set(0, 1.8, 5.0)
      camera.lookAt(0, 1.4, 0)

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      container.appendChild(renderer.domElement)

      scene.add(new THREE.AmbientLight(0xffffff, 0.65))
      const dir = new THREE.DirectionalLight(0xffffff, 0.75)
      dir.position.set(3, 5, 4); scene.add(dir)
      const rimL = new THREE.DirectionalLight(0xffd4a0, 0.3)
      rimL.position.set(-3, 2, -2); scene.add(rimL)

      const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 }))
      shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; scene.add(shadow)

      catGroup = new THREE.Group()
      scene.add(catGroup)
      buildCat()

      accGroup = new THREE.Group()
      catGroup.add(accGroup)

      clock = new THREE.Clock()
      animate()
    },

    destroy() {
      if (animId) cancelAnimationFrame(animId)
      animId = null
      if (renderer) { renderer.dispose(); renderer = null }
    },

    updateAccessories(acc) {
      // 提取纯数据，剥离 Vue Proxy
      const data = {}
      if (acc.head) data.head = { type: acc.head.type }
      if (acc.eyes) data.eyes = { type: acc.eyes.type }
      if (acc.neck) data.neck = { type: acc.neck.type }
      clearAccGroup()
      if (data.head) attachHead(data.head)
      if (data.eyes) attachEyes(data.eyes)
      if (data.neck) attachNeck(data.neck)
    },

    setMood(m) {
      mood = m || 'normal'
      if (mouthMeshes) {
        mouthMeshes.happy.visible = mood === 'happy'
        mouthMeshes.normal.visible = mood === 'normal'
        mouthMeshes.sad.visible = mood === 'sad'
      }
      blushMeshes.forEach(b => { b.visible = mood !== 'sad' })
    }
  }
}
