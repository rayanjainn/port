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
  uFog: { value: THREE.Vector3 }
  uTilt: { value: THREE.Vector2 }
  uShadow: { value: THREE.Vector3 }
  uBias: { value: number }
  uMask: { value: THREE.Texture }
  uMaskInfo: { value: THREE.Vector4 }
  uSky: { value: THREE.Color }
  uEmis: { value: THREE.Texture }
  uEmisInfo: { value: THREE.Vector3 }
}

export function makeShared(): Shared {
  const blank = new THREE.DataTexture(new Uint8Array([0]), 1, 1, THREE.RedFormat)
  blank.needsUpdate = true
  return {
    uTime: { value: 0 },
    uAmb: { value: new THREE.Color(1, 1, 1) },
    uLP: { value: Array.from({ length: NL }, () => new THREE.Vector4(1e4, 1e4, 1e4, 1)) },
    uLC: { value: Array.from({ length: NL }, () => new THREE.Vector3()) },
    uFogColor: { value: new THREE.Color(0, 0, 0) },
    uFog: { value: new THREE.Vector3(26, 70, 0.75) },
    uTilt: { value: new THREE.Vector2(Math.cos(TILT), Math.sin(TILT)) },
    uShadow: { value: new THREE.Vector3(SHADOW_DIR[0], SHADOW_DIR[1], 0.3) },
    uBias: { value: 1.2 },
    uMask: { value: blank },
    uMaskInfo: { value: new THREE.Vector4(0, 0, 0, 0) },
    uSky: { value: new THREE.Color(0.5, 0.7, 0.9) },
    uEmis: { value: blank },
    uEmisInfo: { value: new THREE.Vector3(1, 1, 0) },
  }
}

