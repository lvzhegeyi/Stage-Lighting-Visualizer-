// ========== THREE.js基础初始化 ==========
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true,powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ========== 场景基础设置 ==========
// 环境光
scene.add(new THREE.AmbientLight(0x404040));

// 全局光照
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
scene.add(hemisphereLight);

// 删除坐标系辅助
// scene.add(new THREE.AxesHelper(10));  

// 相机位置
camera.position.set(0, 10, 45);
camera.lookAt(0, 0, 0);

// ========== 舞台尺寸系统 ==========
const stageSize = {
  width: 90,
  depth: 40,
  height: 5
};

const stageGeometry = new THREE.BoxGeometry(stageSize.width, stageSize.height, stageSize.depth);
const stageMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
const stage = new THREE.Mesh(stageGeometry, stageMaterial);
stage.receiveShadow = true;
scene.add(stage);

function updateStageSize() {
  stage.geometry.dispose();
  stage.geometry = new THREE.BoxGeometry(
    stageSize.width, 
    stageSize.height, 
    stageSize.depth
  );
  
  // 更新所有光束灯的边界检查
  lightManager.lights.forEach(light => {
    if (light instanceof BeamLight) {
      light.updateBeamLength();
    }
  });
}

// ========== 灯具基类 ==========
class BaseLight {
  static materialCache = new Map();
  static lightCounter = 0; // 添加静态计数器

  constructor() {
    this.uuid = THREE.MathUtils.generateUUID();
    this.group = new THREE.Group();
    this.light = null;
    this.body = null;
    this.type = 'base';
    this.id = ++BaseLight.lightCounter; // 分配唯一ID
    this.axesHelper = this.createAxisHelper(5); // 参数为坐标轴长度
    this.axesHelper.visible = false;
    this.group.add(this.axesHelper)
    this.createOutline(); // 添加这行
    this.createIDLabel(); // 创建ID标签
  }

  // 创建ID标签
  createIDLabel() {
    // 创建Canvas来绘制文本
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    // 设置背景
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // 设置文本样式
    context.fillStyle = 'white';
    context.font = 'bold 24px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", "SimHei", "SimSun", "NSimSun", "FangSong", "KaiTi", "STHeiti", "STKaiti", "STSong", "STFangsong", "STZhongsong", "STLiti", Arial, Helvetica, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // 绘制ID文本
    context.fillText(`ID:${this.id}`, canvas.width / 2, canvas.height / 2);
    
    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // 创建材质
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      opacity: 0.8
    });
    
    // 创建精灵
    this.idLabel = new THREE.Sprite(material);
    this.idLabel.scale.set(2, 1, 1); // 调整大小
    this.idLabel.position.set(0, 1.5, 0); // 位置在灯具上方
    this.idLabel.visible = false; // 设置默认隐藏
    
    // 添加到组中
    this.group.add(this.idLabel);
  }

  // 更新ID标签
  updateIDLabel() {
    if (this.idLabel && this.idLabel.material.map) {
      const canvas = this.idLabel.material.map.image;
      const context = canvas.getContext('2d');
      
      // 清除画布
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // 重新绘制背景
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // 重新绘制文本
      context.fillStyle = 'white';
      context.font = 'bold 24px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", "SimHei", "SimSun", "NSimSun", "FangSong", "KaiTi", "STHeiti", "STKaiti", "STSong", "STFangsong", "STZhongsong", "STLiti", Arial, Helvetica, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(`ID:${this.id}`, canvas.width / 2, canvas.height / 2);
      
      // 更新纹理
      this.idLabel.material.map.needsUpdate = true;
    }
  }

  // 切换ID标签显示
  toggleIDLabel() {
    if (this.idLabel) {
      this.idLabel.visible = !this.idLabel.visible;
    }
  }

  // 设置ID标签显示状态
  setIDLabelVisible(visible) {
    if (this.idLabel) {
      this.idLabel.visible = visible;
    }
  }

  // 获取复用的材质
  static getMaterial(color, map = null) { 
    const key = `${color}-${map}`;
    if (!this.materialCache.has(key)) {
      const material = new THREE.MeshBasicMaterial({ color, map });
      this.materialCache.set(key, material);
    }
    return this.materialCache.get(key);
  }

  setColor(color) {
    if (this.light) this.light.color.set(color);
    if (this.body) {
      // 设置反色
      if (this.outline) {
        const invertedColor = new THREE.Color(color).multiplyScalar(-1).addScalar(1);
        this.outline.material.color.copy(invertedColor);
      }
    }
  }

  setIntensity(intensity) {
    if (this.light) this.light.intensity = intensity;
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  setRotation(x, y, z) {
    this.group.rotation.set(x, y, z);
  }

  getLightType() {
    return this.type;
  }

  toggleAxesHelper() {
    this.axesHelper.visible = !this.axesHelper.visible;
  }

  createAxisHelper(length) {
    const axes = new THREE.Group();
    
    const createAxis = (direction, color) => {
      // 创建主箭头
      const arrow = new THREE.ArrowHelper(
        direction,
        new THREE.Vector3(0, 0, 0),
        length,
        color,
        length * 0.2,
        length * 0.1
      );

      // 添加白色线框
      const edges = new THREE.EdgesGeometry(arrow.cone.geometry);
      const wireframe = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ 
          color: 0xffffff,
          linewidth: 2
        })
      );
      wireframe.visible = false;
      arrow.cone.add(wireframe);
      arrow.userData.wireframe = wireframe;

      // 添加交互球体
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(length * 0.15),
        new THREE.MeshBasicMaterial({ 
          color: 0xffffff,
          transparent: true,
          opacity: 0.01 // 几乎透明但仍然可以被射线检测到
        })
      );
      sphere.position.copy(direction.clone().multiplyScalar(length));
      arrow.add(sphere);
      sphere.userData.arrow = arrow;

      return arrow;
    };

    // 创建三轴
    axes.add(createAxis(new THREE.Vector3(1, 0, 0), 0xff0000));
    axes.add(createAxis(new THREE.Vector3(0, 1, 0), 0x00ff00));
    axes.add(createAxis(new THREE.Vector3(0, 0, 1), 0x0000ff));

    return axes;
  }

  // 添加创建反色勾边的方法
  createOutline() {
    if (this.body) {
      // 创建略大的外轮廓几何体
      const outlineGeometry = this.body.geometry.clone();
      outlineGeometry.scale(1.05, 1.05, 1.05);
      
      // 创建反色材质
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.3
      });
      
      // 创建外轮廓网格
      this.outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
      this.outline.rotation.copy(this.body.rotation);
      this.group.add(this.outline);
    }
  }

  lookAt(position) {
    // 计算从灯具位置到目标位置的方向向量
    const direction = new THREE.Vector3().subVectors(position, this.group.position).normalize();
    
    // 创建一个向量，表示灯具本地坐标系中的"向下"方向
    const lightDownDirection = new THREE.Vector3(0, -1, 0);
    
    // 使用四元数计算旋转，将灯具朝向目标
    this.group.quaternion.setFromUnitVectors(lightDownDirection, direction);
    
    // 如果是光束灯，更新光束长度
    if (this instanceof BeamLight) {
      this.updateBeamLength();
    }
  }

  // 获取灯具ID
  getID() {
    return this.id;
  }

  // 设置ID标签位置（根据灯具类型调整）
  setIDLabelPosition() {
    if (this.idLabel) {
      let yOffset = 1.5; // 默认偏移
      
      // 根据灯具类型调整位置
      if (this instanceof BeamLight) {
        yOffset = 2.0; // 光束灯较高
      } else if (this instanceof FlatLight) {
        yOffset = 1.8; // 面光灯稍高
      } else if (this instanceof RGBLight) {
        yOffset = 1.2; // RGB灯较低
      }
      
      this.idLabel.position.set(0, yOffset, 0);
    }
  }
}

// ========== 具体灯具实现 ==========

class FlatLight extends BaseLight {
    constructor() {
      super();
      this.type = 'flat';
      
      // SpotLight
      this.light = new THREE.SpotLight(0xf2bd83, 2);
      this.light.angle = Math.PI / 8; // 设置光束角度
      this.light.penumbra = 1; // 设置边缘柔和度

      // 圆锥形灯体
      this.body = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 1.5, 32),
        BaseLight.getMaterial(0x444444)
      );
      this.body.rotation.x = Math.PI ;
      this.body.position.y = 0;
      
      // 添加带箭头的线型指示器
      const arrowHelper = new THREE.ArrowHelper(
        new THREE.Vector3(0, -1, 0), // 方向
        new THREE.Vector3(0, -0.75, 0), // 起点
        0.75, // 长度
        0xff0000 // 颜色
      );
      this.indicator = arrowHelper;
      
      this.group.add(this.light, this.body, this.indicator);
      this.light.target.position.set(0, -1, 0);
      this.group.add(this.light.target);

      this.createOutline(); // 创建反色勾边
      this.setIDLabelPosition(); // 设置ID标签位置
    }

    setAngle(angle) {
        this.light.angle = angle;
    }
}

class RGBLight extends BaseLight {
  constructor() {
    super();
    this.light = new THREE.SpotLight(0xff0000, 2);
    this.light.angle = Math.PI / 8;
    this.light.penumbra = 0.5;

    this.body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.8),
      BaseLight.getMaterial(0x222222)
    );
    this.body.rotation.x = Math.PI; // 修改旋转角度
    
    // 添加带箭头的线型指示器
    const arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(0, -1, 0), // 方向
      new THREE.Vector3(0, -0.4, 0), // 起点
      0.4, // 长度
      0xff0000 // 颜色
    );
    this.indicator = arrowHelper;
    
    this.group.add(this.light, this.body, this.indicator);
    this.group.add(this.light.target);

    this.createOutline(); // 创建反色勾边
    this.setIDLabelPosition(); // 设置ID标签位置
  }
}

