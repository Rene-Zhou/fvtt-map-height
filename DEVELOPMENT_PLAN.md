# FVTT Map Height Editor Module - 开发计划

## 项目概述

### 目标
设计一个 Foundry VTT (FVTT) v12.343 的 Add-on Module，实现对地图中地面高度的快速编辑，位于不同高度地面的token自动化获得对应的height，简化诸如悬崖、高地这一类场景的设计。

### 核心功能
- 左侧边栏新增地图高度控件
- 进入地图高度编辑视野，每个格子显示高度数值（初始为0）
- 提供不同高度的"画笔"工具设定格子高度
- Token自动根据所在格子更新高度
- 飞行单位例外列表管理

## 技术架构

### 核心组件架构

#### 1. 数据存储层 (Data Layer)
```javascript
// 使用 Scene.flags 存储高度数据
scene.flags["map-height"] = {
  gridHeights: Map<string, number>, // 格式: "x,y" -> height
  exceptTokens: Set<string>, // 飞行单位例外列表 (token IDs)
  enabled: boolean // 高度系统是否启用
}
```

#### 2. UI 控制层 (UI Layer)
- 基于 ApplicationV2 的侧边栏控件
- 高度编辑模式界面
- 画笔工具栏
- 例外列表管理器

#### 3. 渲染层 (Render Layer)
- Canvas 覆盖层显示高度数值
- 高度可视化（可选颜色编码）
- 实时预览效果

#### 4. 逻辑控制层 (Logic Layer)
- 自动更新 token 高度
- 坐标计算和网格映射
- 事件监听和响应

### 关键 FVTT v12 API 使用

#### TokenData 高度属性
```javascript
// 利用现有的 elevation 属性
token.document.update({elevation: newHeight});
```

#### BaseGrid 坐标转换
```javascript
// 像素坐标转网格坐标
const gridCoords = canvas.grid.getOffset({x: token.x, y: token.y});
const gridKey = `${gridCoords.i},${gridCoords.j}`;
```

#### ApplicationV2 侧边栏集成
```javascript
// 新增侧边栏控件
class MapHeightControl extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "map-height-control",
    classes: ["map-height"],
    window: {title: "地图高度编辑"},
    position: {width: 300, height: 400}
  };
}
```

## 项目文件结构

```
fvtt-map-height/
├── module.json                 # 模块清单
├── scripts/
│   ├── main.js                # 主入口和初始化
│   ├── height-manager.js      # 高度数据管理
│   ├── ui/
│   │   ├── sidebar-control.js # 侧边栏控件
│   │   ├── height-overlay.js  # Canvas 覆盖层
│   │   └── brush-tools.js     # 画笔工具
│   └── token-automation.js    # Token 自动化
├── templates/
│   ├── sidebar-control.hbs    # 侧边栏模板
│   └── brush-toolbar.hbs      # 工具栏模板
├── styles/
│   └── map-height.css         # 样式文件
├── lang/
│   ├── en.json               # 英文语言包
│   └── zh.json               # 中文语言包
└── DEVELOPMENT_PLAN.md       # 本文档
```

## 开发阶段计划

### 阶段一：基础架构

#### 1.1 模块基础设置
- [ ] 创建 `module.json` 清单文件，兼容 FVTT v12.343
- [ ] 设置 ESModule 结构和基础 hooks
- [ ] 实现模块初始化和配置系统
- [ ] 设置开发环境和测试场景

#### 1.2 数据存储系统
- [ ] 设计 Scene flags 数据结构存储网格高度
- [ ] 实现高度数据的读取、写入、更新方法
- [ ] 添加数据验证和错误处理
- [ ] 实现数据迁移和向后兼容

### 阶段二：UI 界面开发

#### 2.1 侧边栏控件
- [ ] 使用 ApplicationV2 创建高度编辑控件
- [ ] 集成到 FVTT 左侧工具栏
- [ ] 实现模式切换（普通模式/高度编辑模式）
- [ ] 添加控件图标和样式

#### 2.2 高度编辑界面
- [ ] Canvas 覆盖层显示网格高度数值
- [ ] 画笔工具栏（不同高度值的画笔）
- [ ] 高度可视化（颜色编码或透明度）
- [ ] 实时预览和交互反馈

### 阶段三：核心功能

#### 3.1 高度编辑系统
- [ ] 点击/拖拽修改网格高度
- [ ] 实时更新显示和数据存储
- [ ] 撤销/重做功能支持
- [ ] 批量编辑工具（矩形选择、填充等）

#### 3.2 Token 自动高度更新
- [ ] 监听 Token 移动事件
- [ ] 自动计算并更新 Token 高度
- [ ] 处理多格子 Token 的高度计算
- [ ] 优化性能，避免频繁更新

