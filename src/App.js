import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";


let ww = window.innerWidth
let wh = window.innerHeight
const isFirefox = navigator.userAgent.indexOf('Firefox') > -1
const isWindows = navigator.appVersion.indexOf("Win") != -1

const mouseMultiplier = .001
const firefoxMultiplier = 20

const multipliers = {
  mouse: isWindows ? mouseMultiplier * 2 : mouseMultiplier,
  firefox: isWindows ? firefoxMultiplier * 2 : firefoxMultiplier
}


let bounds = {}
let spacing = .075
bounds.smallSize = 1;
bounds.halfSmallSize = bounds.smallSize / 2;
bounds.largeSize = (2 * bounds.smallSize) + spacing;
bounds.halfLargeSize = bounds.largeSize / 2;
bounds.width = 8 * bounds.smallSize + (7 * spacing);
bounds.height = 5 * bounds.smallSize + (4 * spacing);

const loader = new THREE.TextureLoader()

const vertexShader = `
precision mediump float;

uniform float u_diff;

varying vec2 vUv;

void main(){
vec3 pos = position;



vUv = uv;
gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);;
}
`

// `precision mediump float;
// #define GLSLIFY 1
// attribute vec2 uv;
// attribute vec3 position;
// uniform mat4 modelViewMatrix;
// uniform mat4 projectionMatrix;
// uniform float uTime;
// varying vec2 vUv;
// void main() {  
//   vUv = uv;

//   vec3 pos = position;

//   gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
// }`

const fragmentShader = `
precision mediump float;

uniform vec2 u_res;
uniform vec2 u_size;
uniform float uOpacity;
uniform sampler2D u_texture;

vec2 cover(vec2 screenSize, vec2 imageSize, vec2 uv) {
float screenRatio = screenSize.x / screenSize.y;
float imageRatio = imageSize.x / imageSize.y;

vec2 newSize = screenRatio < imageRatio 
    ? vec2(imageSize.x * (screenSize.y / imageSize.y), screenSize.y)
    : vec2(screenSize.x, imageSize.y * (screenSize.x / imageSize.x));
vec2 newOffset = (screenRatio < imageRatio 
    ? vec2((newSize.x - screenSize.x) / 2.0, 0.0) 
    : vec2(0.0, (newSize.y - screenSize.y) / 2.0)) / newSize;

return uv * screenSize / newSize + newOffset;
}

varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  vec2 uvCover = cover(u_res, u_size, uv);
  vec4 texture = texture2D(u_texture, uvCover);

  gl_FragColor = texture;

  gl_FragColor.a = texture.a * uOpacity;
}
`


const fragmentShaderPlane = `
precision mediump float;
#define GLSLIFY 1

uniform float uProgress;
uniform float uOpacity;

uniform bool isSafari;

varying vec2 vUv;

vec3 mixColor(vec3 color, float progress) {
    return mix(vec3(0.737, 0.843, 0.871), color, progress);
  }     
void main() {  
  vec3 white = vec3(1.0);
  vec3 black = vec3(0.0);
  
  vec3 bwMix = mix(white, black, uProgress);
  
  // Safari\n  if (isSafari) {
    
  gl_FragColor.rgb = mixColor(bwMix, uOpacity);
  
  gl_FragColor.a = 1.0;        
  } else {
        gl_FragColor.rgb = bwMix;
            gl_FragColor.a = 1.0;
               gl_FragColor.a *= uOpacity;
                }    }
`


const geometry = new THREE.PlaneGeometry(1, 1, 1, 1)
const geometryPlane = new THREE.PlaneGeometry(1, 1, 1, 1)
const planeMaterial = new THREE.ShaderMaterial({
  fragmentShader: fragmentShaderPlane,
  vertexShader: vertexShader,
})
const material = new THREE.ShaderMaterial({
  fragmentShader: fragmentShader,
  vertexShader: vertexShader,
})