class BeamLight extends BaseLight {
    constructor(stageMinY = -50) {
        super();
        this.type = 'beam';
        this.stageMinY = stageMinY;      // 舞台下边界Y坐标
        this.originalBeamLength = 200;    // 将默认光束长度增加到200，接近"无限远"
        this.beamLength = this.originalBeamLength;
        this.focalLength = 10;           // 默认焦距

        this.initLight();  
        this.createOutline(); // 创建反色勾边
        this.setIDLabelPosition(); // 设置ID标签位置
    }
    
    initLight() {
        // 创建聚光灯
        this.light = new THREE.SpotLight(0x00ffff, 5);
        this.light.angle = Math.PI/8;
        this.light.penumbra = 0.8;

        // 光束几何体
        this.beamGeometry = this.createBeamGeometry();
        // 修改: 将光束材质设置为透明材质
        this.beamMaterial = new THREE.MeshBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.1
        });
        this.beam = new THREE.Mesh(this.beamGeometry, this.beamMaterial);
        this.beam.rotation.x = Math.PI;
        this.beam.position.y = -this.beamLength/2;

        // 灯体模型
        this.body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 1),
            BaseLight.getMaterial(0x222222)
        );
        this.body.rotation.x = Math.PI;

        // 组装对象
        this.group.add(
            this.light,
            this.body,
            this.beam,
            this.light.target
        );
        
        // 初始化目标位置
        this.light.target.position.set(0, -1, 0);
    }

    createBeamGeometry() {
      const radiusAtBase = 0.1;
      const radiusAtEnd = Math.tan(this.light.angle) * this.beamLength;
      
      // 根据焦距调整末端半径
      const adjustedRadiusAtEnd = radiusAtEnd * (this.focalLength / 10);
      const height = -this.beamLength;
      
      return new THREE.CylinderGeometry(
        radiusAtBase,
        adjustedRadiusAtEnd,
        height,
        32,   // 横向细分
        8,    // 纵向细分
        true, // 开放两端
        0,    // 起始角度
        Math.PI * 2 // 旋转角度
      );
    }

    // 核心更新方法
    update() {
        if (!this.autoUpdate) return;
        
        // 检测位置变化
        if (!this.group.position.equals(this.lastPosition)) {
            this.lastPosition.copy(this.group.position);
            this.updateBeamLength();
        }
    }

    updateBeamLength() {
        const stageHalfWidth = stageSize.width / 2;
        const stageHalfDepth = stageSize.depth / 2;
        const stageHalfHeight = stageSize.height / 2;
        
        // 获取灯具局部坐标系的向下方向向量（考虑旋转）
        const downDirection = new THREE.Vector3(0, -1, 0);
        downDirection.applyQuaternion(this.group.quaternion);
        
        // 计算光线与舞台的交点
        const rayOrigin = this.group.position.clone();
        const ray = new THREE.Raycaster(rayOrigin, downDirection, 0, this.originalBeamLength);
        
        // 创建舞台平面（使用舞台顶部作为平面）
        const stagePlane = new THREE.Plane(
            new THREE.Vector3(0, 1, 0), // 平面法线向上
            -stageHalfHeight // 距离原点的距离（舞台顶部的y坐标）
        );
        
        // 计算光线与舞台平面的交点
        const intersectPoint = new THREE.Vector3();
        ray.ray.intersectPlane(stagePlane, intersectPoint);
        
        // 检查交点是否在舞台水平范围内
        const isInsideStage = 
            Math.abs(intersectPoint.x) <= stageHalfWidth && 
            Math.abs(intersectPoint.z) <= stageHalfDepth;
        
        // 获取灯具当前位置与舞台顶部的垂直距离
        const heightAboveStage = this.group.position.y - stageHalfHeight;
        
        // 如果光线不与舞台相交或高度不足，或亮度为零，则隐藏光束
        if (!isInsideStage || !intersectPoint || heightAboveStage <= 0 || this.light.intensity <= 0) {
            this.beam.visible = false;
            return;
        }
        
        // 计算光束实际长度（从灯具到交点的距离）
        const distance = rayOrigin.distanceTo(intersectPoint);
        
        // 如果距离过短，隐藏光束（可能是灯具位于舞台下方）
        if (distance <= 0.5) {
            this.beam.visible = false;
            return;
        }
        
        // 恢复光束模型可见性 - 只有在亮度大于0时才显示
        this.beam.visible = this.light.intensity > 0;
        
        // 设置适当的光束长度
        if (Math.abs(distance - this.beamLength) > this.beamLength * 0.01) {
            this.setBeamLength(distance);
        }
        
        // 更新光源的照射距离，设置为比实际距离更长以确保光线达到舞台
        this.light.distance = Math.max(distance * 1.5, this.originalBeamLength);
    }

    setVisibility(visible) {
        this.beam.visible = visible;
        // 不改变灯光和指示器的可见性
    }

    setBeamLength(newLength) {
        // 清理旧几何体
        this.beam.geometry.dispose();
        
        // 创建新几何体
        this.beamLength = newLength;
        this.beam.geometry = this.createBeamGeometry();
        
        // 调整位置
        this.beam.position.y = -newLength / 2;
    }

    setAngle(angle) {
        this.light.angle = angle;
        // 更新光束几何体以反映新角度
        this.beam.geometry.dispose();
        this.beam.geometry = this.createBeamGeometry();
        // 更新光束长度和可见性
        this.updateBeamLength();
    }

    setFocalLength(newFocalLength) {
      this.focalLength = newFocalLength;
      this.setBeamLength(this.beamLength); // 触发几何体重建
    }

    // 舞台边界设置
    setStageBoundary(y) {
        this.stageMinY = y;
        this.updateBeamLength();
    }

    // 销毁方法
    dispose() {
        this.beam.geometry.dispose();
        this.beamMaterial.dispose();
        this.light.dispose();
    }

    // 覆盖基类的setIntensity方法，处理亮度为零的特殊情况
    setIntensity(intensity) {
        // 先调用父类方法更新灯光亮度
        super.setIntensity(intensity);
        
        // 如果亮度为零，隐藏光束模型
        if (this.beam) {
            // 当亮度为0时隐藏光束，否则显示
            this.beam.visible = intensity > 0;
        }
    }
}

// ========== 灯具管理系统 ==========
const maxLightsPerBatch = 8; // 每批渲染的最大光源数量

const lightManager = {
  lights: [],
  batches: [],
  clipboard: null,
  
  
  addLight(type) {
    let newLight;
    switch(type.toLowerCase()) {
      case 'flat': 
        newLight = new FlatLight(); 
        newLight.setIntensity(1.5); // 设置面光灯的默认亮度
        break;
      case 'rgb': 
        newLight = new RGBLight(); 
        newLight.setIntensity(1.5); // 设置RGB灯的默认亮度
        break;
      case 'beam': 
        newLight = new BeamLight();
        newLight.setIntensity(25); // 设置光束灯的默认亮度
        // 为 BeamLight 设置初始位置和旋转追踪
        newLight.lastPosition = new THREE.Vector3();
        newLight.lastQuaternion = new THREE.Quaternion();
        // 启用自动更新
        newLight.autoUpdate = true;
        break;
      default: return null;
    }
    
    newLight.setPosition(
      Math.random() * 10 - 5,
      12,
      Math.random() * 10 - 5
    );
    
    scene.add(newLight.group);
    this.lights.push(newLight);
    
    // 如果是光束灯，立即更新光束长度和可见性
    if (newLight instanceof BeamLight) {
      newLight.lastPosition.copy(newLight.group.position);
      newLight.lastQuaternion.copy(newLight.group.quaternion);
      newLight.updateBeamLength();
    }
    
    return newLight;
  },

  removeLight(uuid) {
    const index = this.lights.findIndex(l => l.uuid === uuid);
    if (index !== -1) {
      // 如果灯具处于"点哪朝哪"模式，将其移除
      pointAndClickLights.delete(this.lights[index]);
      // 更新全局模式状态
      pointAndClickMode = pointAndClickLights.size > 0;
      
      scene.remove(this.lights[index].group);
      this.lights.splice(index, 1);
    }
  },

  getLightsByType(type) {
    return this.lights.filter(light => light.getLightType() === type);
  },

  copyLight() {
    // 修改为支持多选复制
    this.clipboard = selectedLights.map(light => ({
      uuid: light.uuid,
      type: light.constructor.name,
      lightProps: {
        color: light.light.color.getHex(),
        intensity: light.light.intensity,
        angle: light.light.angle,
        penumbra: light.light.penumbra,
        decay: light.light.decay
      },
      position: light.group.position.clone(),
      rotation: light.group.rotation.clone(),
      stageMinY: light.stageMinY,
      autoUpdate: light.autoUpdate,
      ...(light instanceof BeamLight && { focalLength: light.focalLength, beamLength: light.beamLength }),
      ...(light instanceof FlatLight && { angle: light.light.angle })
    }));
  },

  cutLight(uuid) {
    this.copyLight();
    this.removeLight(uuid);
  },

  pasteLight(position) {
    if (this.clipboard) {
      // 计算第一个灯具的位置偏移量
      const firstLightPosition = this.clipboard[0].position;
      const offset = new THREE.Vector3(
        position.x - firstLightPosition.x,
        0,
        position.z - firstLightPosition.z
      );

      this.clipboard.forEach(lightData => {
        let newLight;

        if (lightData.type === 'BeamLight') {
          newLight = new BeamLight(lightData.stageMinY);
          newLight.setFocalLength(lightData.focalLength);
          newLight.setBeamLength(lightData.beamLength);
          // 添加光束角度设置
          newLight.setAngle(lightData.lightProps.angle);
        } else if (lightData.type === 'FlatLight') {
          newLight = new FlatLight();
          newLight.setAngle(lightData.angle);
        } else if (lightData.type === 'RGBLight') {
          newLight = new RGBLight();
        } else {
          newLight = new this.clipboard.type();
        }

        // 复制公共属性
        newLight.setColor(lightData.lightProps.color);
        newLight.setIntensity(lightData.lightProps.intensity);
        // 使用偏移量设置新位置，保留Y轴属性
        newLight.setPosition(
          lightData.position.x + offset.x,
          lightData.position.y, // 保留原本的Y轴属性
          lightData.position.z + offset.z
        );
        newLight.setRotation(lightData.rotation.x, lightData.rotation.y, lightData.rotation.z);

        // 特定属性复制
        if (newLight instanceof BeamLight) {
          newLight.setFocalLength(lightData.focalLength);
          newLight.setBeamLength(lightData.beamLength);
          // 确保角度被正确设置
          newLight.setAngle(lightData.lightProps.angle);
        } else if (newLight instanceof FlatLight) {
          newLight.setAngle(lightData.lightProps.angle);
        }

        // 重新绑定方向指示器
        newLight.indicator.position.set(0, -0.8, 0); // 根据需要调整指示器的位置
        newLight.indicator.setDirection(new THREE.Vector3(0, -1, 0)); // 设置指示器的方向

        // 将新的灯具添加到场景并更新列表
        scene.add(newLight.group);
        this.lights.push(newLight);
      });
    }
}
    
  
};

