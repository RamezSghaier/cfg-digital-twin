uniform float uTime;

varying float vRippleIntensity;
varying float vPullIntensity;
varying float vHeight;

void main() {
  // Discard pixels outside the soft circular point
  vec2  uv   = gl_PointCoord - 0.5;
  float d    = length(uv);
  if (d > 0.5) discard;

  // Soft radial falloff (quadratic)
  float soft = 1.0 - d * 2.0;
  soft = soft * soft;

  // ── Color palette ──
  // Silky near-white with a cool blue tint – bright enough to show on black
  vec3 silkBase  = vec3(0.90, 0.96, 1.00);
  // Holographic cyan – matches locomotive color #70c1ff
  vec3 holoBlue  = vec3(0.44, 0.76, 1.00);
  // Bright core at peak of wave
  vec3 coreGlow  = vec3(0.70, 0.97, 1.00);

  // Base color, lifted toward holo at ripple / pull
  vec3 color = silkBase;
  color = mix(color, holoBlue, vRippleIntensity);
  color += coreGlow * vRippleIntensity * 0.80;
  // Strong cyan burn at the crater core
  color = mix(color, holoBlue, vPullIntensity * 0.80);
  color += coreGlow * vPullIntensity * 0.60;

  // Height-based shimmer: displaced particles catch more "light"
  float heightShimmer = smoothstep(0.0, 0.10, abs(vHeight)) * 0.35;
  color += silkBase * heightShimmer;

  // ── Alpha ──
  float baseAlpha   = 0.75 + vPullIntensity * 0.25;
  float rippleAlpha = vRippleIntensity * 1.00;
  float alpha       = max(baseAlpha, rippleAlpha);

  gl_FragColor = vec4(color, soft * alpha);
}
