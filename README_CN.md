# 地图高度编辑器

一个用于编辑地图地面高度并根据网格位置自动管理Token高度的Foundry VTT模组。

[English Documentation](README.md)

## 功能特性

### 高度绘制
- **点击绘制**: 点击网格方块设置其高度
- **拖拽绘制**: 点击并拖动以一次绘制多个网格方块
- **预设画笔**: 快速访问常用高度值 (0, 5, 10)
- **自定义高度**: 设置 -1000 到 1000 之间的任意高度值
- **可视化覆盖层**: 在地图上显示带颜色编码的高度值
  - 蓝色 (#4FC3F7): 高度 0 (水位)
  - 绿色 (#81C784): 正海拔
  - 红色 (#E57373): 负海拔

### 自动Token高度更新
- **自动更新**: Token移动到不同高度网格时自动更新其高度值
- **多网格支持**: 正确处理占据多个网格方块的Token
- **例外列表**: 管理飞行单位和其他应忽略自动高度更新的Token
- **性能优化**: 节流更新和视口剔除，确保流畅性能

### 数据管理
- **持久化存储**: 高度数据按场景保存在场景标志中
- **导入/导出**: 将高度数据导出为JSON文件以进行备份和共享
- **清除全部**: 一键重置所有高度数据
- **实时统计**: 跟踪网格覆盖范围和高度范围

## 安装

### 方法1: 清单URL
1. 在Foundry VTT中，转到 **附加模组**
2. 点击 **安装模组**
3. 粘贴清单URL: `https://github.com/your-username/fvtt-map-height/releases/latest/download/module.json`
4. 点击 **安装**

### 方法2: 手动安装
1. 从 [发布页面](https://github.com/your-username/fvtt-map-height/releases) 下载最新版本
2. 将ZIP文件解压到Foundry的 `Data/modules` 目录
3. 重启Foundry VTT
4. 在世界中启用该模组

## 系统要求

- **Foundry VTT**: 版本 12.343 或更高
- **游戏系统**: 任意（系统无关）
- **地图类型**: 基于网格的地图（方形或六边形网格）

## 使用方法

### 入门指南

1. **激活模组**
   - 在世界的模组设置中启用"地图高度编辑器"
   - 模组界面将出现在侧边栏中（仅GM可见）

2. **启用高度编辑模式**
   - 点击"高度编辑模式"按钮激活编辑
   - 高度覆盖层将显示在画布上

3. **绘制高度**
   - 从工具栏选择画笔高度
   - 点击网格方块设置其高度
   - 或点击并拖动以绘制多个方块

4. **配置自动更新**
   - 启用"自动更新Token高度"以自动更新Token高度值
   - 将飞行单位添加到例外列表以防止自动更新

### 界面概览

#### 高度画笔部分
- **预设画笔**: 快速访问高度 0、5 和 10
- **自定义高度输入**: 输入 -1000 到 1000 之间的任意高度值
- **当前画笔显示**: 显示当前选择的画笔值

#### 设置部分
- **自动更新Token高度**: 切换自动Token高度值更新
- **高度覆盖层透明度**: 调整高度覆盖层的可见度 (0-1)

#### 例外管理
- **添加例外**: 将选定的Token添加到飞行单位例外列表
- **移除例外**: 从例外列表中移除Token
- **例外列表**: 查看所有忽略自动高度更新的Token

#### 数据管理
- **导出数据**: 将高度数据导出为JSON文件
- **导入数据**: 从JSON文件导入高度数据
- **清除全部**: 重置所有高度数据（需确认）

### 高级功能

#### 视口剔除
模组自动剔除屏幕外的网格元素，以在大型地图上实现最佳性能。仅渲染可见网格（加上2个网格的缓冲区）。

#### 边距支持
模组正确处理场景边距设置，即使在扩展画布区域也能确保准确的网格定位。

#### 多网格Token
占据多个网格方块的Token将使用其左上角网格位置的高度。

## 配置

### 模组设置

#### 自动更新Token高度
- **类型**: 世界设置（影响所有玩家）
- **默认值**: 启用
- **描述**: 当Token移动到不同高度网格时自动更新其高度值

#### 高度覆盖层透明度
- **类型**: 客户端设置（每个玩家独立）
- **默认值**: 0.7
- **范围**: 0.0 (透明) 到 1.0 (不透明)
- **描述**: 控制高度数字覆盖层的可见度

#### 默认画笔高度
- **类型**: 客户端设置（每个玩家独立）
- **默认值**: 0
- **范围**: -1000 到 1000
- **描述**: 模组首次激活时的默认高度值

## 故障排除

### 高度无法保存
- 确保您拥有GM权限
- 检查场景是否未被锁定
- 验证模组是否已为当前世界启用

### Token高度值未更新
- 检查是否启用了"自动更新Token高度"
- 验证Token是否不在例外列表中
- 确保Token已移动到不同的网格方块

### 覆盖层不可见
- 检查"高度覆盖层透明度"设置
- 确保已激活"高度编辑模式"
- 验证画布图层是否未被隐藏

### 大型地图性能问题
- 模组使用视口剔除来优化性能
- 仅渲染可见网格，因此性能应保持流畅
- 如果问题仍然存在，请尝试降低覆盖层透明度或在不编辑时禁用覆盖层

## 开发

### 项目结构
```
fvtt-map-height/
├── module.json                  # 模组清单
├── CLAUDE.md                    # AI助手开发指南
├── README.md                    # 英文文档
├── README_CN.md                 # 本文件
├── scripts/
│   ├── main.js                 # 模组入口点
│   ├── height-manager.js       # 核心数据管理
│   ├── token-automation.js     # Token高度自动化
│   ├── debug-helper.js         # 开发工具
│   └── ui/
│       ├── sidebar-control.js  # ApplicationV2 UI
│       ├── height-overlay.js   # PIXI画布覆盖层
│       └── height-layer.js     # 画布交互层
├── templates/
│   └── sidebar-control.hbs     # Handlebars UI模板
├── styles/
│   └── map-height.css          # 模组样式
└── lang/
    ├── en.json                 # 英文翻译
    └── cn.json                 # 中文翻译
```

### 架构
模组遵循四层架构：
1. **UI控制层** - 用户交互和控制
2. **渲染层** - PIXI可视化和视口剔除
3. **逻辑层** - Token跟踪和业务逻辑
4. **数据存储层** - 场景标志和网格计算

有关详细的开发文档，请参阅 [CLAUDE.md](CLAUDE.md)。

### 构建和测试

本模组使用 **纯ES6模块**，无需构建过程：
- 无需转译或打包
- 为CSS、模板和JSON文件启用热重载
- 浏览器直接加载ES模块

开发步骤：
1. 在Foundry模组目录中创建符号链接
2. 在Foundry中启用模组
3. 通过在URL中添加 `?debug` 启用调试模式
4. 使用浏览器控制台执行调试命令 (`debugMapHeight.*`)

## 开发者API

### 自定义钩子

模组触发自定义钩子，其他模组可以监听：

```javascript
// 当网格高度改变时触发
Hooks.on("fvtt-map-height.gridHeightChanged", ({gridX, gridY, height, oldHeight, key}) => {
  console.log(`网格 (${gridX}, ${gridY}) 从 ${oldHeight} 变为 ${height}`);
});

// 当Token的高度值自动更新时触发
Hooks.on("fvtt-map-height.tokenElevationUpdated", ({tokenDocument, oldElevation, newElevation}) => {
  console.log(`Token ${tokenDocument.name} 高度值从 ${oldElevation} 变为 ${newElevation}`);
});

// 当Token被添加到例外列表时触发
Hooks.on("fvtt-map-height.tokenExceptionAdded", ({tokenId}) => {
  console.log(`Token ${tokenId} 已添加到例外列表`);
});

// 当Token从例外列表中移除时触发
Hooks.on("fvtt-map-height.tokenExceptionRemoved", ({tokenId}) => {
  console.log(`Token ${tokenId} 已从例外列表中移除`);
});

// 当导入高度数据时触发
Hooks.on("fvtt-map-height.dataImported", ({scene, data}) => {
  console.log(`已为场景 ${scene.name} 导入高度数据`);
});
```

### 访问模组API

```javascript
// 访问HeightManager
const heightManager = window.MapHeightEditor.heightManager;

// 获取特定网格的高度
const height = heightManager.getGridHeight(10, 5);

// 设置特定网格的高度（仅GM）
await heightManager.setGridHeight(10, 5, 15);

// 检查Token是否在例外列表中
const isException = heightManager.isExceptionToken(token.id);

// 导出高度数据
const data = heightManager.exportData();

// 导入高度数据
await heightManager.importData(data);
```

## 许可证

本模组采用 [MIT许可证](LICENSE)。

## 致谢

- **开发者**: Map Height Editor Developer
- **Foundry VTT**: [https://foundryvtt.com](https://foundryvtt.com)
- **PIXI.js**: [https://pixijs.com](https://pixijs.com)

## 支持

- **问题反馈**: [GitHub Issues](https://github.com/your-username/fvtt-map-height/issues)
- **Discord**: developer#0000

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本历史和更新。

---

**注意**: 本模组专为Foundry VTT v12.343+设计。它使用现代ApplicationV2框架，可能与早期版本的Foundry VTT不兼容。
