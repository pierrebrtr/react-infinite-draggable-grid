import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";


let ww = window.innerWidth
let wh = window.innerHeight
const isFirefox = navigator.userAgent.indexOf('Firefox') > -1
const isWindows = navigator.appVersion.indexOf("Win") != -1

const mouseMultiplier = .6
const firefoxMultiplier = 20

const multipliers = {
  mouse: isWindows ? mouseMultiplier * 2 : mouseMultiplier,
  firefox: isWindows ? firefoxMultiplier * 2 : firefoxMultiplier
}

const loader = new THREE.TextureLoader()

const vertexShader = `
precision mediump float;

uniform float u_diff;

varying vec2 vUv;

void main(){
vec3 pos = position;

pos.y *= 1. - u_diff;
pos.x *= 1. - u_diff;

vUv = uv;
gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.);;
}
`

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
    init(i, position) {

      this.i = i
      this.x = 0
      this.y = 0
      this.center = { value: 1 }
      this.spacing = 0
      this.startPosition = position

      this.my = 1 - ((i % 5) * 0.1)
      this.createPlane()
    }

    createPlane() {
      this.plane = new Plane()
      this.plane.init(this.i)
      this.add(this.plane)
      this.plane.resize()
    }

    update = (pos, widthDividedByTwo) => {

      this.x = gsap.utils.wrap(
        -(widthDividedByTwo.x - this.spacing),
        widthDividedByTwo.x,
        this.startPosition.x + pos.x + 0
      )

      this.y = gsap.utils.wrap(
        -(widthDividedByTwo.y - this.spacing),
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
    init(i) {

      this.x = 0
      this.y = 0
      this.center = { value: 1 }

      this.my = 1 - ((i % 5) * 0.1)


      this.geometry = geometryPlane
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
      this.mesh.scale.set(150, 150, 1)
    }
  }


  const delay = ms => new Promise(
    resolve => setTimeout(resolve, ms)
  );

  useEffect(() => {

    var scene = new THREE.Scene();

    var camera = new THREE.OrthographicCamera(
      ww / -2, ww / 2, wh / 2, wh / -2, 1, 1000
    )

    camera.lookAt(scene.position)
    camera.position.z = 1

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(ww, wh)
    renderer.setPixelRatio(
      gsap.utils.clamp(1, 1.5, window.devicePixelRatio)
    )

    renderer.setClearColor(0xffffff, 0);
    mountRef.current.appendChild(renderer.domElement);

    addPlanes();
    addEvents();
    addTick()
    resize()

    function addPlanes() {
      planes = []
      scene.clear()

      const plane = new MainMesh()
      plane.init(1, new THREE.Vector3(0, 0, 0))
      planes.push(plane)
      scene.add(plane)

      const plane2 = new MainMesh()
      plane2.init(2, new THREE.Vector3(170, 0, 0))
      planes.push(plane2)
      scene.add(plane2)

      const plane3 = new MainMesh()
      plane3.init(3, new THREE.Vector3(340, 0, 0))
      planes.push(plane3)
      scene.add(plane3)

      const plane4 = new MainMesh()
      plane4.init(3, new THREE.Vector3(0, 170, 0))
      planes.push(plane4)
      scene.add(plane4)


      const plane5 = new MainMesh()
      plane5.init(3, new THREE.Vector3(170, 170, 0))
      planes.push(plane5)
      scene.add(plane5)

      const plane6 = new MainMesh()
      plane6.init(3, new THREE.Vector3(340, 170, 0))
      planes.push(plane6)
      scene.add(plane6)

      const plane7 = new MainMesh()
      plane7.init(3, new THREE.Vector3(0, 340, 0))
      planes.push(plane7)
      scene.add(plane7)

      const plane8 = new MainMesh()
      plane8.init(3, new THREE.Vector3(170, 340, 0))
      planes.push(plane8)
      scene.add(plane8)

      const plane9 = new MainMesh()
      plane9.init(3, new THREE.Vector3(340, 340, 0))
      planes.push(plane9)
      scene.add(plane9)


      planes.forEach((t => {
        t.startPosition.x -= 150 / 2;
        t.startPosition.y -= 150 / 2;
        t.position.x -= 150 / 2;
        t.position.y -= 150 / 2
      }))

    }

    let currentOffset = { x: 0, y: 0 }
    let isOpen = false

    function addTick() {
      gsap.ticker.add(tick)
    }

    function addEvents() {


      // window.addEventListener('tick', tick)

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mousedown', onMouseDown)
      window.addEventListener('mouseup', onMouseUp)
      window.addEventListener('wheel', onWheel)
    }

    function removeEvents() {


      // window.addEventListener('tick', tick)

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

    let clickPos = { x: 0, y: 0 }




    let current = new THREE.Vector3()
    let target = new THREE.Vector3()
    let on = new THREE.Vector3()
    let mouse = new THREE.Vector3()
    let wheel = new THREE.Vector3()
    let pos = new THREE.Vector3(0, 0)
    let vel = new THREE.Vector3()

    function onMouseMove(t) {

      let n = t.clientX;
      let s = t.clientY;
      mouse.x = n / ww * 2 - 1;
      mouse.y = -s / wh * 2 + 1;

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
          plane.update({ x: cx, y: cy }, { x: ww / 1.5, y: wh / 1.5 }))

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