const App = () => {


  const mountRef = useRef(null);
  var cx = 0;
  var cy = 0;

  var max = { x: 0, y: 0 }

  var isDragging = false;
  var tl = gsap.timeline({ paused: true })
  var planes = []

  class MainMesh extends THREE.Object3D {
    init(i, size, position) {

      this.i = i
      this.x = 0
      this.y = 0
      this.size = size
      this.center = { value: 1 }
      this.spacing = spacing
      this.startPosition = position

      this.my = 1 - ((i % 5) * 0.1)
      this.createPlane()
    }

    createPlane() {
      this.plane = new Plane()
      this.plane.init(this.i, this.size)
      this.add(this.plane)
      this.plane.resize()
    }

    update = (pos, widthDividedByTwo) => {

      this.x = gsap.utils.wrap(
        (-widthDividedByTwo.x - this.spacing),
        widthDividedByTwo.x,
        this.startPosition.x + pos.x + 0
      )

      this.y = gsap.utils.wrap(
        (-widthDividedByTwo.y - this.spacing),
        widthDividedByTwo.y,
        this.startPosition.y + pos.y + 0.55
      )

      this.position.x = this.x * this.center.value
      this.position.y = this.y * this.center.value

    }

    hide() {
      //TODO

    }

    inCenter() {
      //TODO
    }

    reveal() {
      //TODO

    }
  }

  class Plane extends THREE.Object3D {
    init(i, size) {

      this.x = 0
      this.y = 0
      this.center = { value: 1 }

      this.my = 1 - ((i % 5) * 0.1)

      this.size = size
      this.geometry = new THREE.PlaneGeometry(size, size)

      this.material = planeMaterial.clone()
      this.isInCenter = false
      this.material.uniforms = {
        u_size: { value: new THREE.Vector2(1, 1) },
        u_diff: { value: 0 },
        uOpacity: { value: 100 },
        uProgress: { value: 0.92 },
      }


      this.mesh = new THREE.Mesh(this.geometry, this.material)
      this.mesh.renderOrder = 0
      this.add(this.mesh)
      this.resize()
    }


    resize() {

    }
  }

  useEffect(() => {

    var scene = new THREE.Scene();


    var camera = new THREE.PerspectiveCamera(35, ww / wh, 0.1, 1000
    )


    camera.position.set(0, 0, 5)

    console.log(scene.position)
    camera.lookAt(scene.position)


    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(ww, wh)

    renderer.setClearColor(0xffffff, 0);
    mountRef.current.appendChild(renderer.domElement);


    addPlanes();
    addEvents();
    addTick()
    resize()



    function addPlanes() {
      planes = []
      scene.clear()

      // for (let i = 0; i < 12; i++) {
      //   for (let j = 0; j < 12; j++) {
      //     const plane = new MainMesh()
      //     plane.init(i, new THREE.Vector3((170 * i), (170 * j), 0))
      //     planes.push(plane)
      //     scene.add(plane)
      //   }
      // }


      ///////

      ////

      // const plane1 = new MainMesh()
      // plane1.init(i, new THREE.Vector3((170 * i), (170 * j), 0))
      // planes.push(plane1)
      // scene.add(plane1)


      let index = 1

      const e = new MainMesh()
      e.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize, bounds.halfSmallSize, 0))
      planes.push(e)
      scene.add(e)

      const n = new MainMesh()
      n.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize + bounds.smallSize + spacing, bounds.halfSmallSize, 0))
      planes.push(n)
      scene.add(n)

      const s = new MainMesh()
      s.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize + 2 * bounds.smallSize + 2 * spacing, bounds.halfSmallSize, 0))
      planes.push(s)
      scene.add(s)

      const i = new MainMesh()
      i.init(index++, bounds.largeSize, new THREE.Vector3(bounds.halfLargeSize + 3 * bounds.smallSize + 3 * spacing, bounds.halfLargeSize, 0))
      planes.push(i)
      scene.add(i)

      const o = new MainMesh()
      o.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize + 5 * bounds.smallSize + 5 * spacing, bounds.halfSmallSize, 0))
      planes.push(o)
      scene.add(o)

      const a = new MainMesh()
      a.init(index++, bounds.largeSize, new THREE.Vector3(bounds.halfLargeSize + 6 * bounds.smallSize + 6 * spacing, bounds.halfLargeSize, 0))
      planes.push(a)
      scene.add(a)

      const u = new MainMesh()
      u.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize, bounds.halfSmallSize + bounds.smallSize + spacing, 0))
      planes.push(u)
      scene.add(u)

      const c = new MainMesh()
      c.init(index++, bounds.largeSize, new THREE.Vector3(bounds.halfLargeSize + 1 * bounds.smallSize + spacing, bounds.largeSize + .5 * spacing, 0))
      planes.push(c)
      scene.add(c)

      const l = new MainMesh()
      l.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize + 5 * bounds.smallSize + 5 * spacing, bounds.halfSmallSize + bounds.smallSize + spacing, 0))
      planes.push(l)
      scene.add(l)

      const d = new MainMesh()
      d.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize, bounds.halfSmallSize + 2 * bounds.smallSize + 2 * spacing, 0))
      planes.push(d)
      scene.add(d)

      const f = new MainMesh()
      f.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize + 3 * bounds.smallSize + 3 * spacing, bounds.halfSmallSize + 2 * bounds.smallSize + 2 * spacing, 0))
      planes.push(f)
      scene.add(f)

      const h = new MainMesh()
      h.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize + 4 * bounds.smallSize + 4 * spacing, bounds.halfSmallSize + 2 * bounds.smallSize + 2 * spacing, 0))
      planes.push(h)
      scene.add(h)

      const m = new MainMesh()
      m.init(index++, bounds.largeSize, new THREE.Vector3(bounds.halfLargeSize + 5 * bounds.smallSize + 5 * spacing, bounds.largeSize + bounds.halfLargeSize + spacing, 0))
      planes.push(m)
      scene.add(m)

      const g = new MainMesh()
      g.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize + 7 * bounds.smallSize + 7 * spacing, bounds.halfSmallSize + 2 * bounds.smallSize + 2 * spacing, 0))
      planes.push(g)
      scene.add(g)

      const v = new MainMesh()
      v.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize, bounds.halfSmallSize + 3 * bounds.smallSize + 3 * spacing, 0))
      planes.push(v)
      scene.add(v)

      const D = new MainMesh()
      D.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize + 1 * bounds.smallSize + spacing, bounds.halfSmallSize + 3 * bounds.smallSize + 3 * spacing, 0))
      planes.push(D)
      scene.add(D)

      const x = new MainMesh()
      x.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize + 2 * bounds.smallSize + 2 * spacing, bounds.halfSmallSize + 3 * bounds.smallSize + 3 * spacing, 0))
      planes.push(x)
      scene.add(x)

      const y = new MainMesh()
      y.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize + 3 * bounds.smallSize + 3 * spacing, bounds.halfSmallSize + 3 * bounds.smallSize + 3 * spacing, 0))
      planes.push(y)
      scene.add(y)

      const w = new MainMesh()
      w.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize + 4 * bounds.smallSize + 4 * spacing, bounds.halfSmallSize + 3 * bounds.smallSize + 3 * spacing, 0))
      planes.push(w)
      scene.add(w)

      const b = new MainMesh()
      b.init(index++, bounds.smallSize, new THREE.Vector3(bounds.halfSmallSize + 7 * bounds.smallSize + 7 * spacing, bounds.halfSmallSize + 3 * bounds.smallSize + 3 * spacing, 0))
      planes.push(b)
      scene.add(b)

      //////

      const C = ["Gudupop", "Charm", "Threads", "Monsoon", "Gates", "Disarray", "Colorcase", "Nacre"];
      for (let e = 0; e < 8; e++) {
        let n = 20 + e;
        const b = new MainMesh()
        const s = new THREE.Vector3(bounds.halfSmallSize + e * (1 + spacing), bounds.halfSmallSize + 4 * bounds.smallSize + 4 * spacing, 0)
        b.init(index++, bounds.smallSize, s)
        planes.push(b)
        scene.add(b)
      }

      ///////


      planes.forEach((t => {
        t.startPosition.x -= bounds.width / 2;
        t.startPosition.y -= bounds.height / 2;
        t.position.x -= bounds.width / 2;
        t.position.y -= bounds.height / 2
      }))
    }

    function addTick() {
      gsap.ticker.add(tick)
    }

    function addEvents() {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mousedown', onMouseDown)
      window.addEventListener('mouseup', onMouseUp)
      window.addEventListener('wheel', onWheel)
    }

    function removeEvents() {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('wheel', onWheel)

    }

    function resize() {
      wh = window.innerHeight
      ww = window.innerWidth
      const { bottom, right } = document.querySelector('.js-grid').getBoundingClientRect()

      max.x = right
      max.y = bottom
    }

    let target = new THREE.Vector3()
    let on = new THREE.Vector3()
    let mouse = new THREE.Vector3()
    let wheel = new THREE.Vector3()

    function onMouseMove(t) {

      let n = t.clientX;
      let s = t.clientY;
      mouse.x = n / ww * 2 - 1;
      mouse.y = -s / wh * 2 + 1


      if (isDragging) {
        target.set(on.x + 2.5 * n, on.y - 2.5 * s)
      }

    }

    function onMouseDown(t) {
      if (isDragging) return
      let n = t.clientX;
      let s = t.clientY;
      isDragging = true;
      on.set(target.x - 2.5 * n, target.y + 2.5 * s)
    }


    function onMouseUp(t) {
      if (isDragging) {
        isDragging = false
      }
    }

    function onWheel(e) {

      const { mouse, firefox } = multipliers
      wheel.x = e.wheelDeltaX || e.deltaX * -1
      wheel.y = e.wheelDeltaY || e.deltaY * -1

      if (isFirefox && e.deltaMode === 1) {
        wheel.x *= firefox
        wheel.y *= firefox
      }

      wheel.y *= mouse
      wheel.x *= mouse
      target.x += wheel.x;
      target.y -= wheel.y


    }

    function tick() {
      const xDiff = target.x - cx
      const yDiff = target.y - cy

      cx += xDiff * 0.085
      cx = Math.round(cx * 100) / 100

      cy += yDiff * 0.085
      cy = Math.round(cy * 100) / 100

      planes.length
        && planes.forEach(plane =>
          plane.update({ x: cx, y: cy }, { x: bounds.width / 2, y: bounds.height / 2 }))

      renderer.render(scene, camera)
    }



    return () => mountRef.current.removeChild(renderer.domElement);
  }, []);

  return (
    <>
      <div className="background"></div>
      <div ref={mountRef}></div>
      <div className="grid js-grid">
      </div>
    </>
  );
}



export default App;