// ========== 控制面板系统 ==========
let gui = null;
let selectedLights = [];
let showAllIDLabels = false; // 修改为false，使ID标签默认隐藏

// 添加全局状态变量，跟踪"点哪朝哪"模式的灯具
let pointAndClickLights = new Set();
let pointAndClickMode = false;

// 切换所有ID标签显示
function toggleAllIDLabels() {
  showAllIDLabels = !showAllIDLabels;
  lightManager.lights.forEach(light => {
    light.setIDLabelVisible(showAllIDLabels);
  });
}

function updateControlPanel() {
  if (gui) gui.destroy();
  if (selectedLights.length === 0) {
    document.getElementById('gui-container').style.display = 'none'; // 隐藏控制面板
    
    // 如果没有选中的灯具，检查是否仍有灯具处于"点哪朝哪"模式
    const hasPointAndClickBeamLights = lightManager.lights.some(light => 
      light instanceof BeamLight && pointAndClickLights.has(light)
    );
    
    // 如果没有光束灯处于"点哪朝哪"模式，则禁用该模式
    if (!hasPointAndClickBeamLights) {
      pointAndClickLights.clear();
      pointAndClickMode = false;
      renderer.domElement.style.cursor = isBoxSelecting ? 'crosshair' : 'auto';
    } else {
      // 否则保持"点哪朝哪"模式
      pointAndClickMode = true;
      renderer.domElement.style.cursor = 'crosshair';
    }
    
    return;
  }
  document.getElementById('gui-container').style.display = 'block'; // 显示控制面板

  // 确保 selectedLights 中的每个元素都是有效的 BaseLight 实例
  selectedLights = selectedLights.filter(light => light && typeof light.getLightType === 'function');

  gui = new dat.GUI({ autoPlace: false });
  document.getElementById('gui-container').innerHTML = '';
  document.getElementById('gui-container').appendChild(gui.domElement);
  const lightTypes = new Set(selectedLights.map(l => l.getLightType()));

  // 公共参数
  const params = {
    color: selectedLights[0].light.color.getHex(),
    intensity: selectedLights[0].light.intensity,
    positionX: selectedLights[0].group.position.x,
    positionY: selectedLights[0].group.position.y,
    positionZ: selectedLights[0].group.position.z,
    rotationX: selectedLights[0].group.rotation.x,
    rotationY: selectedLights[0].group.rotation.y,
    rotationZ: selectedLights[0].group.rotation.z,
    delete: () => {
      selectedLights.forEach(light => lightManager.removeLight(light.uuid));
      selectedLights = [];
      gui.destroy();
    },
    toggleAxesHelper: () => {
      selectedLights.forEach(light => light.toggleAxesHelper());
    },
    toggleIDLabels: () => {
      toggleAllIDLabels();
    },
    toggleLightGroupPanel: () => {
      toggleLightGroupPanel();
    }
  };
  
  // 添加显示/隐藏坐标轴辅助线按钮 - 注释掉
  // gui.add(params, 'toggleAxesHelper').name('显示/隐藏坐标轴');

  // 添加显示/隐藏ID标签按钮
  gui.add(params, 'toggleIDLabels').name('显示/隐藏ID标签');

  // 添加显示/隐藏灯具组选择面板按钮
  gui.add(params, 'toggleLightGroupPanel').name('显示/隐藏灯具组面板');

  // 添加测试点击检测的按钮
  // gui.add({
  //   testClickDetection: () => {
  //     console.log('=== 点击检测测试 ===');
  //     console.log('当前灯具数量:', lightManager.lights.length);
  //     lightManager.lights.forEach(light => {
  //       console.log(`灯具 ${light.getID()} (${light.getLightType()}):`, {
  //         body: light.body ? '存在' : '不存在',
  //         beam: light.beam ? '存在' : '不存在',
  //         outline: light.outline ? '存在' : '不存在',
  //         axesHelper: light.axesHelper ? '存在' : '不存在',
  //         position: light.group.position.toArray()
  //       });
  //     });
  //   }
  // }, 'testClickDetection').name('测试点击检测');

  // 仅当所有选中灯具类型相同时显示特殊参数
  if (lightTypes.size === 1) {
    const type = Array.from(lightTypes)[0];

    // 添加类型特定参数
    switch(type) {
        case 'beam':
          params.angle = selectedLights[0].light.angle;
          params.focalLength = selectedLights[0].focalLength; // 添加焦距参数
          
          // 添加"点哪朝哪"模式开关
          params.pointAndClick = pointAndClickLights.has(selectedLights[0]);
          gui.add(params, 'pointAndClick').name('点哪朝哪模式').onChange(value => {
            // 更新所有选中的光束灯的"点哪朝哪"状态
            selectedLights.forEach(light => {
              if (value) {
                pointAndClickLights.add(light);
              } else {
                pointAndClickLights.delete(light);
              }
            });
            
            // 更新全局模式状态
            pointAndClickMode = pointAndClickLights.size > 0;
            
            // 如果模式开启，临时更改鼠标样式
            renderer.domElement.style.cursor = pointAndClickMode ? 'crosshair' : 'auto';
          });
          
          // 修改这行：将光束角度范围从0-π/2改为0.1-0.4
          gui.add(params, 'angle', 0.1, 0.4).name('光束角度').onChange(v => {
            selectedLights.forEach(l => {
                if (l.setAngle) {
                    l.setAngle(v);
                    // 角度改变后确保更新光束长度
                    if (l instanceof BeamLight) {
                        l.updateBeamLength();
                    }
                } else {
                    l.light.angle = v;
                    l.beam.geometry.dispose();
                    l.beam.geometry = createBeamGeometry(v);
                }
            });
          });
          
          // 为光束灯添加焦距控制 - 注释掉
          /*
          gui.add(params, 'focalLength', 1, 20).name('焦距').onChange(v => {
            selectedLights.forEach(l => {
              if (l.setFocalLength) {
                l.setFocalLength(v);
              }
            });
          });
          */
          break;
      }
    }
    
  // 颜色控制 - 注释掉面光灯的颜色控制
  // 仅对非面光灯显示颜色控制
  if (lightTypes.size === 1 && Array.from(lightTypes)[0] !== 'flat') {
    gui.addColor(params, 'color').name('颜色').onChange(v => {
      selectedLights.forEach(light => light.setColor(v));
    });
  } else if (lightTypes.size > 1) {
    // 多种类型灯具但确保不包含面光灯时显示颜色控制
    const hasFlatLight = selectedLights.some(light => light instanceof FlatLight);
    if (!hasFlatLight) {
      gui.addColor(params, 'color').name('颜色').onChange(v => {
        selectedLights.forEach(light => light.setColor(v));
      });
    }
  }

  // 亮度控制 - 根据灯具类型设置不同范围
  if (lightTypes.size === 1) {
    const type = Array.from(lightTypes)[0];
    let maxIntensity = 1; // 默认最大亮度
    
    switch(type) {
      case 'flat':
        maxIntensity = 2; // 面光灯亮度范围：0-2
        break;
      case 'rgb':
        maxIntensity = 1; // RGB灯亮度范围：0-2
        break;
      case 'beam':
        maxIntensity = 3; // 光束灯亮度范围：0-50
        break;
    }
    
    gui.add(params, 'intensity', 0, maxIntensity).name('亮度').step(maxIntensity/100)
      .onChange(v => selectedLights.forEach(light => light.setIntensity(v)));
  } else {
    // 如果多种灯具类型被选中，使用较小的范围
    gui.add(params, 'intensity', 0, 10).name('亮度').step(0.1)
      .onChange(v => selectedLights.forEach(light => light.setIntensity(v)));
  }

  // 位置控制 - 注释掉
  /*
  const posFolder = gui.addFolder('位置');
  posFolder.add(params, 'positionX', -100, 100).name('X').onChange(v => {
    const offsetX = v - selectedLights[0].group.position.x;  // 计算相对偏移量
    selectedLights.forEach(light => {
      light.group.position.x += offsetX;  // 应用偏移量
    });
  });
  
  posFolder.add(params, 'positionY', 0, 20).name('Y').onChange(v => {
    const offsetY = v - selectedLights[0].group.position.y;  // 计算相对偏移量
    selectedLights.forEach(light => {
      light.group.position.y += offsetY;  // 应用偏移量
    });
  });
  
  posFolder.add(params, 'positionZ', -100, 100).name('Z').onChange(v => {
    const offsetZ = v - selectedLights[0].group.position.z;  // 计算相对偏移量
    selectedLights.forEach(light => {
      light.group.position.z += offsetZ;  // 应用偏移量
    });
  });
  */

  // 旋转控制 - 注释掉
  /*
  const rotFolder = gui.addFolder('旋转');
  rotFolder.add(params, 'rotationX', -Math.PI, Math.PI).name('X轴')
    .onChange(v => selectedLights.forEach(light => light.group.rotation.x = v));
  rotFolder.add(params, 'rotationY', -Math.PI, Math.PI).name('Y轴')
    .onChange(v => selectedLights.forEach(light => light.group.rotation.y = v));
  rotFolder.add(params, 'rotationZ', -Math.PI, Math.PI).name('Z轴')
    .onChange(v => selectedLights.forEach(light => light.group.rotation.z = v));
  */

  // 删除按钮 - 注释掉
  // gui.add(params, 'delete').name('删除选中灯具');
}

