/**
 * FVTT Map Height Editor Module
 * Main entry point and initialization
 * 主入口和初始化
 */

// Module constants
const MODULE_ID = "fvtt-map-height";
const MODULE_TITLE = "Map Height Editor";

// Global module object
window.MapHeightEditor = {};

/**
 * Module initialization hook
 * 模块初始化钩子
 */
Hooks.once('init', async function() {
  console.log(`${MODULE_TITLE} | Initializing module...`);
  
  // Register module settings
  registerModuleSettings();
  
  // Initialize global module object
  MapHeightEditor.MODULE_ID = MODULE_ID;
  MapHeightEditor.isActive = false;
  MapHeightEditor.currentBrushHeight = 0;
  
  // Register custom canvas layer
  registerCanvasLayer();
  
  console.log(`${MODULE_TITLE} | Module initialized successfully`);
});

/**
 * Setup hook - called when FVTT is ready
 * 设置钩子 - FVTT准备就绪时调用
 */
Hooks.once('setup', async function() {
  console.log(`${MODULE_TITLE} | Setting up module...`);
  
  // Import and initialize components
  await loadModuleComponents();
});

/**
 * Ready hook - called when everything is loaded
 * 准备钩子 - 一切加载完毕时调用
 */
Hooks.once('ready', async function() {
  console.log(`${MODULE_TITLE} | Module ready`);
  
  // Initialize UI components if user is GM
  if (game.user.isGM) {
    initializeGMInterface();
  }
});

/**
 * Canvas ready hook - called when canvas is ready
 * Canvas准备钩子 - Canvas准备就绪时调用
 */
Hooks.on('canvasReady', async function() {
  if (!game.user.isGM) return;
  
  console.log(`${MODULE_TITLE} | Canvas ready, reinitializing components for new scene`);
  
  // Reinitialize height manager for the new scene
  if (MapHeightEditor.heightManager) {
    MapHeightEditor.heightManager.initialize(canvas.scene);
  }
  
  // Reinitialize height overlay
  if (MapHeightEditor.heightOverlay) {
    MapHeightEditor.heightOverlay.updateGridParameters();
  }
  
  console.log(`${MODULE_TITLE} | Components reinitialized for scene: ${canvas.scene?.name}`);
});

/**
 * Scene controls hook - add our control button
 * 场景控件钩子 - 添加控制按钮
 */
Hooks.on('getSceneControlButtons', (controls) => {
  if (!game.user.isGM) return;
  
  const mapHeightControl = {
    name: "mapheight",
    title: "Map Height Editor",
    icon: "fas fa-mountain",
    layer: "mapheight", // Use our custom layer
    tools: [
      {
        name: "height-sidebar",
        title: "Open Height Editor",
        icon: "fas fa-tools",
        onClick: () => openHeightSidebar(),
        button: true
      },
      {
        name: "height-edit",
        title: "Height Edit Mode",
        icon: "fas fa-edit",
        onClick: () => toggleHeightEditMode(),
        active: MapHeightEditor.isActive,
        toggle: true
      },
      {
        name: "height-brush-0",
        title: "Height 0",
        icon: "fas fa-water",
        onClick: () => setBrushHeight(0),
        active: MapHeightEditor.currentBrushHeight === 0
      },
      {
        name: "height-brush-5",
        title: "Height 5",
        icon: "fas fa-leaf",
        onClick: () => setBrushHeight(5),
        active: MapHeightEditor.currentBrushHeight === 5
      },
      {
        name: "height-brush-10",
        title: "Height 10",
        icon: "fas fa-mountain",
        onClick: () => setBrushHeight(10),
        active: MapHeightEditor.currentBrushHeight === 10
      }
    ]
  };
  
  controls.push(mapHeightControl);
});

/**
 * Register custom canvas layer
 * 注册自定义canvas层
 */
async function registerCanvasLayer() {
  try {
    // Import the custom layer
    const HeightLayer = await import('./ui/height-layer.js');
    MapHeightEditor.HeightLayer = HeightLayer.default;
    
    // Register the layer with FVTT
    CONFIG.Canvas.layers.mapheight = {
      layerClass: HeightLayer.default,
      group: "interface"
    };
    
    console.log(`${MODULE_TITLE} | Custom canvas layer registered`);
  } catch (error) {
    console.error(`${MODULE_TITLE} | Error registering canvas layer:`, error);
  }
}

/**
 * Register module configuration settings
 * 注册模块配置设置
 */
