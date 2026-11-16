// Optional low-res post pass (only built when tiltShift or bloom is on): the scene renders to a half-float target
// at the already-small canvas size, then one fullscreen pass adds a very light edge blur and a tight night bloom.
import * as THREE from "three"

export class Post {
  private rt: THREE.WebGLRenderTarget | null = null
  private scene = new THREE.Scene()
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private geo = new THREE.PlaneGeometry(2, 2)
  private size = new THREE.Vector2()
  private mat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { tMap: { value: null as THREE.Texture | null }, uRes: { value: new THREE.Vector2(1, 1) }, uBlur: { value: 0 }, uBloom: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tMap; uniform vec2 uRes; uniform float uBlur; uniform float uBloom;
      varying vec2 vUv;
      vec3 tap(vec2 o) { return texture2D(tMap, vUv + o / uRes).rgb; }
      void main() {
        vec3 c = tap(vec2(0.0));
        // tilt-shift: only the outer ~12% bands soften, by at most one rendered pixel, so the focus band stays crisp
        float k = smoothstep(0.76, 1.0, abs(vUv.y - 0.5) * 2.0) * uBlur;
        if (k > 0.001) {
          vec3 n = (tap(vec2(1.0, 0.0)) + tap(vec2(-1.0, 0.0)) + tap(vec2(0.0, 1.0)) + tap(vec2(0.0, -1.0))) * 0.25;
          vec3 f = (tap(vec2(2.0, 0.0)) + tap(vec2(-2.0, 0.0)) + tap(vec2(0.0, 2.0)) + tap(vec2(0.0, -2.0))) * 0.25;
          c = mix(c, mix(n, f, k * k), min(1.0, k * 0.9));
        }
        // night bloom: tight, thresholded on lamp-bright pixels, composited with "screen" so whites never clip
        if (uBloom > 0.001) {
          vec3 b = vec3(0.0);
          for (int i = 0; i < 8; i++) {
            float a = float(i) * 0.7853982;
            vec2 d = vec2(cos(a), sin(a));
            b += max(tap(d * 2.0) - 0.88, 0.0) + max(tap(d * 4.0) - 0.92, 0.0) * 0.5;
          }
          b = min(b * uBloom / 8.0, vec3(0.22));
          c = 1.0 - (1.0 - c) * (1.0 - b);
        }
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  })

  constructor() {
    const m = new THREE.Mesh(this.geo, this.mat)
    m.frustumCulled = false
    this.scene.add(m)
  }

  render(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, blur: number, bloom: number) {
    gl.getDrawingBufferSize(this.size)
    if (!this.rt || this.rt.width !== this.size.x || this.rt.height !== this.size.y) {
      this.rt?.dispose()
      this.rt = new THREE.WebGLRenderTarget(this.size.x, this.size.y, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true, stencilBuffer: true })
    }
    gl.setRenderTarget(this.rt)
    gl.clear()
    gl.render(scene, camera)
    gl.setRenderTarget(null)
    const u = this.mat.uniforms
    u.tMap.value = this.rt.texture; u.uRes.value.copy(this.size); u.uBlur.value = blur; u.uBloom.value = bloom
    gl.render(this.scene, this.cam)
  }

  dispose() { this.rt?.dispose(); this.geo.dispose(); this.mat.dispose() }
}