// ========== 舞台控制功能 ==========
// const stageGUI = new dat.GUI({ autoPlace: false });
// document.getElementById('stage-controls').appendChild(stageGUI.domElement);

// const stageParams = {
//   width: stageSize.width,
//   depth: stageSize.depth,
//   height: stageSize.height,
//   update: function() {
//     stageSize.width = this.width;
//     stageSize.depth = this.depth;
//     stageSize.height = this.height;
//     updateStageSize();
//   }
// };

// stageGUI.add(stageParams, 'width', 10, 200).name('舞台宽度').onChange(function(value) {
//   stageParams.width = value;
//   stageParams.update();
// });
// stageGUI.add(stageParams, 'depth', 5, 200).name('舞台深度').onChange(function(value) {
//   stageParams.depth = value;
//   stageParams.update();
// });
// stageGUI.add(stageParams, 'height', 0.5, 10).name('舞台高度').onChange(function(value) {
//   stageParams.height = value;
//   stageParams.update();
// });
// stageGUI.add(stageParams, 'update').name('应用修改');

// ========== 交互系统 ==========
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let draggedLight = null;
let contextMenu = null;
let isBoxSelecting = false;
let selectBox = null;
let startX = 0;
let startY = 0;
let boxSelectHint = null;
let dragController = {
  isDragging: false,
  currentAxis: null,
  currentLight: null,
  startPosition: new THREE.Vector3(),
  plane: new THREE.Plane(),
  intersectPoint: new THREE.Vector3(),
  originalControlsEnabled: true
};

function createBoxSelectHint() {
  boxSelectHint = document.createElement('div');
  boxSelectHint.style.position = 'fixed';
  boxSelectHint.style.top = '20px';
  boxSelectHint.style.left = '50%';
  boxSelectHint.style.transform = 'translateX(-50%)';
  boxSelectHint.style.backgroundColor = 'rgba(0,0,0,0.7)';
  boxSelectHint.style.color = 'white';
  boxSelectHint.style.padding = '8px 16px';
  boxSelectHint.style.borderRadius = '4px';
  boxSelectHint.style.display = 'none';
  boxSelectHint.style.fontFamily = '"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", "SimHei", "SimSun", "NSimSun", "FangSong", "KaiTi", "STHeiti", "STKaiti", "STSong", "STFangsong", "STZhongsong", "STLiti", Arial, Helvetica, sans-serif';
  boxSelectHint.textContent = '框选模式（Shift切换 | Ctrl多选）';
  document.body.appendChild(boxSelectHint);
}

createBoxSelectHint();

function toggleBoxSelectMode() {
  // 切换模式状态
  isBoxSelecting = !isBoxSelecting;
  
  // 更新UI和控制状态
  controls.enabled = !isBoxSelecting;
  renderer.domElement.style.cursor = isBoxSelecting ? 'crosshair' : 'auto';
  boxSelectHint.style.display = isBoxSelecting ? 'block' : 'none';
  
  // 如果关闭框选模式，确保清理相关元素
  if (!isBoxSelecting && selectBox) {
    document.body.removeChild(selectBox);
    selectBox = null;
    window.removeEventListener('mousemove', handleBoxSelectMove);
    window.removeEventListener('mouseup', handleBoxSelectEnd);
  }
  
  console.log("框选模式：", isBoxSelecting ? "开启" : "关闭"); // 添加调试信息
}

// 注释掉添加灯具的上下文菜单选项
/*
function showContextMenu(event, options) {
  event.preventDefault();
  
  // 先移除上一个菜单，确保每次显示新的菜单
  if (contextMenu) {
    document.body.removeChild(contextMenu);
  }

  contextMenu = document.createElement('div');
  contextMenu.style.position = 'absolute';
  contextMenu.style.backgroundColor = 'rgba(0,0,0,0.7)';
  contextMenu.style.color = 'white';
  contextMenu.style.padding = '10px';
  contextMenu.style.borderRadius = '5px';
  contextMenu.style.zIndex = '101';
  contextMenu.style.left = `${event.clientX}px`;
  contextMenu.style.top = `${event.clientY}px`;

  // 过滤掉添加灯具、删除灯具等选项
  const filteredOptions = options.filter(option => 
    !option.text.includes('删除') &&
    !option.text.includes('添加')
  );

  filteredOptions.forEach(option => {
    const button = document.createElement('button');
    button.textContent = option.text;
    button.style.display = 'block';
    button.style.margin = '5px 0';
    button.onclick = () => {
      option.action();
      document.body.removeChild(contextMenu);
      contextMenu = null; // 清空引用，防止内存泄漏
    };
    contextMenu.appendChild(button);
  });

  document.body.appendChild(contextMenu);
}
*/

// window.addEventListener('contextmenu', (event) => {
//   event.preventDefault(); // 防止默认的右键菜单

//   // 计算鼠标位置
//   const mouse = {
//     x: (event.clientX / window.innerWidth) * 2 - 1,
//     y: -(event.clientY / window.innerHeight) * 2 + 1
//   };
  
//   raycaster.setFromCamera(mouse, camera);
//   const intersects = raycaster.intersectObjects(
//     lightManager.lights.map(l => l.group),
//     true
//   );

//   if (intersects.length > 0) {
//     const foundLight = lightManager.lights.find(
//       l => l.group === intersects[0].object.parent
//     );

//     if (foundLight) {
//       showContextMenu(event, [
//         { text: '复制', action: () => lightManager.copyLight(foundLight.uuid) },
//         { text: '剪切', action: () => lightManager.cutLight(foundLight.uuid) },
//         { text: '删除', action: () => lightManager.removeLight(foundLight.uuid) }
//       ]);
//     }
//   } else {
//     showContextMenu(event, [
//       { text: '粘贴', action: () => {
//         raycaster.setFromCamera(mouse, camera);
//         const intersects = raycaster.intersectObject(stage);
//         if (intersects.length > 0) {  
//           lightManager.pasteLight(intersects[0].point);
//         }
//       }}
//     ]);
//   }
// });

function highlightSelectedLights() {
  // 清除之前的高亮
  lightManager.lights.forEach(light => {
    if (light.highlight) {
      light.group.remove(light.highlight);
      light.highlight.geometry.dispose();
      light.highlight.material.dispose();
      delete light.highlight;
    }
  });

  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00, // 高亮颜色
  });

  // 给选中的灯具添加高亮
  selectedLights.forEach(light => {
    const highlightGeometry = light.body.geometry.clone();
    light.highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    light.highlight.rotation.set(Math.PI, 0, 0);
    light.group.add(light.highlight);
  });
}

// 获取控制面板元素
const guiContainer = document.getElementById('gui-container');