function registerModuleSettings() {
  // Enable/disable automatic height updates
  game.settings.register(MODULE_ID, "autoUpdateTokens", {
    name: "Auto Update Token Heights",
    hint: "Automatically update token elevations when they move to different height grids",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  
  // Height visualization opacity
  game.settings.register(MODULE_ID, "overlayOpacity", {
    name: "Height Overlay Opacity",
    hint: "Opacity of the height number overlay (0-1)",
    scope: "client",
    config: true,
    type: Number,
    range: {
      min: 0,
      max: 1,
      step: 0.1
    },
    default: 0.8
  });
  
  // Default brush height
  game.settings.register(MODULE_ID, "defaultBrushHeight", {
    name: "Default Brush Height",
    hint: "Default height value for the brush tool",
    scope: "client",
    config: true,
    type: Number,
    default: 0
  });
}

/**
 * Load module components dynamically
 * 动态加载模块组件
 */
async function loadModuleComponents() {
  try {
    // Import height manager
    const HeightManager = await import('./height-manager.js');
    MapHeightEditor.HeightManager = HeightManager.default;
    
    // Import token automation
    const TokenAutomation = await import('./token-automation.js');
    MapHeightEditor.TokenAutomation = TokenAutomation.default;
    
    // Import UI components
    const SidebarControl = await import('./ui/sidebar-control.js');
    MapHeightEditor.SidebarControl = SidebarControl.default;
    
    const HeightOverlay = await import('./ui/height-overlay.js');
    MapHeightEditor.HeightOverlay = HeightOverlay.default;
    
    // Import debug helper (only in debug mode)
    if (game.settings.get("core", "debug") || window.location.search.includes("debug")) {
      const DebugHelper = await import('./debug-helper.js');
      MapHeightEditor.DebugHelper = DebugHelper.default;
    }
    
    // HeightLayer is already imported during init in registerCanvasLayer()
    
    // const BrushTools = await import('./ui/brush-tools.js');
    
  } catch (error) {
    console.error(`${MODULE_TITLE} | Error loading components:`, error);
  }
}

/**
 * Initialize GM-specific interface elements
 * 初始化GM专用界面元素
 */
function initializeGMInterface() {
  console.log(`${MODULE_TITLE} | Initializing GM interface`);
  
  // Initialize height manager
  MapHeightEditor.heightManager = new MapHeightEditor.HeightManager();
  const initialized = MapHeightEditor.heightManager.initialize();
  
  if (!initialized) {
    console.error(`${MODULE_TITLE} | Failed to initialize height manager`);
    return;
  }
  
  // Initialize token automation
  MapHeightEditor.tokenAutomation = new MapHeightEditor.TokenAutomation(MapHeightEditor.heightManager);
  
  // Initialize sidebar control
  MapHeightEditor.sidebar = new MapHeightEditor.SidebarControl(MapHeightEditor.heightManager);
  
  // Initialize height overlay
  MapHeightEditor.heightOverlay = new MapHeightEditor.HeightOverlay(MapHeightEditor.heightManager);
  
  // Set default brush height from settings
  MapHeightEditor.currentBrushHeight = game.settings.get(MODULE_ID, "defaultBrushHeight");
  
  // Install debug commands if available
  if (MapHeightEditor.DebugHelper) {
    MapHeightEditor.DebugHelper.installDebugCommands();
  }
  
  console.log(`${MODULE_TITLE} | GM interface initialized successfully`);
}

/**
 * Toggle height edit mode
 * 切换高度编辑模式
 */
function toggleHeightEditMode() {
  MapHeightEditor.isActive = !MapHeightEditor.isActive;
  
  if (MapHeightEditor.isActive) {
    console.log(`${MODULE_TITLE} | Height edit mode activated`);
    // Show sidebar
    if (MapHeightEditor.sidebar) {
      MapHeightEditor.sidebar.render(true);
    }
    // Enable height edit mode on the custom layer
    if (canvas.mapheight) {
      canvas.mapheight.enableHeightEditMode();
    }
    // Show height overlay
    showHeightOverlay();
  } else {
    console.log(`${MODULE_TITLE} | Height edit mode deactivated`);
    // Hide sidebar
    if (MapHeightEditor.sidebar) {
      MapHeightEditor.sidebar.close();
    }
    // Disable height edit mode on the custom layer
    if (canvas.mapheight) {
      canvas.mapheight.disableHeightEditMode();
    }
    // Hide height overlay
    hideHeightOverlay();
  }
  
  // Refresh scene controls to update button state
  ui.controls.render();
}

/**
 * Open the height editor sidebar
 * 打开高度编辑器侧边栏
 */
function openHeightSidebar() {
  if (MapHeightEditor.sidebar) {
    MapHeightEditor.sidebar.render(true);
  } else {
    console.warn(`${MODULE_TITLE} | Sidebar not initialized`);
  }
}

/**
 * Set brush height value
 * 设置画笔高度值
 */
function setBrushHeight(height) {
  MapHeightEditor.currentBrushHeight = height;
  console.log(`${MODULE_TITLE} | Brush height set to:`, height);
  
  // Update settings
  game.settings.set(MODULE_ID, "defaultBrushHeight", height);
  
  // Update sidebar if it's open
  if (MapHeightEditor.sidebar && MapHeightEditor.sidebar.rendered) {
    MapHeightEditor.sidebar.currentBrushHeight = height;
    MapHeightEditor.sidebar.render();
  }
  
  // Refresh scene controls to update button states
  ui.controls.render();
}

/**
 * Show height overlay
 * 显示高度覆盖层
 */
function showHeightOverlay() {
  if (MapHeightEditor.heightOverlay) {
    MapHeightEditor.heightOverlay.show();
  } else {
    console.warn(`${MODULE_TITLE} | Height overlay not initialized`);
  }
}

/**
 * Hide height overlay
 * 隐藏高度覆盖层
 */
function hideHeightOverlay() {
  if (MapHeightEditor.heightOverlay) {
    MapHeightEditor.heightOverlay.hide();
  } else {
    console.warn(`${MODULE_TITLE} | Height overlay not initialized`);
  }
}

// Export for potential use by other modules
export { MODULE_ID, MODULE_TITLE };