const LIGHT = /* glsl */ `
uniform vec3 uAmb; uniform vec4 uLP[${NL}]; uniform vec3 uLC[${NL}];
uniform vec3 uFogColor; uniform vec3 uFog;
vec3 lightAt(vec3 p) {
  vec3 l = uAmb;
  for (int i = 0; i < ${NL}; i++) {
    float t = clamp(1.0 - length(uLP[i].xyz - p) / uLP[i].w, 0.0, 1.0);
    l += uLC[i] * (t * t * 0.6 + t * 0.4 * t * t);
  }
  return l;
}
vec3 fogged(vec3 c, float depth) { return mix(c, uFogColor, clamp((depth - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0) * uFog.z); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
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

/** sky tint, soft fresnel reflection, pixel ripples/glints and stepped shoreline foam */
export function waterMaterial(sh: Shared, hi: THREE.Color, lo: THREE.Color) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true, depthWrite: false,
    uniforms: { ...sh, uHi: { value: hi }, uLo: { value: lo } } as unknown as Record<string, THREE.IUniform>,
    vertexShader: /* glsl */ `
      attribute vec4 aEdge; attribute vec2 aLocal;
      varying vec3 vW; varying vec4 vEdge; varying vec2 vLocal; varying float vD;
      void main(){ vEdge = aEdge; vLocal = aLocal; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vec4 mv = viewMatrix*w; vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uHi; uniform vec3 uLo; uniform vec3 uSky;
      varying vec3 vW; varying vec4 vEdge; varying vec2 vLocal; varying float vD;
      ${LIGHT}
      void main() {
        vec2 p = floor(vW.xz * 16.0);
        float t = floor(uTime * 3.0) / 3.0;                    // choppy, pixel-stepped time
        vec3 V = normalize(cameraPosition - vW);
        float fr = pow(clamp(1.0 - V.y, 0.0, 1.0), 3.0);
        vec3 c = uSky; float a = 0.1 + 0.42 * fr;               // sky reflection
        // soft sky streaks
        if (fract(p.y * 0.17 + sin(p.x * 0.07) * 0.4 + t * 0.04) > 0.84) { c = mix(uSky, vec3(1.0), 0.6); a += 0.12 * (0.3 + fr); }
        float w = sin(p.x * 0.42 + p.y * 0.95 + t * 1.5) + sin(p.x * 0.9 - p.y * 0.35 - t * 0.9 + 1.7);
        if (w > 1.55) { c = uHi; a = 0.5; }
        else if (w < -1.5) { c = uLo; a = 0.35; }
        if (h21(p + floor(uTime * 2.0) * vec2(13.0, 7.0)) > 0.985) { c = vec3(1.0); a = 0.9; }
        // foam along the shore
        vec2 lp = floor(vLocal * 16.0);
        float d = 99.0;
        if (vEdge.x > 0.5) d = min(d, lp.y);
        if (vEdge.z > 0.5) d = min(d, 15.0 - lp.y);
        if (vEdge.w > 0.5) d = min(d, lp.x);
        if (vEdge.y > 0.5) d = min(d, 15.0 - lp.x);
        float wob = step(0.0, sin(p.x * 1.3 + p.y * 1.7 + t * 2.2)) * (0.6 + 0.4 * sin(t * 1.3));
        float fw = 0.5 + 1.6 * wob;
        if (d < fw) { c = vec3(1.0); a = 0.92; }
        else if (d < fw + 1.0) { c = uHi; a = max(a, 0.55); }
        gl_FragColor = vec4(fogged(c * lightAt(vW), vD), a);
        #include <colorspace_fragment>
      }`,
  })
}

export type CardMode = "opaque" | "blend" | "add" | "shadow"

/** instanced upright card: three rows so the canopy can sway while the trunk stays put; stacked layers give it thickness */
export function cardMaterial(sh: Shared, map: THREE.Texture, mode: CardMode, emis = false) {
  const defines: Record<string, string> = {}
  if (mode === "opaque") defines.FOOTDEPTH = "1"
  if (mode === "opaque" && emis) defines.EMIS = "1"
  if (mode === "shadow") defines.SHADOW = "1"
  if (mode === "blend" || mode === "add") defines.BLEND = "1"
  const m = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    defines,
    uniforms: { ...sh, uMap: { value: map } } as unknown as Record<string, THREE.IUniform>,
    vertexShader: /* glsl */ `
      attribute vec2 aCorner; attribute vec3 aFoot; attribute vec2 aSize; attribute vec4 aRect; attribute vec4 aAnim; attribute vec4 aTint; attribute float aDz; attribute vec2 aLayer; attribute float aUp; attribute vec2 aOrg;
      uniform vec3 uEmisInfo; varying vec2 vEm;
      uniform float uTime; uniform vec2 uTilt; uniform vec3 uShadow; uniform float uBias;
      varying vec2 vUv; varying vec3 vW; varying vec4 vTint; varying float vD; varying vec3 vFoot; varying float vBack;
      void main() {
        float h = aSize.y;
        float row = aCorner.y;
        float ly = row < 0.5 ? 0.0 : (row < 1.5 ? min(h, 0.625) : h);
        float lx = (aCorner.x - 0.5) * aSize.x;
        if (aAnim.w > 0.0 && row > 1.5) lx += floor(sin(uTime * 1.3 + aFoot.x * 0.8) * aAnim.w * 16.0 + 0.5) / 16.0;
        vec3 wp;
        #ifdef SHADOW
          wp = vec3(aFoot.x + lx + uShadow.x * ly, aFoot.y + 0.004, aFoot.z + uShadow.y * ly);
        #else
          vec2 tl = mix(uTilt, vec2(1.0, 0.0), max(aUp, 0.0));
          wp = aFoot + vec3(lx, ly * tl.x, -ly * tl.y) - vec3(0.0, aLayer.x * tl.y, aLayer.x * tl.x);
          if (aUp < -0.5) wp = vec3(aFoot.x + lx, aFoot.y, aFoot.z - ly);   // lies flat on the ground (rugs, quicksand swirls)   // back layers sit behind the front face
        #endif
        float fy = h > 0.0 ? ly / h : 0.0;
        float fr = aAnim.x > 1.0 ? floor(mod(uTime * aAnim.y, aAnim.x)) * aAnim.z : 0.0;
        vUv = vec2(mix(aRect.x, aRect.z, aCorner.x) + fr, mix(aRect.w, aRect.y, fy));
        vEm = (aOrg + vec2(aCorner.x * aSize.x * 16.0, (1.0 - fy) * h * 16.0)) / uEmisInfo.xy;
        vW = wp; vTint = aTint; vTint.rgb *= aLayer.y; vBack = aLayer.x > 0.0 ? 1.0 : 0.0; vFoot = aFoot;
        vec4 mv = viewMatrix * vec4(wp, 1.0); vD = -mv.z;
        gl_Position = projectionMatrix * mv;
        #ifdef FOOTDEPTH
         if (aUp > -0.5) {
          // depth of the foot line, like the 2D painter's order: the whole card sorts as one
          vec4 cf = projectionMatrix * viewMatrix * vec4(aFoot.x, aUp > 0.5 ? aFoot.y : 0.0, aFoot.z + aDz + uBias, 1.0);   // wall-mounted things sort at their real height
          gl_Position.z = cf.z / cf.w * gl_Position.w;
         }
        #endif
        if (aSize.x <= 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform vec3 uShadow; uniform sampler2D uMask; uniform vec4 uMaskInfo;
      varying vec2 vUv; varying vec3 vW; varying vec4 vTint; varying float vD; varying vec3 vFoot; varying float vBack; varying vec2 vEm;
      uniform sampler2D uEmis; uniform vec3 uEmisInfo;
      ${LIGHT}
      void main() {
        vec4 t = texture2D(uMap, vUv);
        #if defined(SHADOW)
          if (t.a < 0.5 || vTint.a < 0.5) discard;
          if (uMaskInfo.z > 0.0) {
            vec2 tc = (floor(vW.xz) + uMaskInfo.xy + 0.5) / uMaskInfo.zw;
            float gh = texture2D(uMask, tc).r * 5.0 - 0.5;
            if (abs(gh - vFoot.y) > 0.2) discard;           // no shadows floating over water or off a terrace
          }
          gl_FragColor = vec4(0.01, 0.015, 0.05, uShadow.z);
        #elif defined(BLEND)
          float a = t.a * vTint.a; if (a < 0.01) discard;
          gl_FragColor = vec4(t.rgb * vTint.rgb, a);
        #else
          if (t.a < 0.5) discard;
          // thickness layers skip the black outline pixels, so the slab's sides take the sprite's own (darkened) colours
          if (vBack > 0.5 && dot(t.rgb, vec3(0.3, 0.59, 0.11)) < 0.035) discard;
          vec3 lit = fogged(t.rgb * vTint.rgb * lightAt(vW), vD);
          #ifdef EMIS
            // self-lit window panes / neon: the scene's own night emissive layer, sampled by 2D position
            vec4 em = texture2D(uEmis, vEm);
            lit = mix(lit, em.rgb, clamp(em.a * uEmisInfo.z, 0.0, 1.0));
          #endif
          gl_FragColor = vec4(lit, 1.0);
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

/**
 * Pixel-art sky as a thin strip across the top of the frame (a fog band that fades the far terrain into it): banded
 * gradient, dusk glow, stars + moon at night, sun by day and slow blocky clouds. Screen-space, drawn last.
 */
export function skyMaterial() {
  return new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, transparent: true,
    uniforms: {
      uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uBand: { value: new THREE.Color() },
      uBandAmt: { value: 0 }, uNight: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 }, uScroll: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uBand; uniform float uBandAmt; uniform float uNight; uniform float uTime; uniform float uAspect; uniform float uScroll; uniform vec2 uRes;
      varying vec2 vUv;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
      void main() {
        const float Y0 = 0.87;                                    // the strip starts here (top 13% of the frame)
        float k = (vUv.y - Y0) / (1.0 - Y0);
        float a = smoothstep(0.0, 0.4, k);                        // soft fog edge into the terrain
        if (a <= 0.0) discard;
        // work in low-res pixel units so everything snaps to the render grid
        vec2 px = floor(vUv * uRes);
        vec2 q = px / uRes.y;                                     // height-normalised
        float t = floor(k * 7.0) / 7.0;
        vec3 c = mix(uHor, uTop, t);
        c = mix(c, uBand, floor((1.0 - t) * uBandAmt * 5.0) / 5.0);
        float day = 1.0 - uNight;
        vec2 sun = vec2(0.38 * uAspect, 0.962);
        float ds = length((q - sun) * vec2(1.0, 1.0));
        if (day > 0.05) { if (ds < 0.075) c += vec3(1.0, 0.85, 0.5) * floor((1.0 - ds / 0.075) * 4.0) / 4.0 * 0.2 * day; if (ds < 0.022) c = mix(c, vec3(1.0, 0.96, 0.75), day); }
        if (uNight > 0.02) {
          vec2 mo = vec2(0.62 * uAspect, 0.95);
          float dm = length(q - mo);
          if (dm < 0.07) c += vec3(0.5, 0.6, 1.0) * floor((1.0 - dm / 0.07) * 4.0) / 4.0 * 0.12 * uNight;
          if (dm < 0.026) {
            float cut = length(q - mo - vec2(0.011, 0.004));
            c = mix(c, cut < 0.023 ? vec3(0.2, 0.25, 0.45) : vec3(0.96, 0.95, 0.82), uNight);
          }
          vec2 cell = floor(vec2(px.x + uScroll * 0.3, px.y) / 3.0);
          float hs = h21(cell);
          if (hs > 0.972) c = mix(c, vec3(1.0, 0.97, 0.88), uNight * (0.6 + 0.4 * sin(uTime * 2.0 + hs * 90.0)));
        }
        // slow chunky clouds
        vec2 cp = vec2(q.x * 3.0 + uTime * 0.03 + uScroll * 0.02, q.y * 9.0);
        vec2 cq = floor(cp * 6.0) / 6.0;
        float n = vn(cq * 1.7) * 0.62 + vn(cq * 3.9 + 3.0) * 0.38;
        if (n > 0.57 && k > 0.08) {
          float up = vn((cq + vec2(0.0, 0.17)) * 1.7) * 0.62 + vn((cq + vec2(0.0, 0.17)) * 3.9 + 3.0) * 0.38;
          vec3 lit = mix(vec3(1.0), uHor * 1.4 + 0.1, uNight);
          lit = mix(lit, uBand * 1.1 + 0.15, uBandAmt * 0.6);
          c = mix(c, up > 0.57 ? lit * 0.84 : lit, 0.92);
        }
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`,
  })
}
