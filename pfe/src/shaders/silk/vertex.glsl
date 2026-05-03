uniform float uTime;
uniform float uImpactTime;
uniform vec2  uLocomotiveXZ;
uniform float uLocomotiveY;
uniform float uPixelRatio;

varying float vRippleIntensity;
varying float vPullIntensity;
varying float vHeight;

void main() {
  vec3 pos = position;

  // Distance from center (impact point at xz origin)
  float dist       = length(pos.xz);
  // Distance from the locomotive's horizontal projection
  float distLoco   = length(pos.xz - uLocomotiveXZ);

  float silk = sin(pos.x * 2.1 + uTime * 0.90) * 0.035
             + sin(pos.z * 1.7 + uTime * 1.10) * 0.035
             + sin((pos.x + pos.z) * 1.4 + uTime * 0.70) * 0.025
             + sin((pos.x - pos.z) * 1.9 + uTime * 1.30) * 0.015;

  float pullRadius    = 14.0;
  float pullIntensity = 0.0;
  if (distLoco < pullRadius) {
    float r        = 1.0 - distLoco / pullRadius;
    float approach = smoothstep(7.0, 2.0, uLocomotiveY);
    // Sharp power curve: deep crater at center, hard edge at radius
    pullIntensity  = pow(r, 3.0) * approach;
    pos.y         -= pullIntensity * 3.5;
  }

  // ── Impact ripple waves (after landing) ──
  float rippleIntensity = 0.0;
  if (uImpactTime > 0.0) {
    float elapsed = uTime - uImpactTime;

    float w1Speed = 5.0;
    float w1Front = elapsed * w1Speed;
    float w1Width = 1.5;
    float d1      = abs(dist - w1Front);
    if (d1 < w1Width) {
      float t1     = 1.0 - d1 / w1Width;
      float decay1 = exp(-elapsed * 0.18);   // slow decay → visible across full 55-unit spread
      float wave1  = t1 * t1 * decay1;
      rippleIntensity = max(rippleIntensity, wave1);
      pos.y += wave1 * 0.80 * sin(dist * 3.0 - elapsed * 10.0 + 1.5);
    }

    float w2Speed = 2.5;
    float w2Front = max(0.0, elapsed - 0.30) * w2Speed;
    float w2Width = 2.0;
    float d2      = abs(dist - w2Front);
    if (d2 < w2Width && elapsed > 0.30) {
      float t2     = 1.0 - d2 / w2Width;
      float decay2 = exp(-elapsed * 0.25);
      float wave2  = t2 * decay2 * 0.60;
      rippleIntensity = max(rippleIntensity, wave2 * 0.75);
      pos.y += wave2 * 0.45 * sin(dist * 2.0 - elapsed * 6.0);
    }

    if (elapsed > 0.3) {
      float wakeProgress  = dist / w1Speed;
      float timeSinceWave = elapsed - wakeProgress;
      if (timeSinceWave > 0.0 && timeSinceWave < 6.0) {
        float shimmer = exp(-timeSinceWave * 0.5);
        pos.y += silk * shimmer * 0.60;
        rippleIntensity = max(rippleIntensity, shimmer * 0.35);
      }
    }
  }

  pos.y += silk;

  // ── Point sizing ──
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float baseSize   = 3.5;
  float ripBoost   = rippleIntensity * 10.0;
  float pullBoost  = pullIntensity   * 14.0;
  gl_PointSize = (baseSize + ripBoost + pullBoost) * uPixelRatio * (3.0 / -mvPosition.z);

  gl_Position = projectionMatrix * mvPosition;

  vRippleIntensity = rippleIntensity;
  vPullIntensity   = pullIntensity;
  vHeight          = pos.y;
}
