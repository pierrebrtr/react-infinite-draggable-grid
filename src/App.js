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
}
`

const geometry = new THREE.PlaneGeometry(1, 1, 1, 1)
const material = new THREE.ShaderMaterial({
  fragmentShader,
  vertexShader,
})


const App = () => {


  const mountRef = useRef(null);
  var tx = 0;
  var ty = 0;
  var cx = 0;
  var cy = 0;
  var diff = 0;

  var wheel = { x: 0, y: 0 }
  var on = { x: 0, y: 0 }
  var max = { x: 0, y: 0 }

  var isDragging = false;
  var tl = gsap.timeline({ paused: true })
  var el = document.querySelector('.js-grid')
  var planes = []

  class Plane extends THREE.Object3D {
    init(el, i) {
      this.el = el
      this.x = 0
      this.y = 0

      this.my = 1 - ((i % 5) * 0.1)

      this.geometry = geometry
      this.material = material.clone()

      this.material.uniforms = {
        u_texture: { value: 0 },
        u_res: { value: new THREE.Vector2(1, 1) },
        u_size: { value: new THREE.Vector2(1, 1) },
        u_diff: { value: 0 }
      }

      this.texture = loader.load(this.el.dataset.src, (texture) => {
        texture.minFilter = THREE.LinearFilter
        texture.generateMipmaps = false

        const { naturalWidth, naturalHeight } = texture.image
        const { u_size, u_texture } = this.material.uniforms

        u_texture.value = texture
        u_size.value.x = naturalWidth
        u_size.value.y = naturalHeight
      })

      this.mesh = new THREE.Mesh(this.geometry, this.material)
      this.add(this.mesh)

      this.resize()
    }

    update = (x, y, max, diff) => {
      const { right, bottom } = this.rect
      const { u_diff } = this.material.uniforms

      this.y = gsap.utils.wrap(
        -(max.y - bottom),
        bottom,
        y * this.my
      ) - this.yOffset

      this.x = gsap.utils.wrap(
        -(max.x - right),
        right,
        x
      ) - this.xOffset

      u_diff.value = diff

      this.position.x = this.x
      this.position.y = this.y
    }

    resize() {

      this.rect = this.el.getBoundingClientRect()
      const { left, top, width, height } = this.rect

      const { u_res, u_toRes, u_pos, u_offset } = this.material.uniforms

      this.xOffset = (left + (width / 2)) - (ww / 2)
      this.yOffset = (top + (height / 2)) - (wh / 2)

      this.position.x = this.xOffset
      this.position.y = this.yOffset

      u_res.value.x = width
      u_res.value.y = height

      this.mesh.scale.set(width, height, 1)
    }
  }


  useEffect(() => {

    var scene = new THREE.Scene();

    var camera = new THREE.OrthographicCamera(
      ww / -2, ww / 2, wh / 2, wh / -2, 1, 1000
    )

    camera.lookAt(scene.position)
    camera.position.z = 1

    var renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(ww, wh)
    renderer.setPixelRatio(
      gsap.utils.clamp(1, 1.5, window.devicePixelRatio)
    )

    mountRef.current.appendChild(renderer.domElement);
    addPlanes();
    addEvents();
    resize()

    function addPlanes() {
      const planesDiv = [...document.querySelectorAll('.js-plane')]


      planesDiv.map((el, i) => {
        const plane = new Plane()
        plane.init(el, i)
        scene.add(plane)
        planes.push(plane)
      })

    }

    function addEvents() {
      gsap.ticker.add(tick)

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mousedown', onMouseDown)
      window.addEventListener('mouseup', onMouseUp)
      window.addEventListener('wheel', onWheel)
    }

    function resize() {
      wh = window.innerHeight
      ww = window.innerWidth
      const { bottom, right } = document.querySelector('.js-grid').getBoundingClientRect()

      max.x = right
      max.y = bottom
    }

    function onMouseMove({ clientX, clientY }) {
      if (!isDragging) return
      tx = on.x + clientX * 2.5
      ty = on.y - clientY * 2.5
    }

    function onMouseDown({ clientX, clientY }) {
      if (isDragging) return

      isDragging = true

      on.x = tx - clientX * 2.5
      on.y = ty + clientY * 2.5
    }

    function onMouseUp({ clientX, clientY }) {
      if (!isDragging) return

      isDragging = false
    }

    function tick() {

      const xDiff = tx - cx
      const yDiff = ty - cy

      cx += xDiff * 0.085
      cx = Math.round(cx * 100) / 100

      cy += yDiff * 0.085
      cy = Math.round(cy * 100) / 100

      diff = Math.max(
        Math.abs(yDiff * 0.0001),
        Math.abs(xDiff * 0.0001)
      )

      planes.length
        && planes.forEach(plane =>
          plane.update(cx, cy, max, diff))

      renderer.render(scene, camera)

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

      tx += wheel.x
      ty -= wheel.y
    }

    return () => mountRef.current.removeChild(renderer.domElement);
  }, []);

  return (
    <>
      <div ref={mountRef}></div>
      <div className="grid js-grid">
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1454496522488-7a8e488e8606?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1476&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1454496522488-7a8e488e8606?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1476&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1454496522488-7a8e488e8606?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1476&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1454496522488-7a8e488e8606?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1476&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80"></figure></div>
        <div><figure className="js-plane" data-src="https://images.unsplash.com/photo-1454496522488-7a8e488e8606?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1476&q=80"></figure></div>
      </div>
    </>
  );
}

export default App;