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

  class MainMesh extends THREE.Object3D {
    init(el, i) {
      this.el = el
      this.i = i
      this.x = 0
      this.y = 0
      this.center = { value: 1 }



      this.my = 1 - ((i % 5) * 0.1)
      this.createArt()
      this.createPlane()
    }

    createArt() {
      this.art = new ArtPlane()
      this.art.init(this.el, this.i)
      this.add(this.art)
      this.art.resize()
    }

    createPlane() {
      this.plane = new Plane()
      this.plane.init(this.el, this.i)
      this.add(this.plane)
      this.plane.resize()
    }

    update = (x, y, max, diff) => {
      this.art.update(x, y, max, diff)
      this.plane.update(x, y, max, diff)
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
    init(el, i) {
      this.el = el
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
        uProgress: { value: 0.02 },
      }


      this.mesh = new THREE.Mesh(this.geometry, this.material)
      this.mesh.renderOrder = 0
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

      this.position.x = this.x * this.center.value
      this.position.y = this.y * this.center.value
    }

    hide() {
      //TODO
    }




    resize() {

      this.rect = this.el.getBoundingClientRect()
      const { left, top, width, height } = this.rect


      this.xOffset = (left + (width / 2)) - (ww / 2)
      this.yOffset = (top + (height / 2)) - (wh / 2)

      this.position.x = this.xOffset
      this.position.y = this.yOffset


      this.mesh.scale.set(width, height, 1)
    }
  }

  class ArtPlane extends THREE.Object3D {
    init(el, i) {
      this.el = el
      this.x = 0
      this.y = 0
      this.center = { value: 1 }

      this.my = 1 - ((i % 5) * 0.1)

      this.geometry = geometry
      this.material = material.clone()
      this.isInCenter = false
      this.material.uniforms = {
        u_texture: { value: 0 },
        u_res: { value: new THREE.Vector2(1, 1) },
        u_size: { value: new THREE.Vector2(1, 1) },
        u_diff: { value: 0 },
        uOpacity: { value: 100 },
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
      this.mesh.renderOrder = 1
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

      this.position.x = this.x * this.center.value
      this.position.y = this.y * this.center.value
    }

    hide() {
      //this.material.uniforms.uOpacity.value = 0
      if (!this.isInCenter) {
        this.mesh.renderOrder = 0
        gsap.fromTo(this.material.uniforms.uOpacity, {
          value: 1,
        }, {
          value: 0,
          duration: 1,
          ease: "expo.inOut"
        })
      }

    }

    inCenter() {
      this.mesh.renderOrder = 1
      this.isInCenter = true
      const mesh = this.mesh
      gsap.to(this.center, {
        value: 0, duration: 1, ease: "expo.inOut"
      }
      )
      this.currentOffset = this.position
    }


    reveal() {
      if (this.isInCenter) {
        const mesh = this.mesh
        gsap.to(this.center, {
          value: 1, duration: 1, ease: "expo.inOut"
        }
        ).then(() => {
          this.mesh.renderOrder = 0
          this.isInCenter = false
        })
      } else {

        gsap.fromTo(this.material.uniforms.uOpacity, {
          value: 0,
        }, {
          value: 1,
          duration: 1,
          ease: "expo.inOut"
        })

      }

    }

    resize() {

      this.rect = this.el.getBoundingClientRect()
      console.log(this.rect)
      const { left, top, width, height } = this.rect

      const { u_res, u_toRes, u_pos, u_offset } = this.material.uniforms

      this.xOffset = (left + (width / 2)) - (ww / 2)
      this.yOffset = (top + (height / 2)) - (wh / 2)

      this.position.x = this.xOffset
      this.position.y = this.yOffset

      u_res.value.x = width
      u_res.value.y = height

      this.mesh.scale.set(width / 1.3, height / 1.3, 1)
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

    console.log(scene)


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



    function addPlanes() {
      let planesDiv = []
      planes = []
      scene.clear()
      planesDiv = [...document.querySelectorAll('.js-plane')]
      planesDiv.map((el, i) => {
        const plane = new MainMesh()
        plane.init(el, i)
        planes.push(plane)
        scene.add(plane)
      })

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
      window.removeEventListener('click', click)
    }

    function removeEvents() {


      // window.addEventListener('tick', tick)

      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('wheel', onWheel)
      window.addEventListener('click', click)
    }

    function resize() {
      wh = window.innerHeight
      ww = window.innerWidth
      const { bottom, right } = document.querySelector('.js-grid').getBoundingClientRect()

      max.x = right
      max.y = bottom
    }

    let clickPos = { x: 0, y: 0 }


    function onMouseMove({ clientX, clientY }) {
      if (!isOpen) {
        if (!isDragging) return

        tx = on.x + clientX * 2.5
        ty = on.y - clientY * 2.5
      }
    }

    function onMouseDown({ clientX, clientY }) {
      if (isDragging) return
      isDragging = true
      clickPos = { x: clientX, y: clientY }
      on.x = tx - clientX * 2.5
      on.y = ty + clientY * 2.5
    }


    function hideElements(obj) {
      const tempPlanes = planes.filter(plane => plane != obj.parent)
      obj.isInCenter = true
      tempPlanes.map((plane) => {
        plane.hide()
      })
    }

    function revealElements() {
      planes.map((plane) => {
        plane.reveal()
      })
    }

    async function click() {

      if (!isOpen) {
        var mouse = new THREE.Vector2();
        mouse.x = (clickPos.x / window.innerWidth) * 2 - 1;
        mouse.y = -(clickPos.y / window.innerHeight) * 2 + 1;

        var raycaster = new THREE.Raycaster();
        //update the picking ray with the camera and mouse position	
        raycaster.setFromCamera(mouse, camera);


        //calculate objects intersecting the picking ray
        var intersects = raycaster.intersectObjects(scene.children);
        var obj = intersects[0].object;
        hideElements(obj)
        obj.parent.inCenter()
        await delay(1500);
        removeEvents()
      } else {
        revealElements()
        await delay(1500);

        addEvents()
      }
      isOpen = !isOpen
    }

    function onMouseUp({ clientX, clientY }) {

      if (!isDragging) return
      if (clickPos.x === clientX && clickPos.y === clientY) {
        click()
      }
      isDragging = false
    }

    function tick() {

      if (!isOpen) {
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
      }

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
      <div className="background"></div>
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