### 阶段四：高级功能

#### 4.1 例外列表管理
- [ ] 飞行单位标记和管理界面
- [ ] Token 右键菜单集成
- [ ] 批量操作支持
- [ ] 例外状态可视化指示

#### 4.2 优化和完善
- [ ] 性能优化（大地图支持）
- [ ] 用户体验改进
- [ ] 错误处理和边界情况
- [ ] 国际化支持（中英文）

## 开发流程

### 环境准备
1. 安装 FVTT v12.343 开发环境
2. 创建测试世界和场景
3. 配置模块开发目录
4. 准备测试用的地图和 Token

### 开发流程标准

#### 代码标准
- 使用 ES6+ 模块语法
- 遵循 FVTT 官方 API 最佳实践
- 只使用公开的稳定 API
- 注释使用英文

#### 测试流程
1. **单元测试**：每个功能模块独立测试
2. **集成测试**：模块间协作测试
3. **用户测试**：实际使用场景测试
4. **兼容性测试**：不同游戏系统和模块的兼容性

#### 版本控制
- 使用 Git 进行版本控制
- 每个阶段创建对应的分支
- 主要功能完成后合并到主分支
- 使用语义化版本号 (Semantic Versioning)

### 质量保证

#### 代码质量
- [ ] 错误处理完整
- [ ] 性能优化到位
- [ ] 内存泄漏检查
- [ ] 兼容性测试通过

#### 用户体验
- [ ] 界面直观易用
- [ ] 操作流程顺畅
- [ ] 错误提示清晰
- [ ] 响应速度良好

## 核心技术实现要点

### 网格坐标系统
```javascript
class GridHeightManager {
  // 获取 token 当前网格坐标
  getTokenGridPosition(token) {
    return canvas.grid.getOffset({x: token.x, y: token.y});
  }
  
  // 设置网格高度
  setGridHeight(gridX, gridY, height) {
    const scene = canvas.scene;
    const key = `${gridX},${gridY}`;
    scene.setFlag("map-height", `gridHeights.${key}`, height);
  }
  
  // 自动更新 token 高度
  updateTokenElevation(token) {
    if (this.isExceptionToken(token.id)) return;
    
    const pos = this.getTokenGridPosition(token);
    const height = this.getGridHeight(pos.i, pos.j);
    token.document.update({elevation: height});
  }
}
```

### UI 集成方案
```javascript
// ApplicationV2 侧边栏控件
class MapHeightSidebar extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "map-height-sidebar",
    classes: ["map-height-control"],
    window: { title: "地图高度", minimizable: true }
  };
  
  _onRender() {
    // 绑定画笔工具事件
    this.element.querySelectorAll('.height-brush').forEach(btn => {
      btn.addEventListener('click', this._onBrushSelect.bind(this));
    });
  }
}
```

## 关键 FVTT v12 API 参考

### Scene 数据存储
- `scene.setFlag("module-name", "key", value)` - 存储自定义数据
- `scene.getFlag("module-name", "key")` - 读取自定义数据

### Token 高度控制
- `TokenData.elevation: number` - Token 高度属性
- `token.document.update({elevation: height})` - 更新 Token 高度

### 网格系统
- `canvas.grid.getOffset({x, y})` - 像素坐标转网格坐标
- `canvas.grid.getCenterPoint({i, j})` - 网格中心点坐标
- `canvas.grid.size` - 网格大小（像素）

### UI 框架 (ApplicationV2)
- `foundry.applications.api.ApplicationV2` - V12 推荐的 UI 基类
- 支持现代化的 DOM 操作（无需 jQuery）

### 事件钩子
- `Hooks.on("updateToken", callback)` - 监听 Token 更新
- `Hooks.on("canvasReady", callback)` - Canvas 准备就绪
- `Hooks.on("renderSceneControls", callback)` - 渲染场景控件

## 风险和挑战

### 技术风险
1. **性能问题**：大地图时的网格渲染性能
2. **兼容性**：与其他模块的潜在冲突
3. **API 稳定性**：FVTT API 的版本兼容性

### 解决方案
1. 实现延迟渲染和视口裁剪
2. 提供兼容性检查和冲突检测
3. 只使用公开的稳定 API，避免使用私有 API

## 发布和维护计划

### 发布准备
- [ ] 完整的功能测试
- [ ] 文档编写（README, CHANGELOG）
- [ ] 示例场景和教程
- [ ] 社区反馈收集

### 维护计划
- 定期更新以支持新版本 FVTT
- 收集用户反馈并持续改进
- 修复 bug 和安全问题
- 添加社区请求的功能

---

**目标版本**：v1.0.0  
**兼容版本**：FVTT v12.343+