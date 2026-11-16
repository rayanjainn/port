// Shared uniforms + GLSL for the 3D pixel view. Everything is lit in one tiny model:
// ambient + up to NL warm point lights, then distance fog. Colours stay in sRGB-space maths via three's colour management.
import * as THREE from "three"

export const NL = 16
export const TILT = 30 * Math.PI / 180     // cards lean back this much (camera pitch is 45)
export const SHADOW_DIR: [number, number] = [0.5, 0.32]   // ground offset of a shadow per unit of height (right, toward camera)

export interface Shared {
  uTime: { value: number }
  uAmb: { value: THREE.Color }
  uLP: { value: THREE.Vector4[] }
  uLC: { value: THREE.Vector3[] }
  uFogColor: { value: THREE.Color }
  uFog: { value: THREE.Vector2 }
  uTilt: { value: THREE.Vector2 }
  uShadow: { value: THREE.Vector3 }
  uBias: { value: number }
}

export function makeShared(): Shared {
  return {
    uTime: { value: 0 },
    uAmb: { value: new THREE.Color(1, 1, 1) },
    uLP: { value: Array.from({ length: NL }, () => new THREE.Vector4(1e4, 1e4, 1e4, 1)) },
    uLC: { value: Array.from({ length: NL }, () => new THREE.Vector3()) },
    uFogColor: { value: new THREE.Color(0, 0, 0) },
    uFog: { value: new THREE.Vector2(26, 70) },
    uTilt: { value: new THREE.Vector2(Math.cos(TILT), Math.sin(TILT)) },
    uShadow: { value: new THREE.Vector3(SHADOW_DIR[0], SHADOW_DIR[1], 0.3) },
    uBias: { value: 1.2 },
  }
}

const LIGHT = /* glsl */ `
uniform vec3 uAmb; uniform vec4 uLP[${NL}]; uniform vec3 uLC[${NL}];
uniform vec3 uFogColor; uniform vec2 uFog;
vec3 lightAt(vec3 p) {
  vec3 l = uAmb;
  for (int i = 0; i < ${NL}; i++) {
    float t = clamp(1.0 - length(uLP[i].xyz - p) / uLP[i].w, 0.0, 1.0);
    l += uLC[i] * (t * t * 0.6 + t * 0.4 * t * t);
  }
  return l;
}
vec3 fogged(vec3 c, float depth) { return mix(c, uFogColor, clamp((depth - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0) * 0.75); }
`

export function groundMaterial(sh: Shared, map: THREE.Texture) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...sh, uMap: { value: map } } as unknown as Record<string, THREE.IUniform>,
    vertexShader: /* glsl */ `
      attribute float aShade;
      varying vec2 vUv; varying vec3 vW; varying float vS; varying float vD;
      void main() {
        vUv = uv; vS = aShade;
        vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
        vec4 mv = viewMatrix * w; vD = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      varying vec2 vUv; varying vec3 vW; varying float vS; varying float vD;
      ${LIGHT}
      void main() {
        vec3 c = texture2D(uMap, vUv).rgb * vS * lightAt(vW);
        gl_FragColor = vec4(fogged(c, vD), 1.0);
        #include <colorspace_fragment>
      }`,
  })
}

