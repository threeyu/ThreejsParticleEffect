class ThreeDWorld {
  constructor(canvasContainer) {
    // canvas
    this.container = canvasContainer || document.body;
    // 场景
    this.createScene();
    // 灯光
    this.createLights();
    // stats
    this.initStats();
    // 物体添加
    this.addObjs();
    // 鼠标插件
    // this.orbitControls = new THREE.OrbitControls(this.camera);
    // this.orbitControls.autoRotate = true;

    this.update();
  }
  createScene() {
    this.HEIGHT = window.innerHeight;
    this.WIDTH = window.innerWidth;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x05050c, 0.0005);

    let aspectRatio = this.WIDTH / this.HEIGHT;
    let fieldOfView = 60;
    let nearPlane = 1;
    let farPlane = 10000;
    this.camera = new THREE.PerspectiveCamera(
      fieldOfView,
      aspectRatio,
      nearPlane,
      farPlane
    );

    this.camera.position.x = 0;
    this.camera.position.z = 150;
    this.camera.position.y = 0;

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });

    this.renderer.setClearColor(this.scene.fog.color);
    this.renderer.setSize(this.WIDTH, this.HEIGHT);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.container.appendChild(this.renderer.domElement);

    window.addEventListener("resize", this.handleWindowResize.bind(this), false);
  }
  createLights() {
    // 户外光源
    this.hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9);

    // 环境光源
    this.ambientLight = new THREE.AmbientLight(0xdc8874, .2);

    // 方向光
    this.shadowLight = new THREE.DirectionalLight(0xffffff, .9);
    this.shadowLight.position.set(50, 50, 50);
    this.shadowLight.castShadow = true;
    this.shadowLight.shadow.camera.left = -400;
    this.shadowLight.shadow.camera.right = 400;
    this.shadowLight.shadow.camera.top = 400;
    this.shadowLight.shadow.camera.bottom = -400;
    this.shadowLight.shadow.camera.near = 1;
    this.shadowLight.shadow.camera.far = 1000;
    // 定义阴影的分辨率；虽然分辨率越高越好，但是需要付出更加昂贵的代价维持高性能的表现。
    this.shadowLight.shadow.mapSize.width = 2048;
    this.shadowLight.shadow.mapSize.height = 2048;

    this.scene.add(this.hemisphereLight);
    this.scene.add(this.shadowLight);
    this.scene.add(this.ambientLight);
  }
  initStats() {
    this.stats = new Stats();
    this.stats.domElement.style.position = "absolute";
    this.stats.domElement.style.bottom = "0px";
    this.stats.domElement.style.zIndex = 100;
    this.container.appendChild(this.stats.domElement);
  }
  handleWindowResize() {
    this.HEIGHT = window.innerHeight;
    this.WIDTH = window.innerWidth;
    this.renderer.setSize(this.WIDTH, this.HEIGHT);
    this.camera.aspect = this.WIDTH / this.HEIGHT;
    this.camera.updateProjectionMatrix();
  }

  // 自定义模型加载
  loader(pathArr) {
    let jsonLoader = new THREE.JSONLoader();
    let fbxLoader = new THREE.FBXLoader();
    let mtlLoader = new THREE.MTLLoader();
    let objLoader = new THREE.OBJLoader();
    let basePath, pathName, pathFomat;
    let promiseArr = pathArr.map((path) => {
      basePath = path.substring(0, path.lastIndexOf("/") + 1);
      pathName = path.substring(path.lastIndexOf("/") + 1, path.lastIndexOf("."));
      pathName = pathName === "json" ? "js" : pathName;
      pathFomat = path.substring(path.lastIndexOf(".") + 1).toLowerCase();
      switch (pathFomat) {
        case "json":
          return new Promise(function (resolve) {
            jsonLoader.load(path, (geometry, material) => {
              resolve({
                geometry: geometry,
                material: material
              })
            });
          });
          break;
        case "fbx":
          return new Promise(function (resolve) {
            fbxLoader.load(path, (object) => {
              resolve(object);
            });
          });
          break;
        case "obj":
          return new Promise(function (resolve) {
            objLoader.load(path, (object) => {
              resolve(object);
            });
          });
          break;
        default:
          return "";
      }
    });
    return Promise.all(promiseArr);
  }

  addObjs() {
    this.loader(["./public/assets/qr.json"]).then((result) => {
      let obj1 = result[0].geometry;
      obj1.scale(100, 100, 100);
      
      this.addPartices(obj1);
    });
  }

  toBufferGeometry(geometry) {
    if (geometry.type === "BufferGeometry") return geometry;
    return new THREE.BufferGeometry().fromGeometry(geometry);
  }

  addPartices(obj1) {
    obj1 = this.toBufferGeometry(obj1);
    let moreObj = obj1

    let morePos = moreObj.attributes.position.array;
    let moreLen = morePos.length;

    let sizes = new Float32Array(moreLen);
    for (let i = 0; i < moreLen; i++) {
      sizes[i] = 4;
    }

    moreObj.addAttribute("size", new THREE.BufferAttribute(sizes, 1));

    let uniforms = {
      color: {
        type: "v3",
        value: new THREE.Color(0xffffff)
      },
      texture: {
        value: this.getTexture(64)
      },
      val: {
        value: 1.0
      }
    };

    let shaderMaterial = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: document.getElementById("vertexshader").textContent,
      fragmentShader: document.getElementById("fragmentshader").textContent,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true
    });

    let particleSystem = new THREE.Points(moreObj, shaderMaterial);
    this.scene.add(particleSystem);
    this.particleSystem = particleSystem;
  }
  getTexture(canvasSize = 64) {
    let canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    canvas.style.background = "transparent";
    let context = canvas.getContext("2d");
    let gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.width / 8, canvas.width / 2, canvas.height / 2, canvas.width / 2);
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(1, "transparent");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2, true);
    context.fill();
    let texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
  update() {
    TWEEN.update();
    this.stats.update();
    let time = Date.now() * 0.005;
    // if (this.particleSystem) {
    //   this.particleSystem.rotation.y += 0.01;
    // }
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => {
      this.update()
    });
  }
}

function onLoad() {
  new ThreeDWorld(document.getElementById("main"));
}