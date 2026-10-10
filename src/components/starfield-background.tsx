import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export function StarfieldBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000)
    camera.position.z = 42

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const starCount = 2600
    const positions = new Float32Array(starCount * 3)
    const scales = new Float32Array(starCount)
    const randomness = new Float32Array(starCount)

    for (let index = 0; index < starCount; index += 1) {
      const stride = index * 3
      const horizontalSpread = (Math.random() - 0.5) * 170
      const verticalBias = Math.pow(Math.random(), 0.62)
      positions[stride] = horizontalSpread
      positions[stride + 1] = verticalBias * 120 - 28
      positions[stride + 2] = (Math.random() - 0.5) * 120
      scales[index] = Math.random()
      randomness[index] = Math.random()
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randomness, 1))

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.75) },
      },
      vertexShader: `
        attribute float aScale;
        attribute float aRandom;
        uniform float uTime;
        uniform vec2 uPointer;
        uniform float uPixelRatio;
        varying float vAlpha;
        varying float vRandom;

        void main() {
          vec3 transformed = position;
          transformed.x += sin(uTime * (0.1 + aRandom * 0.16) + position.y * 0.04) * (0.8 + aScale * 0.9);
          transformed.y += cos(uTime * (0.14 + aRandom * 0.12) + position.x * 0.03) * (0.5 + aScale * 0.7);
          transformed.x += uPointer.x * (10.0 - aScale * 4.0);
          transformed.y += uPointer.y * (6.5 - aScale * 2.4);

          vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          float distanceScale = 36.0 / -mvPosition.z;
          float twinkle = sin(uTime * (1.4 + aRandom * 2.6) + aRandom * 12.0) * 0.5 + 0.5;
          gl_PointSize = (1.8 + aScale * 4.8 + twinkle * 1.2) * distanceScale * uPixelRatio;
          vAlpha = 0.38 + aScale * 0.45 + twinkle * 0.22;
          vRandom = aRandom;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vRandom;

        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float glow = smoothstep(0.5, 0.0, distanceToCenter);
          float core = smoothstep(0.18, 0.0, distanceToCenter);
          float halo = smoothstep(0.68, 0.16, distanceToCenter);
          vec3 auroraTeal = vec3(0.38, 0.92, 0.96);
          vec3 silverBlue = vec3(0.78, 0.9, 1.0);
          vec3 white = vec3(1.0, 1.0, 1.0);
          vec3 color = mix(auroraTeal, silverBlue, vRandom);
          color = mix(color, white, core);
          gl_FragColor = vec4(color, (glow * 0.7 + halo * 0.45) * vAlpha);
        }
      `,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    const pointerTarget = new THREE.Vector2(0, 0)
    const pointerCurrent = new THREE.Vector2(0, 0)

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect()
      const normalizedX = (event.clientX - bounds.left) / bounds.width
      const normalizedY = (event.clientY - bounds.top) / bounds.height
      pointerTarget.set((normalizedX - 0.5) * 2, (normalizedY - 0.5) * -2)
    }

    const handlePointerLeave = () => {
      pointerTarget.set(0, 0)
    }

    const resize = () => {
      const { clientWidth, clientHeight } = container
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
      material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 1.75)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerleave', handlePointerLeave)

    let frameId = 0
    const clock = new THREE.Clock()

    const render = () => {
      if (document.hidden || window.scrollY > window.innerHeight * .25) {
        frameId = window.requestAnimationFrame(render)
        return
      }
      const elapsedTime = clock.getElapsedTime()
      pointerCurrent.lerp(pointerTarget, 0.035)

      material.uniforms.uTime.value = elapsedTime
      material.uniforms.uPointer.value.copy(pointerCurrent)

      points.rotation.y = elapsedTime * 0.035 + pointerCurrent.x * 0.22
      points.rotation.x = pointerCurrent.y * 0.1

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(render)
    }

    render()

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerleave', handlePointerLeave)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[68%] opacity-80 [mask-image:linear-gradient(to_bottom,black_0%,black_58%,transparent_100%)]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_16%,rgba(196,232,255,0.18),transparent_30%),radial-gradient(ellipse_at_20%_12%,rgba(95,226,225,0.16),transparent_24%),radial-gradient(ellipse_at_82%_20%,rgba(214,241,255,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.05),transparent_24%)] mix-blend-screen" />
      <div className="absolute inset-x-[10%] top-[8%] h-24 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)] opacity-60 blur-3xl" />
      <div className="meteor meteor-one" />
      <div className="meteor meteor-two" />
    </div>
  )
}