// 监听点击事件
window.addEventListener('click', (event) => {
  // 如果在框选模式下，不处理普通点击事件
  if (isBoxSelecting) {
    return;
  }
  
  // 判断是否点击了控制面板区域
  if (guiContainer && guiContainer.contains(event.target)) {
    // 如果点击的是控制面板区域，不做任何处理
    return;
  }
  
  // 判断是否点击了灯具组选择面板区域
  const lightGroupPanel = document.getElementById('light-group-panel');
  if (lightGroupPanel && lightGroupPanel.contains(event.target)) {
    // 如果点击的是灯具组选择面板区域，不做任何处理
    return;
  }
  
  // 先检查是否处于"点哪朝哪"模式，如果是并且处理了点击事件，则返回
  if (handlePointAndClickMode(event)) {
    return;
  }

  // 保存当前选中灯具，用于后续比较
  const previousSelected = [...selectedLights];

  // 以下是原来的代码，处理普通的灯具选择
  // 计算鼠标位置
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  
  // 改进：收集所有灯具的可点击对象
  const clickableObjects = [];
  lightManager.lights.forEach(light => {
    // 添加灯具主体
    if (light.body) {
      clickableObjects.push(light.body);
    }
    // 添加光束（如果存在且可见）
    if (light.beam && light.beam.visible) {
      clickableObjects.push(light.beam);
    }
    // 添加外轮廓（如果存在）
    if (light.outline) {
      clickableObjects.push(light.outline);
    }
    // 添加坐标轴辅助（如果可见）
    if (light.axesHelper && light.axesHelper.visible) {
      light.axesHelper.traverse(child => {
        if (child.isMesh) {
          clickableObjects.push(child);
        }
      });
    }
  });
  
  console.log('可点击对象数量:', clickableObjects.length); // 调试信息
  const intersects = raycaster.intersectObjects(clickableObjects, true);
  console.log('射线相交数量:', intersects.length); // 调试信息

  if (intersects.length > 0) {
    // 改进：更准确地查找对应的灯具
    const intersectedObject = intersects[0].object;
    let foundLight = null;
    
    // 遍历所有灯具，查找包含被点击对象的灯具
    for (const light of lightManager.lights) {
      if (light.body === intersectedObject || 
          light.beam === intersectedObject ||
          light.outline === intersectedObject ||
          light.group.children.includes(intersectedObject) ||
          light.axesHelper && light.axesHelper.children.includes(intersectedObject)) {
        foundLight = light;
        break;
      }
    }
    
    // 如果还是没找到，尝试通过父对象查找
    if (!foundLight) {
      let parent = intersectedObject.parent;
      while (parent) {
        foundLight = lightManager.lights.find(l => l.group === parent);
        if (foundLight) break;
        parent = parent.parent;
      }
    }

    if (foundLight) {
      console.log('点击到灯具:', foundLight.getID(), foundLight.getLightType()); // 调试信息
      
      if (event.ctrlKey || event.metaKey) { // 多选模式
        const index = selectedLights.findIndex(l => l.uuid === foundLight.uuid);
        if (index === -1) {
          selectedLights.push(foundLight); // 添加到选中灯具数组
          console.log('添加到多选:', foundLight.getID());
        } else {
          selectedLights.splice(index, 1); // 移除选中灯具
          console.log('从多选中移除:', foundLight.getID());
        }
      } else { // 单选模式
        selectedLights = [foundLight]; // 只保留当前选中的灯具
        console.log('单选灯具:', foundLight.getID());
      }
    } else {
      console.log('点击到对象但未找到对应灯具:', intersectedObject);
    }
    
    updateControlPanel(); // 更新控制面板
    highlightSelectedLights(); // 高亮选中的灯具
  } else {
    // 点击到了空白区域，取消选中
    console.log('点击到空白区域，取消选中');
    selectedLights = [];
    updateControlPanel(); // 更新控制面板，清空选中项
    highlightSelectedLights(); // 清除高亮
  }
  
  // 添加新代码：检查是否有光束灯从选中状态变为未选中状态
  // 并同时移除它们的"点哪朝哪"模式
  previousSelected.forEach(light => {
    // 如果之前选中但现在未选中，且是光束灯，且在"点哪朝哪"模式下
    if (!selectedLights.includes(light) && light instanceof BeamLight && pointAndClickLights.has(light)) {
      // 将其从"点哪朝哪"模式灯具集合中移除
      pointAndClickLights.delete(light);
    }
  });
  
  // 更新全局"点哪朝哪"模式状态
  pointAndClickMode = pointAndClickLights.size > 0;
  
  // 如果没有灯具处于"点哪朝哪"模式，恢复鼠标样式
  if (!pointAndClickMode) {
    renderer.domElement.style.cursor = isBoxSelecting ? 'crosshair' : 'auto';
  }
});

// 修改已有的keydown事件处理函数
window.addEventListener('keydown', (e) => {
  // 检查是否有控制面板中的输入元素正在被聚焦
  const isInputFocused = document.activeElement.tagName === 'INPUT' || 
                        document.activeElement.tagName === 'TEXTAREA' || 
                        document.activeElement.classList.contains('has-slider');
  
  // 如果有输入元素被聚焦，只处理Tab键（用于回中功能），其他快捷键不触发
  if (isInputFocused) {
    // 仍然允许Tab键用于灯具回中功能，但阻止默认的焦点切换
    if (e.key === 'Tab') {
      resetSelectedLights();
      e.preventDefault();
    }
    return; // 提前返回，不处理其他快捷键
  }
  
  // 以下是原有的快捷键处理逻辑
  // 如果按下的是Shift键
  if (e.key === 'Shift' || e.keyCode === 16) {
    // 确保取消现有的框选操作
    if (selectBox) {
      document.body.removeChild(selectBox);
      selectBox = null;
      window.removeEventListener('mousemove', handleBoxSelectMove);
      window.removeEventListener('mouseup', handleBoxSelectEnd);
    }
    
    // 切换框选模式
    toggleBoxSelectMode();
    e.preventDefault(); // 防止浏览器默认行为
    return; // 提前返回，不处理其他快捷键
  }
  
  // 添加Tab键处理 - 灯具回中功能
  if (e.key === 'Tab') {
    resetSelectedLights();
    e.preventDefault(); // 防止Tab键的默认行为（焦点切换）
    return;
  }
  
  // 快捷键全选功能
  if (!e.ctrlKey && !e.altKey && !e.shiftKey) { // 确保没有按下修饰键
    if (e.key === '1') {
      selectAllLightsByType('rgb');
      e.preventDefault();
    } else if (e.key === '2') {
      selectAllLightsByType('flat');
      e.preventDefault();
    } else if (e.key === '3') {
      selectAllLightsByType('beam');
      e.preventDefault();
    } else if (e.key === '0') {
      selectAllLightsByType('all');
      e.preventDefault();
    } else if (e.key === 'i' || e.key === 'I') {
      toggleAllIDLabels();
      e.preventDefault();
    }
    // 灯具组快捷键
    else if (e.key === 'q' || e.key === 'Q') {
      selectLightGroup('flat');
      e.preventDefault();
    } else if (e.key === 'w' || e.key === 'W') {
      selectLightGroup('par1');
      e.preventDefault();
    } else if (e.key === 'e' || e.key === 'E') {
      selectLightGroup('par2');
      e.preventDefault();
    } else if (e.key === 'r' || e.key === 'R') {
      selectLightGroup('par3');
      e.preventDefault();
    } else if (e.key === 't' || e.key === 'T') {
      selectLightGroup('par4');
      e.preventDefault();
    } else if (e.key === 'y' || e.key === 'Y') {
      selectLightGroup('beam1');
      e.preventDefault();
    } else if (e.key === 'u' || e.key === 'U') {
      selectLightGroup('beam2');
      e.preventDefault();
    } else if (e.key === 'g' || e.key === 'G') {
      toggleLightGroupPanel();
      e.preventDefault();
    }
  }
});

let highlightedArrows = new Set();

function onMouseMove(event) {
  // 转换鼠标坐标
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  // 射线检测
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(
    lightManager.lights.flatMap(l => 
      l.axesHelper.children.flatMap(arrow => 
        arrow.children.filter(child => child.isMesh)
      )
    ),
    true
  );

  // 清除之前的高亮
  highlightedArrows.forEach(arrow => {
    if (arrow.userData.wireframe) {
      arrow.userData.wireframe.visible = false;
    }
  });
  highlightedArrows.clear();

  // 处理新检测到的悬停
  if (intersects.length > 0) {
    const sphere = intersects[0].object;
    const arrow = sphere.parent;
    
    if (arrow.userData.wireframe) {
      arrow.userData.wireframe.visible = true;
      highlightedArrows.add(arrow);
      controls.enabled = false;
    }
  } else {
    controls.enabled = true;
  }
}

// 新增鼠标离开事件处理
renderer.domElement.addEventListener('mouseleave', () => {
  highlightedArrows.forEach(arrow => {
    if (arrow.userData.wireframe) {
      arrow.userData.wireframe.visible = false;
    }
  });
  highlightedArrows.clear();
  controls.enabled = true;
});

// 修改后的拖拽开始逻辑
function onMouseDown(event) {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(
    lightManager.lights.flatMap(l => 
      l.axesHelper.children.flatMap(arrow => 
        arrow.children.filter(child => child.isMesh)
      )
    ),
    true
  );

  if (intersects.length > 0) {
    const sphere = intersects[0].object;
    const arrow = sphere.parent;
    const axis = arrow.userData.axis;
    
    // 获取对应的灯具实例
    const light = lightManager.lights.find(l => 
      l.axesHelper.children.includes(arrow.parent)
    );

    // 设置拖拽平面（根据轴向和视角）
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    const planeNormal = new THREE.Vector3()
      .crossVectors(cameraDirection, new THREE.Vector3(...{
        x: [1, 0, 0],
        y: [0, 1, 0],
        z: [0, 0, 1]
      }[axis]))
      .normalize();

    dragController.plane.setFromNormalAndCoplanarPoint(
      planeNormal,
      light.group.position
    );

    // 记录初始状态
    dragController.currentAxis = axis;
    dragController.currentLight = light;
    raycaster.ray.intersectPlane(dragController.plane, dragController.startPosition);
    dragController.isDragging = true;
    controls.enabled = false;
  }
}

function onMouseUp() {
  controls.enabled = dragController.originalControlsEnabled;
  dragController.isDragging = false;
  controls.enabled = true;
}

// 改进handleBoxSelectStart函数，增加状态检查
function handleBoxSelectStart(event) {
  // 只在框选模式下且不在拖拽状态时工作
  if (!isBoxSelecting || dragController.isDragging) return;
  
  console.log("开始框选操作"); // 添加调试信息
  
  // 检查是否按下了Ctrl键
  const isMultiSelect = event.ctrlKey || event.metaKey;
  if (isMultiSelect) {
    console.log("框选多选模式：新选择的灯具将添加到当前选择中");
  } else {
    console.log("框选单选模式：新选择的灯具将替换当前选择");
  }
  
  startX = event.clientX;
  startY = event.clientY;
  
  // 如果已有选框，先移除
  if (selectBox) {
    document.body.removeChild(selectBox);
  }
  
  // 创建新选框
  selectBox = document.createElement('div');
  selectBox.style.position = 'fixed';
  selectBox.style.border = '2px solid #00ffff';
  selectBox.style.backgroundColor = 'rgba(0,255,255,0.1)';
  selectBox.style.pointerEvents = 'none';
  selectBox.style.zIndex = '1000'; // 确保在最上层
  selectBox.style.left = `${startX}px`;
  selectBox.style.top = `${startY}px`;
  selectBox.style.width = '0px';
  selectBox.style.height = '0px';
  document.body.appendChild(selectBox);

  // 添加移动和结束事件监听
  window.addEventListener('mousemove', handleBoxSelectMove);
  window.addEventListener('mouseup', handleBoxSelectEnd);
}

