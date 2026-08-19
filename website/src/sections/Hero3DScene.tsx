import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

/**
 * HERO 3D SCENE
 *
 * Veridian's real mechanic is three signal layers — Movement, Money,
 * Receipts — feeding one confirm loop. This renders that mechanic, not a
 * decorative abstraction: three small nodes orbit and slowly converge
 * toward a central ring (the confirm loop), then settle into a steady,
 * gentle orbit around it.
 *
 * Strictly monochrome/token-colored — only the accent and ink tokens from
 * index.css, no new hues. three.js materials can't consume CSS custom
 * properties directly, so the actual color values are read at module load
 * from the computed style of :root (index.css is imported in main.tsx
 * before anything can mount, so the tokens are always registered by the
 * time this dynamically-imported module evaluates). This keeps a single
 * source of truth in index.css per docs/DESIGN_REQUIREMENTS.md §8 ("no
 * hardcoded hex outside index.css") instead of a hand-synced duplicate.
 * The literals below are only a last-resort fallback for the
 * near-impossible case the custom property isn't there; they are never
 * expected to be hit.
 *
 * Convergence uses THREE.MathUtils.damp — an exponential, framerate-
 * independent damp that decays monotonically and can never overshoot —
 * the three.js-native equivalent of the brand's damping:30/stiffness:220
 * "settles, never bounces" motion law. The ongoing orbit rotation is a
 * plain constant angular velocity, not a spring, so it never re-triggers
 * the settle; that only ever happens once, on mount.
 *
 * This module is dynamically imported (see Hero.tsx) so it never blocks
 * first paint and never ships in the main bundle. It assumes a WebGL
 * context exists — callers must feature-detect (src/lib/webgl.ts) and
 * fall back to the flat SVG ring under prefers-reduced-motion or when
 * WebGL is unavailable; this file does no feature-detection of its own.
 */

/** Reads a color custom property off :root, falling back to the literal
 * last-known value from index.css if the property is somehow unset. */
function readColorToken(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

const COLOR_ACCENT = readColorToken('--color-accent', '#0F6B41') // index.css fallback only
const COLOR_INK = readColorToken('--color-ink', '#0D1117') // index.css fallback only

// Convergence rate: higher = settles faster. ~1.6s to visually rest.
const DAMP_LAMBDA = 2.4

type NodeSpec = {
  id: 'movement' | 'money' | 'receipts'
  startRadius: number
  restRadius: number
  angularSpeed: number
  startAngle: number
  tilt: number
  size: number
}

// Three signal layers, not three interchangeable dots — different start
// distance, speed, and orbital tilt so each reads as its own input
// converging on the same confirm loop, at its own pace.
const NODES: NodeSpec[] = [
  { id: 'movement', startRadius: 3.7, restRadius: 1.62, angularSpeed: 0.26, startAngle: 0, tilt: 0.18, size: 0.11 },
  {
    id: 'money',
    startRadius: 4.2,
    restRadius: 1.82,
    angularSpeed: 0.19,
    startAngle: (Math.PI * 2) / 3,
    tilt: -0.24,
    size: 0.095,
  },
  {
    id: 'receipts',
    startRadius: 3.95,
    restRadius: 1.7,
    angularSpeed: 0.225,
    startAngle: (Math.PI * 4) / 3,
    tilt: 0.09,
    size: 0.085,
  },
]

/** A point on a circle of the given radius, tilted about the x-axis. */
function orbitPoint(angle: number, radius: number, tilt: number): [number, number, number] {
  const x = Math.cos(angle) * radius
  const flat = Math.sin(angle) * radius
  return [x, flat * Math.sin(tilt), flat * Math.cos(tilt)]
}

function OrbitNode({ spec }: { spec: NodeSpec }) {
  const ref = useRef<THREE.Mesh>(null)
  const radius = useRef(spec.startRadius)
  const angle = useRef(spec.startAngle)

  useFrame((_, delta) => {
    radius.current = THREE.MathUtils.damp(radius.current, spec.restRadius, DAMP_LAMBDA, delta)
    angle.current += spec.angularSpeed * delta
    const [x, y, z] = orbitPoint(angle.current, radius.current, spec.tilt)
    ref.current?.position.set(x, y, z)
  })

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[spec.size, 0]} />
      <meshStandardMaterial color={COLOR_INK} roughness={0.55} metalness={0.05} />
    </mesh>
  )
}

function OrbitPath({ radius, tilt }: { radius: number; tilt: number }) {
  const points = useMemo(() => {
    const segments = 96
    return Array.from({ length: segments + 1 }, (_, i) => orbitPoint((i / segments) * Math.PI * 2, radius, tilt))
  }, [radius, tilt])

  // Border token is ink at low alpha (rgba(13,17,23,0.08)) — reproduced
  // here as ink + material opacity rather than introducing a new color.
  return <Line points={points} color={COLOR_INK} transparent opacity={0.1} lineWidth={1} />
}

function ConfirmRing() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.06
  })

  return (
    <mesh ref={ref} rotation={[Math.PI / 2.35, 0, 0]}>
      <torusGeometry args={[1.18, 0.05, 24, 96]} />
      <meshStandardMaterial color={COLOR_ACCENT} roughness={0.4} metalness={0.15} />
    </mesh>
  )
}

function Scene() {
  return (
    <group rotation={[0.12, 0, 0]}>
      <ambientLight intensity={1.0} />
      <directionalLight position={[3, 4, 2]} intensity={0.55} />
      <directionalLight position={[-2, -1, -3]} intensity={0.2} />
      <ConfirmRing />
      {NODES.map((n) => (
        <OrbitPath key={`path-${n.id}`} radius={n.restRadius} tilt={n.tilt} />
      ))}
      {NODES.map((n) => (
        <OrbitNode key={n.id} spec={n} />
      ))}
    </group>
  )
}

export default function Hero3DScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 2.15, 5.5], fov: 38 }}
      style={{ width: '100%', height: '100%' }}
    >
      <Scene />
    </Canvas>
  )
}
