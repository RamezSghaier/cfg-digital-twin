import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function useScrollAnimation(locomotiveRef) {
  useFrame(({ camera, clock }) => {
    if (!locomotiveRef.current) return

    const scrollY = window.scrollY
    const maxScroll = document.body.scrollHeight - window.innerHeight
    const t = maxScroll > 0 ? scrollY / maxScroll : 0
    const time = clock.getElapsedTime()

    // ── INTRO: plays automatically on load, no scroll needed ──
    // runs for first 2.5 seconds, only when user hasn't scrolled
    if (t === 0) {
      const introProgress = Math.min(time / 2.5, 1)
      const eased = 1 - Math.pow(1 - introProgress, 3) // ease out cubic

      // train falls from above, tilted (right side lower)
      locomotiveRef.current.position.x = 0
      locomotiveRef.current.position.y = THREE.MathUtils.lerp(12, 1.7, eased)
      locomotiveRef.current.position.z = 0
      locomotiveRef.current.rotation.x = THREE.MathUtils.lerp(0.3, 0.1, eased)
      locomotiveRef.current.rotation.z = THREE.MathUtils.lerp(0.4, 0.15, eased)
      locomotiveRef.current.rotation.y = 0

      // camera zooms out as train falls — stop overriding once done so OrbitControls can take over
      if (introProgress < 1) {
        const camDist = THREE.MathUtils.lerp(3, 7, eased)
        camera.position.set(camDist, camDist, camDist)
        camera.lookAt(0, 1.7, 0)
      }

      return // ← exit here, dont apply scroll phases
    }
    

    // ── once user scrolls, take over from where intro left off ──
    // reset tilt smoothly as scroll begins
    const tiltFade = Math.max(1 - t * 8, 0) // fades out tilt in first scroll
    locomotiveRef.current.rotation.x = THREE.MathUtils.lerp(0, 0.1, tiltFade)
    locomotiveRef.current.rotation.z = THREE.MathUtils.lerp(0, 0.15, tiltFade)

    // ── PHASE 1 (0 → 0.25): train already landed, text appears ──
    const phase1 = Math.min(t / 0.25, 1)
    const camDist = 7
    camera.position.set(camDist, camDist, camDist)
    camera.lookAt(0, 1.7, 0)

    // keep train centered in phase 1
    locomotiveRef.current.position.x = 0
    locomotiveRef.current.position.y = THREE.MathUtils.lerp(1.7, 1.7, phase1)

    // ── PHASE 2 (0.25 → 0.5): slide to left + rotate ──
    const phase2 = Math.min(Math.max((t - 0.25) / 0.25, 0), 1)
    const trainX = THREE.MathUtils.lerp(0, -2.5, phase2)
    const trainRotY = THREE.MathUtils.lerp(0, Math.PI * 1.5, phase2)
    const camX = THREE.MathUtils.lerp(0, 1.5, phase2)
    camera.position.set(camDist + camX, camDist, camDist)
    camera.lookAt(0, 1.7, 0)

    // ── PHASE 3 (0.5 → 0.75): rise to top center ──
    const phase3 = Math.min(Math.max((t - 0.5) / 0.25, 0), 1)
    const trainX2 = THREE.MathUtils.lerp(trainX, 0, phase3)
    const trainY2 = THREE.MathUtils.lerp(1.7, 3.2, phase3)
    const camX2 = THREE.MathUtils.lerp(camX, 0, phase3)
    const lookAtY3 = THREE.MathUtils.lerp(1.7, 2.4, phase3)
    camera.position.set(camDist + camX2, camDist, camDist)
    camera.lookAt(0, lookAtY3, 0)

    // ── PHASE 4 (0.75 → 1): gentle float at center ──
    const phase4 = Math.min(Math.max((t - 0.75) / 0.25, 0), 1)
    const floatY = Math.sin(time * 1.5) * 0.08 * phase4
    camera.lookAt(0, 3, 0)

    // apply final position
    locomotiveRef.current.position.x = trainX2
    locomotiveRef.current.position.y = trainY2 + floatY
    locomotiveRef.current.rotation.y = trainRotY
  })
}