function handleBoxSelectMove(event) {
  if (!selectBox) return;

  selectBox.style.display = 'block';
  
  const currentX = event.clientX;
  const currentY = event.clientY;
  
  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  selectBox.style.left = `${left}px`;
  selectBox.style.top = `${top}px`;
  selectBox.style.width = `${width}px`;
  selectBox.style.height = `${height}px`;
}

function handleBoxSelectEnd(event) {
  if (!selectBox) return;

  // 获取选框范围
  const box = {
    left: parseInt(selectBox.style.left),
    top: parseInt(selectBox.style.top),
    width: parseInt(selectBox.style.width),
    height: parseInt(selectBox.style.height)
  };

  // 移除选框元素
  document.body.removeChild(selectBox);
  selectBox = null;

  // 清除事件监听
  window.removeEventListener('mousemove', handleBoxSelectMove);
  window.removeEventListener('mouseup', handleBoxSelectEnd);

  // 执行框选检测，传递事件对象
  performBoxSelection(box, event);
}

// 执行实际选择逻辑
function performBoxSelection(box, event) {
  const selected = [];
  const vec = new THREE.Vector3();

  lightManager.lights.forEach(light => {
    // 将灯具位置转换为屏幕坐标
    vec.setFromMatrixPosition(light.group.matrixWorld);
    vec.project(camera);
    
    const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vec.y * -0.5 + 0.5) * window.innerHeight;

    // 检查是否在选框范围内
    if (x >= box.left && 
        x <= box.left + box.width && 
        y >= box.top && 
        y <= box.top + box.height) {
      selected.push(light);
    }
  });

  // 检查是否按下了Ctrl键进行多选
  const isMultiSelect = event && (event.ctrlKey || event.metaKey);
  
  if (isMultiSelect) {
    // 多选模式：将框选的灯具添加到当前选中灯具中
    selected.forEach(light => {
      if (!selectedLights.find(l => l.uuid === light.uuid)) {
        selectedLights.push(light);
      }
    });
    console.log(`框选多选: 添加了 ${selected.length} 个灯具到当前选择`);
  } else {
    // 单选模式：替换当前选中灯具
    selectedLights = selected;
    console.log(`框选单选: 选择了 ${selected.length} 个灯具`);
  }
  
  updateControlPanel();
  highlightSelectedLights();
}

// 绑定框选开始事件
renderer.domElement.addEventListener('mousedown', handleBoxSelectStart);