/** big flat plane beyond the map edge */
export function flatMaterial(sh: Shared, color: THREE.Color) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { ...sh, uCol: { value: color } } as unknown as Record<string, THREE.IUniform>,
    vertexShader: /* glsl */ `varying vec3 vW; varying float vD; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; vec4 mv=viewMatrix*w; vD=-mv.z; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `uniform vec3 uCol; varying vec3 vW; varying float vD; ${LIGHT}
      void main(){
        gl_FragColor = vec4(fogged(uCol * lightAt(vW), vD), 1.0);
        #include <colorspace_fragment>
      }`,
  })
}

export function waterMaterial(sh: Shared, hi: THREE.Color, lo: THREE.Color) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true, depthWrite: false,
    uniforms: { ...sh, uHi: { value: hi }, uLo: { value: lo } } as unknown as Record<string, THREE.IUniform>,
    vertexShader: /* glsl */ `
      attribute float aK; varying vec3 vW; varying float vK;
      void main(){ vK = aK; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uHi; uniform vec3 uLo;
      varying vec3 vW; varying float vK;
      ${LIGHT}
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        if (vK < 0.5) discard;
        vec2 p = floor(vW.xz * 16.0);
        float t = floor(uTime * 3.0) / 3.0;                    // choppy, pixel-stepped time
        float w = sin(p.x * 0.42 + p.y * 0.95 + t * 1.5) + sin(p.x * 0.9 - p.y * 0.35 - t * 0.9 + 1.7);
        vec3 c = vec3(0.0); float a = 0.0;
        if (w > 1.55) { c = uHi; a = 0.5; }
        else if (w < -1.5) { c = uLo; a = 0.4; }
        if (h21(p + floor(uTime * 2.0) * vec2(13.0, 7.0)) > 0.985) { c = vec3(1.0); a = 0.9; }
        if (a == 0.0) discard;
        gl_FragColor = vec4(c * lightAt(vW), a);
        #include <colorspace_fragment>
      }`,
  })
}

export type CardMode = "opaque" | "blend" | "add" | "shadow"

/** instanced upright card: three rows so the canopy can sway while the trunk stays put */
export function cardMaterial(sh: Shared, map: THREE.Texture, mode: CardMode) {
  const defines: Record<string, string> = {}
  if (mode === "opaque") defines.FOOTDEPTH = "1"
  if (mode === "shadow") defines.SHADOW = "1"
  if (mode === "blend" || mode === "add") defines.BLEND = "1"
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    defines,
    uniforms: { ...sh, uMap: { value: map } } as unknown as Record<string, THREE.IUniform>,
    vertexShader: /* glsl */ `
      attribute vec2 aCorner; attribute vec3 aFoot; attribute vec2 aSize; attribute vec4 aRect; attribute vec4 aAnim; attribute vec4 aTint; attribute float aDz;
      uniform float uTime; uniform vec2 uTilt; uniform vec3 uShadow; uniform float uBias;
      varying vec2 vUv; varying vec3 vW; varying vec4 vTint; varying float vD;
      void main() {
        float h = aSize.y;
        float row = aCorner.y;
        float ly = row < 0.5 ? 0.0 : (row < 1.5 ? min(h, 0.625) : h);
        float lx = (aCorner.x - 0.5) * aSize.x;
        if (aAnim.w > 0.0 && row > 1.5) lx += floor(sin(uTime * 1.3 + aFoot.x * 0.8) * aAnim.w * 16.0 + 0.5) / 16.0;
        vec3 wp;
        #ifdef SHADOW
          wp = vec3(aFoot.x + lx + uShadow.x * ly, 0.004, aFoot.z + uShadow.y * ly);
        #else
          wp = aFoot + vec3(lx, ly * uTilt.x, -ly * uTilt.y);
        #endif
        float fy = h > 0.0 ? ly / h : 0.0;
        float fr = aAnim.x > 1.0 ? floor(mod(uTime * aAnim.y, aAnim.x)) * aAnim.z : 0.0;
        vUv = vec2(mix(aRect.x, aRect.z, aCorner.x) + fr, mix(aRect.w, aRect.y, fy));
        vW = wp; vTint = aTint;
        vec4 mv = viewMatrix * vec4(wp, 1.0); vD = -mv.z;
        gl_Position = projectionMatrix * mv;
        #ifdef FOOTDEPTH
          // depth of the foot line, like the 2D painter's order: the whole card sorts as one
          vec4 cf = projectionMatrix * viewMatrix * vec4(aFoot.x, 0.0, aFoot.z + aDz + uBias, 1.0);
          gl_Position.z = cf.z / cf.w * gl_Position.w;
        #endif
        if (aSize.x <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform vec3 uShadow;
      varying vec2 vUv; varying vec3 vW; varying vec4 vTint; varying float vD;
      ${LIGHT}
      void main() {
        vec4 t = texture2D(uMap, vUv);
        #if defined(SHADOW)
          if (t.a < 0.5 || vTint.a < 0.5) discard;
          gl_FragColor = vec4(0.01, 0.015, 0.05, uShadow.z);
        #elif defined(BLEND)
          float a = t.a * vTint.a; if (a < 0.01) discard;
          gl_FragColor = vec4(t.rgb * vTint.rgb, a);
        #else
          if (t.a < 0.5) discard;
          gl_FragColor = vec4(fogged(t.rgb * vTint.rgb * lightAt(vW), vD), 1.0);
        #endif
        #include <colorspace_fragment>
      }`,
  })
  if (mode === "shadow") {
    m.transparent = true; m.depthWrite = false
    // stencil: overlapping shadows darken the ground only once
    m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.NotEqualStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp
  } else if (mode === "blend" || mode === "add") {
    m.transparent = true; m.depthWrite = false
    if (mode === "add") m.blending = THREE.AdditiveBlending
  }
  return m
}