// ========== 场景导入导出 ==========
function saveScene() {
  const sceneData = lightManager.lights.map(light => {
    // 创建基本灯具信息对象
    const lightData = {
      type: light.constructor.name,
      position: light.group.position.toArray(),
      rotation: light.group.rotation.toArray(),
      color: light.light.color.getHex(),
      intensity: light.light.intensity,
      angle: light.light.angle
    };
    
    // 添加特定灯具类型的专有属性
    if (light instanceof BeamLight) {
      // 为光束灯添加特有属性
      lightData.focalLength = light.focalLength;
      lightData.beamLength = light.beamLength;
    } else if (light instanceof FlatLight) {
      // 为面光灯添加特有属性
      lightData.angle = light.light.angle;
    }
    
    return lightData;
  });

  const dataStr = JSON.stringify(sceneData, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `scene_${new Date().toISOString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function loadScene() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const sceneData = JSON.parse(event.target.result);
        lightManager.lights.forEach(l => scene.remove(l.group));
        lightManager.lights = [];
        
        sceneData.forEach(data => {
          const light = lightManager.addLight(data.type.replace('Light', ''));
          light.setPosition(...data.position);
          light.setRotation(...data.rotation);
          light.setColor(data.color);
          light.setIntensity(data.intensity);
          
          // 应用特定灯具类型的专有属性
          if (light instanceof BeamLight && data.focalLength !== undefined) {
            light.setFocalLength(data.focalLength);
            // 确保应用光束角度
            if (data.angle !== undefined) {
              light.setAngle(data.angle);
            }
          } else if (light instanceof FlatLight && data.angle !== undefined) {
            light.setAngle(data.angle);
          }
        });
      } catch (error) {
        alert('场景文件加载失败: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  };
  input.click();
}

const sceneData = [
  {
    "type": "FlatLight",
    "position": [
      -1.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      -4.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      -7.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      -10.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      -13.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      -16.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      -19.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      -22.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      22.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      19.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      16.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      13.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      10.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      7.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      4.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "FlatLight",
    "position": [
      1.5,
      20,
      35
    ],
    "rotation": [
      1,
      0,
      0,
      "XYZ"
    ],
    "color": 15908227,
    "intensity": 0.58,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -6,
      17,
      20
    ],
    "rotation": [
      0.35135165124586853,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -2,
      17,
      20
    ],
    "rotation": [
      0.35135165124586853,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      2,
      17,
      20
    ],
    "rotation": [
      0.35135165124586853,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      6,
      17,
      20
    ],
    "rotation": [
      0.35135165124586853,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -22,
      17,
      20
    ],
    "rotation": [
      0.35135165124586853,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -18,
      17,
      20
    ],
    "rotation": [
      0.35135165124586853,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -14,
      17,
      20
    ],
    "rotation": [
      0.35135165124586853,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -10,
      17,
      20
    ],
    "rotation": [
      0.35135165124586853,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      10,
      17,
      20
    ],
    "rotation": [
      0.35135165124586853,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      14,
      17,
      20
    ],
    "rotation": [
      0.35135165124586853,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      18,
      17,
      20
    ],
    "rotation": [
      0.35135165124586853,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      22,
      17,
      20
    ],
    "rotation": [
      0.35135165124586853,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -6,
      17,
      5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -2,
      17,
      5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      2,
      17,
      5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      6,
      17,
      5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -22,
      17,
      5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -18,
      17,
      5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -14,
      17,
      5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -10,
      17,
      5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      9.999999999999998,
      17,
      5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      14,
      17,
      5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      18,
      17,
      5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      22,
      17,
      5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      0,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      5,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      10,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      15,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -20,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -15,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -10,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -5,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      20,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      0,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      5,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      10,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      15,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -20,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -15,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -10,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      -5,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "RGBLight",
    "position": [
      20,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 0.24,
    "angle": 0.39269908169872414
  },
  {
    "type": "BeamLight",
    "position": [
      -8,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 2,
    "angle": 0.27,
    "focalLength": 10,
    "beamLength": 14.5
  },
  {
    "type": "BeamLight",
    "position": [
      8,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 2,
    "angle": 0.27,
    "focalLength": 10,
    "beamLength": 14.5
  },
  {
    "type": "BeamLight",
    "position": [
      18,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 2,
    "angle": 0.27,
    "focalLength": 10,
    "beamLength": 14.5
  },
  {
    "type": "BeamLight",
    "position": [
      -18,
      17,
      -5
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 2,
    "angle": 0.27,
    "focalLength": 10,
    "beamLength": 14.5
  },
  {
    "type": "BeamLight",
    "position": [
      12,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 3,
    "angle": 0.24,
    "focalLength": 10,
    "beamLength": 14.5
  },
  {
    "type": "BeamLight",
    "position": [
      22,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 3,
    "angle": 0.24,
    "focalLength": 10,
    "beamLength": 14.5
  },
  {
    "type": "BeamLight",
    "position": [
      -12,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 3,
    "angle": 0.24,
    "focalLength": 10,
    "beamLength": 14.5
  },
  {
    "type": "BeamLight",
    "position": [
      -22,
      17,
      -15
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 3,
    "angle": 0.24,
    "focalLength": 10,
    "beamLength": 14.5
  },
  {
    "type": "BeamLight",
    "position": [
      -4,
      17,
      -15.323153527171561
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 3,
    "angle": 0.24,
    "focalLength": 10,
    "beamLength": 14.5
  },
  {
    "type": "BeamLight",
    "position": [
      4,
      17,
      -15.323153527171561
    ],
    "rotation": [
      0,
      0,
      0,
      "XYZ"
    ],
    "color": 16777215,
    "intensity": 3,
    "angle": 0.24,
    "focalLength": 10,
    "beamLength": 14.5
  }
];

function loadSceneData(sceneData) {
  // 重置灯具计数器
  BaseLight.lightCounter = 0;
  
  sceneData.forEach((data, index) => {
    const light = lightManager.addLight(data.type.replace('Light', ''));
    light.setPosition(...data.position);
    light.setRotation(...data.rotation);
    light.setColor(data.color);
    light.setIntensity(data.intensity);

    // 应用特定灯具类型的专有属性
    if (light instanceof BeamLight && data.focalLength !== undefined) {
      light.setFocalLength(data.focalLength);
      if (data.angle !== undefined) {
        light.setAngle(data.angle);
      }
    } else if (light instanceof FlatLight && data.angle !== undefined) {
      light.setAngle(data.angle);
    }
    
    // 更新ID标签显示并设置为隐藏状态
    if (light.idLabel) {
      light.updateIDLabel();
      light.setIDLabelVisible(showAllIDLabels);
    }
  });
}

loadSceneData(sceneData);

// ========== 自动加载场景 ==========
function autoLoadScene() {
  const filePath = '11.json'; // 根目录下的文件名
  fetch(filePath)
    .then(response => {
      if (!response.ok) {
        throw new Error('网络错误: ' + response.statusText);
      }
      return response.json();
    })
    .then(sceneData => {
      // 清除现有灯具
      lightManager.lights.forEach(l => scene.remove(l.group));
      lightManager.lights = [];
      
      // 加载新场景
      loadSceneData(sceneData);
    })
    .catch(error => {
      console.error('自动加载场景文件失败: ', error);
      // 如果自动加载失败，使用默认场景数据
      console.log('使用默认场景数据');
    });
}

// 在页面加载完成后自动加载场景
document.addEventListener('DOMContentLoaded', () => {
  autoLoadScene();
  createLightGroupPanel(); // 创建灯具组选择面板
});

// ========== 视角控制系统 ==========
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// ========== 动画循环 ==========
function animate() {
  requestAnimationFrame(animate);
  
  // 更新所有光束灯
  lightManager.lights.forEach(light => {
    if (light instanceof BeamLight && light.autoUpdate) {
      // 检查位置或旋转是否变化
      if (!light.group.position.equals(light.lastPosition) || 
          light.group.quaternion.angleTo(light.lastQuaternion || new THREE.Quaternion()) > 0.01) {
        
        // 更新位置和旋转记录
        if (!light.lastPosition) light.lastPosition = new THREE.Vector3();
        if (!light.lastQuaternion) light.lastQuaternion = new THREE.Quaternion();
        
        light.lastPosition.copy(light.group.position);
        light.lastQuaternion.copy(light.group.quaternion);
        
        // 更新光束长度和可见性
        light.updateBeamLength();
      }
      
      // 无论是否在舞台内，都保持灯光亮度正常
      light.light.visible = true;
    }
    
    // 让ID标签始终面向相机
    if (light.idLabel && light.idLabel.visible) {
      light.idLabel.quaternion.copy(camera.quaternion);
    }
  });
  
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ========== 窗口自适应 ==========
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ========== 初始化测试灯具 ==========

// ========== 拍照系统 ==========
function getColorName(color) {
  // 将颜色转换为RGB值
  const rgb = new THREE.Color(color);
  const r = Math.round(rgb.r * 255);
  const g = Math.round(rgb.g * 255);
  const b = Math.round(rgb.b * 255);
  
  // 定义基本颜色映射
  const colorMap = {
    // 基本颜色
    '#ff0000': '红色',
    '#00ff00': '绿色',
    '#0000ff': '蓝色',
    '#ffff00': '黄色',
    '#00ffff': '青色',
    '#ff00ff': '紫色',
    '#ffffff': '白色',
    
    // 常用灯光颜色
    '#f2bd83': '暖白',
    '#e6cbb3': '日光',
    '#ffd3aa': '晨光',
    '#ffa54f': '金黄',
    '#f08080': '玫瑰红',
    '#f0e68c': '淡黄',
    '#87cefa': '浅蓝',
    '#7b68ee': '紫罗兰'
  };
  
  // 转换为HEX格式做精确匹配
  const hexColor = '#' + new THREE.Color(color).getHexString();
  if (colorMap[hexColor]) {
    return colorMap[hexColor];
  }
  
  // 返回RGB格式用于不精确匹配的颜色
  return `RGB(${r},${g},${b})`;
}

function takePhoto() {
  // 存储当前相机位置和朝向
  const originalPosition = camera.position.clone();
  const originalRotation = camera.rotation.clone();
  const originalControlsEnabled = controls.enabled;
  
  // 临时禁用控制器
  controls.enabled = false;
  
  // 将相机移动到拍照位置
  const stageCenter = new THREE.Vector3(0, 10, 50);
  camera.position.copy(stageCenter);
  camera.lookAt(0, 10, 0);
  
  // 临时隐藏UI元素
  const uiElements = [
    document.getElementById('controls'),
    document.getElementById('stage-controls'),
    document.getElementById('gui-container')
  ];
  uiElements.forEach(el => {
    if (el) el.style.display = 'none';
  });
  
  // 收集灯具信息
  const lightInfo = {
    rgb: {}, // 按RGB存储，格式: { "RGB(r,g,b)": [light1, light2, ...] }
    flat: {}, // 按亮度存储，格式: { "1.5": [light1, light2, ...] }
    beam: {}  // 按颜色名称存储，格式: { "红色": [light1, light2, ...] }
  };
  
  // 遍历所有灯具，收集信息
  lightManager.lights.forEach(light => {
    if (light instanceof RGBLight) {
      const colorKey = `RGB(${Math.round(light.light.color.r*255)},${Math.round(light.light.color.g*255)},${Math.round(light.light.color.b*255)})`;
      if (!lightInfo.rgb[colorKey]) {
        lightInfo.rgb[colorKey] = [];
      }
      lightInfo.rgb[colorKey].push(light);
    } 
    else if (light instanceof FlatLight) {
      // 将亮度映射到0-255范围
      const intensityValue = Math.min(255, Math.max(0, Math.round(light.light.intensity * 85))); // 乘以85将0-3的值映射到0-255范围
      const intensityKey = intensityValue.toString();
      if (!lightInfo.flat[intensityKey]) {
        lightInfo.flat[intensityKey] = [];
      }
      lightInfo.flat[intensityKey].push(light);
    }
    else if (light instanceof BeamLight) {
      const colorName = getColorName(light.light.color.getHex());
      if (!lightInfo.beam[colorName]) {
        lightInfo.beam[colorName] = [];
      }
      lightInfo.beam[colorName].push(light);
    }
  });
  
  // 保存原始灯具材质和颜色，用于稍后恢复
  const originalMaterials = new Map();
  const originalColors = new Map();
  
  // 查找稀有属性的灯具并高亮显示
  let highlightedLights = [];
  
  // 对RGB灯检查稀有颜色
  Object.entries(lightInfo.rgb).forEach(([color, lights]) => {
    if (lights.length <= 2) { // 如果该颜色的灯具数量少于等于2个，标记为稀有
      highlightedLights = highlightedLights.concat(lights);
    }
  });
  
  // 对面光灯检查稀有亮度
  Object.entries(lightInfo.flat).forEach(([intensity, lights]) => {
    if (lights.length <= 2) { // 如果该亮度的灯具数量少于等于2个，标记为稀有
      highlightedLights = highlightedLights.concat(lights);
    }
  });
  
  // 对光束灯检查稀有颜色
  Object.entries(lightInfo.beam).forEach(([colorName, lights]) => {
    if (lights.length <= 2) { // 如果该颜色的灯具数量少于等于2个，标记为稀有
      highlightedLights = highlightedLights.concat(lights);
    }
  });
  
  // 高亮显示稀有灯具
  highlightedLights.forEach(light => {
    // 保存原始材质和颜色
    originalMaterials.set(light.uuid, light.body.material);
    originalColors.set(light.uuid, light.light.color.clone());
    
    // 设置高亮材质和增强亮度
    light.body.material = new THREE.MeshBasicMaterial({ color: 0xffff00, emissive: 0xffff00 });
    light.setIntensity(light.light.intensity * 1.5);
  });
  
  // 强制渲染一帧
  renderer.render(scene, camera);
  
  // 创建截图
  const screenshot = renderer.domElement.toDataURL('image/png');
  
  // 创建新的Canvas来添加文本标注
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    
    // 绘制截图
    context.drawImage(img, 0, 0);
    
    // 设置文本样式
    context.font = '14px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", "SimHei", "SimSun", "NSimSun", "FangSong", "KaiTi", "STHeiti", "STKaiti", "STSong", "STFangsong", "STZhongsong", "STLiti", Arial, Helvetica, sans-serif';
    context.fillStyle = 'white';
    context.strokeStyle = 'black';
    context.lineWidth = 2;
    
    let yPos = 30; // 文本起始y坐标
    const lineHeight = 20; // 行高
    
    // 绘制灯具信息
    // RGB灯信息
    if (Object.keys(lightInfo.rgb).length > 0) {
      context.font = 'bold 16px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", "SimHei", "SimSun", "NSimSun", "FangSong", "KaiTi", "STHeiti", "STKaiti", "STSong", "STFangsong", "STZhongsong", "STLiti", Arial, Helvetica, sans-serif';
      context.strokeText('RGB灯颜色:', 20, yPos);
      context.fillText('RGB灯颜色:', 20, yPos);
      yPos += lineHeight;
      
      context.font = '14px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", "SimHei", "SimSun", "NSimSun", "FangSong", "KaiTi", "STHeiti", "STKaiti", "STSong", "STFangsong", "STZhongsong", "STLiti", Arial, Helvetica, sans-serif';
      Object.entries(lightInfo.rgb).forEach(([color, lights]) => {
        const text = `${color}: ${lights.length}个`;
        context.strokeText(text, 30, yPos);
        context.fillText(text, 30, yPos);
        yPos += lineHeight;
      });
      yPos += 5; // 分类间额外间隔
    }
    
    // 面光灯信息
    if (Object.keys(lightInfo.flat).length > 0) {
      context.font = 'bold 16px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", "SimHei", "SimSun", "NSimSun", "FangSong", "KaiTi", "STHeiti", "STKaiti", "STSong", "STFangsong", "STZhongsong", "STLiti", Arial, Helvetica, sans-serif';
      context.strokeText('面光灯亮度(0-255):', 20, yPos);
      context.fillText('面光灯亮度(0-255):', 20, yPos);
      yPos += lineHeight;
      
      context.font = '14px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", "SimHei", "SimSun", "NSimSun", "FangSong", "KaiTi", "STHeiti", "STKaiti", "STSong", "STFangsong", "STZhongsong", "STLiti", Arial, Helvetica, sans-serif';
      Object.entries(lightInfo.flat).forEach(([intensity, lights]) => {
        const text = `亮度${intensity}: ${lights.length}个`;
        context.strokeText(text, 30, yPos);
        context.fillText(text, 30, yPos);
        yPos += lineHeight;
      });
      yPos += 5; // 分类间额外间隔
    }
    
    // 光束灯信息
    if (Object.keys(lightInfo.beam).length > 0) {
      context.font = 'bold 16px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", "SimHei", "SimSun", "NSimSun", "FangSong", "KaiTi", "STHeiti", "STKaiti", "STSong", "STFangsong", "STZhongsong", "STLiti", Arial, Helvetica, sans-serif';
      context.strokeText('光束灯颜色:', 20, yPos);
      context.fillText('光束灯颜色:', 20, yPos);
      yPos += lineHeight;
      
      context.font = '14px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", "SimHei", "SimSun", "NSimSun", "FangSong", "KaiTi", "STHeiti", "STKaiti", "STSong", "STFangsong", "STZhongsong", "STLiti", Arial, Helvetica, sans-serif';
      Object.entries(lightInfo.beam).forEach(([colorName, lights]) => {
        const text = `${colorName}: ${lights.length}个`;
        context.strokeText(text, 30, yPos);
        context.fillText(text, 30, yPos);
        yPos += lineHeight;
      });
    }
    
    // 如果有高亮灯具，添加说明
    if (highlightedLights.length > 0) {
      yPos += 10;
      context.font = 'italic 14px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "WenQuanYi Micro Hei", "SimHei", "SimSun", "NSimSun", "FangSong", "KaiTi", "STHeiti", "STKaiti", "STSong", "STFangsong", "STZhongsong", "STLiti", Arial, Helvetica, sans-serif';
      context.fillStyle = 'yellow';
      context.strokeStyle = 'black';
      const text = `* 黄色高亮的灯具为数量较少的特殊属性灯具`;
      context.strokeText(text, 20, yPos);
      context.fillText(text, 20, yPos);
    }
    
    // 创建下载链接
    const link = document.createElement('a');
    link.download = `stage_photo_${new Date().toISOString()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    // 恢复高亮灯具的原始材质和颜色
    highlightedLights.forEach(light => {
      light.body.material = originalMaterials.get(light.uuid);
      light.light.color.copy(originalColors.get(light.uuid));
      light.setIntensity(light.light.intensity / 1.5);
    });
    
    // 恢复UI显示
    uiElements.forEach(el => {
      if (el) el.style.display = 'block';
    });
    
    // 恢复相机位置和控制器
    camera.position.copy(originalPosition);
    camera.rotation.copy(originalRotation);
    controls.enabled = originalControlsEnabled;
    
    // 再次渲染以恢复原始视角
    renderer.render(scene, camera);
  };
  
  img.src = screenshot;
}

// 添加一个处理"点哪朝哪"模式点击事件的函数
function handlePointAndClickMode(event) {
  // 如果没有灯具开启"点哪朝哪"模式，直接返回
  if (!pointAndClickMode) return false;
  
  // 计算鼠标位置
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // 创建射线检测与舞台的交点
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(stage);
  
  // 如果射线与舞台相交
  if (intersects.length > 0) {
    const hitPoint = intersects[0].point;
    
    // 让所有开启"点哪朝哪"模式的灯具朝向点击位置
    pointAndClickLights.forEach(light => {
      // 保存当前的旋转信息，以便在历史记录中使用
      const oldRotation = light.group.rotation.clone();
      
      // 使灯具朝向点击位置
      light.lookAt(hitPoint);
      
      // 以下代码是为了同步控制面板上的旋转信息
      if (gui && selectedLights.includes(light)) {
        for (let i = 0; i < gui.__controllers.length; i++) {
          const controller = gui.__controllers[i];
          if (controller.property === 'rotationX' || 
              controller.property === 'rotationY' || 
              controller.property === 'rotationZ') {
            controller.updateDisplay();
          }
        }
      }
    });
    
    // 阻止普通的场景点击处理
    return true;
  }
  
  return false;
}

// ========== 添加灯具全选功能 ==========
function selectAllLightsByType(type) {
  // 清空当前选择
  selectedLights = [];
  
  // 根据类型选择灯具
  switch(type.toLowerCase()) {
    case 'rgb':
      selectedLights = lightManager.lights.filter(light => light instanceof RGBLight);
      break;
    case 'flat':
      selectedLights = lightManager.lights.filter(light => light instanceof FlatLight);
      break;
    case 'beam':
      selectedLights = lightManager.lights.filter(light => light instanceof BeamLight);
      break;
    case 'all':
      selectedLights = [...lightManager.lights];
      break;
  }
  
  // 如果没有找到匹配类型的灯具，显示提示
  if(selectedLights.length === 0) {
    alert(`没有找到${type}类型的灯具`);
    return;
  }
  
  // 更新控制面板和高亮显示
  updateControlPanel();
  highlightSelectedLights();
}

// 添加灯具回中（重置）功能
function resetSelectedLights() {
  // 如果没有选中灯具，则不执行任何操作
  if (selectedLights.length === 0) return;
  
  // 遍历所有选中的灯具
  selectedLights.forEach(light => {
    // 根据灯具类型设置不同的默认参数
    if (light instanceof RGBLight) {
      // RGB灯: 颜色改为白色，亮度为0.24
      light.setColor(0xffffff);
      light.setIntensity(0.24);
      
    } else if (light instanceof FlatLight) {
      // 面光灯: 亮度改为0.58
      light.setIntensity(0.58);
      
    } else if (light instanceof BeamLight) {
      // 光束灯: 旋转轴回中（置零），颜色为白色，亮度为2
      // 将角度从0.24调整为在新范围内的合适值
      light.group.rotation.set(0, 0, 0);
      light.setColor(0xffffff);
      light.setIntensity(2);
      light.setAngle(0.24); // 这个值已经在新范围内，保持不变
      
      // 更新光束长度
      light.updateBeamLength();
    }
  });
  
  // 更新控制面板以反映新的参数值
  updateControlPanel();
}

// ========== 灯具组定义 ==========
const lightGroups = {
  flat: { name: '面光灯组', ids: [1, 16], shortcut: 'Q' },
  par1: { name: '第一排帕灯组', ids: [17, 28], shortcut: 'W' },
  par2: { name: '第二排帕灯组', ids: [29, 40], shortcut: 'E' },
  par3: { name: '第三排帕灯组', ids: [41, 49], shortcut: 'R' },
  par4: { name: '第四排帕灯组', ids: [50, 58], shortcut: 'T' },
  beam1: { name: '第一排光束灯组', ids: [59, 62], shortcut: 'Y' },
  beam2: { name: '第二排光束灯组', ids: [63, 68], shortcut: 'U' }
};

// 灯具组选择函数
function selectLightGroup(groupKey) {
  const group = lightGroups[groupKey];
  if (!group) {
    console.log('Group not found for key:', groupKey);
    return;
  }
  
  const [startId, endId] = group.ids;
  const groupLights = lightManager.lights.filter(light => 
    light.getID() >= startId && light.getID() <= endId
  );
  
  if (groupLights.length === 0) {
    console.log(`没有找到ID ${startId}-${endId} 的灯具`);
    return;
  }
  
  selectedLights = groupLights;
  updateControlPanel();
  highlightSelectedLights();
  
  console.log(`已选择${group.name}: ${groupLights.length}个灯具`);
}

// 创建灯具组选择面板
function createLightGroupPanel() {
  // 检查是否已存在面板
  let panel = document.getElementById('light-group-panel');
  if (panel) {
    panel.remove();
  }
  
  // 创建面板容器
  panel = document.createElement('div');
  panel.id = 'light-group-panel';
  panel.style.cssText = `
    position: fixed;
    right: 20px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #00ffff;
    border-radius: 10px;
    padding: 15px;
    color: white;
    font-family: 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'WenQuanYi Micro Hei', 'SimHei', 'SimSun', 'NSimSun', 'FangSong', 'KaiTi', 'STHeiti', 'STKaiti', 'STSong', 'STFangsong', 'STZhongsong', 'STLiti', 'Arial', 'Helvetica', 'sans-serif';
    z-index: 1000;
    min-width: 200px;
  `;
  
  // 创建标题
  const title = document.createElement('div');
  title.textContent = '灯具组选择';
  title.style.cssText = `
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 15px;
    color: #00ffff;
    border-bottom: 1px solid #00ffff;
    padding-bottom: 8px;
  `;
  panel.appendChild(title);
  
  // 创建按钮组
  Object.entries(lightGroups).forEach(([key, group]) => {
    const button = document.createElement('button');
    button.textContent = `${group.name} (${group.shortcut})`;
    button.style.cssText = `
      display: block;
      width: 100%;
      margin: 5px 0;
      padding: 8px 12px;
      background: rgba(0, 255, 255, 0.2);
      border: 1px solid #00ffff;
      border-radius: 5px;
      color: white;
      cursor: pointer;
      font-size: 12px;
      font-family: 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'WenQuanYi Micro Hei', 'SimHei', 'SimSun', 'NSimSun', 'FangSong', 'KaiTi', 'STHeiti', 'STKaiti', 'STSong', 'STFangsong', 'STZhongsong', 'STLiti', 'Arial', 'Helvetica', 'sans-serif';
      transition: all 0.3s ease;
    `;
    
    // 添加悬停效果
    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(0, 255, 255, 0.4)';
      button.style.transform = 'scale(1.02)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = 'rgba(0, 255, 255, 0.2)';
      button.style.transform = 'scale(1)';
    });
    
    // 添加点击事件
    button.addEventListener('click', (event) => {
      // 阻止事件冒泡
      event.preventDefault();
      event.stopPropagation();
      
      selectLightGroup(key);
      
      // 添加点击反馈
      button.style.background = 'rgba(0, 255, 255, 0.6)';
      setTimeout(() => {
        button.style.background = 'rgba(0, 255, 255, 0.2)';
      }, 200);
    });
    
    panel.appendChild(button);
  });
  
  // 添加说明文字
  const info = document.createElement('div');
  info.textContent = '快捷键: Q W E R T Y U | G: 切换面板 | I: 显示/隐藏ID标签';
  info.style.cssText = `
    text-align: center;
    font-size: 10px;
    margin-top: 10px;
    color: #888;
    border-top: 1px solid #333;
    padding-top: 8px;
  `;
  panel.appendChild(info);
  
  // 添加到页面
  document.body.appendChild(panel);
}

// 切换灯具组选择面板显示
function toggleLightGroupPanel() {
  const panel = document.getElementById('light-group-panel');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  } else {
    createLightGroupPanel();
  }
}
