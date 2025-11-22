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
  
  
  // Reinitialize height manager for the new scene
  if (MapHeightEditor.heightManager) {
    MapHeightEditor.heightManager.initialize(canvas.scene);
  }
  
  // Reinitialize height overlay
  if (MapHeightEditor.heightOverlay) {
    MapHeightEditor.heightOverlay.updateGridParameters();
  }
  
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

  // Brush display position (not shown in config menu)
  game.settings.register(MODULE_ID, "brushDisplayPosition", {
    name: "Brush Display Position",
    scope: "client",
    config: false,
    type: Object,
    default: { x: 20, y: 20 }
  });

  // Brush display visible
  game.settings.register(MODULE_ID, "brushDisplayVisible", {
    name: "Show Brush Display",
    hint: "Show the on-canvas brush height display when in edit mode",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  // Keyboard shortcuts enabled
  game.settings.register(MODULE_ID, "keyboardShortcutsEnabled", {
    name: "Enable Keyboard Shortcuts",
    hint: "Enable keyboard shortcuts for adjusting brush height (Arrow keys, +/-)",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
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

    // Import brush display
    const BrushDisplay = await import('./ui/brush-display.js');
    MapHeightEditor.BrushDisplay = BrushDisplay.default;

    // Import keyboard handler
    const KeyboardHandler = await import('./keyboard-handler.js');
    MapHeightEditor.KeyboardHandler = KeyboardHandler.default;

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

  // Initialize brush display
  MapHeightEditor.brushDisplay = new MapHeightEditor.BrushDisplay();

  // Initialize keyboard handler
  MapHeightEditor.keyboardHandler = new MapHeightEditor.KeyboardHandler(
    MapHeightEditor.sidebar,
    MapHeightEditor.brushDisplay
  );

  // Install debug commands if available
  if (MapHeightEditor.DebugHelper) {
    MapHeightEditor.DebugHelper.installDebugCommands();
  }

}

/**
 * Toggle height edit mode
 * 切换高度编辑模式
 */
function toggleHeightEditMode() {
  MapHeightEditor.isActive = !MapHeightEditor.isActive;

  if (MapHeightEditor.isActive) {
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
    // Show brush display
    showBrushDisplay();
    // Enable keyboard shortcuts
    enableKeyboardShortcuts();
  } else {
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
    // Hide brush display
    hideBrushDisplay();
    // Disable keyboard shortcuts
    disableKeyboardShortcuts();
  }

  // Fire hook for edit mode change
  Hooks.callAll(`${MODULE_ID}.editModeChanged`, MapHeightEditor.isActive);

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

  // Update sidebar if it's open
  if (MapHeightEditor.sidebar && MapHeightEditor.sidebar.rendered) {
    MapHeightEditor.sidebar.currentBrushHeight = height;
    MapHeightEditor.sidebar.render();
  }

  // Update brush display if it's visible
  if (MapHeightEditor.brushDisplay && MapHeightEditor.brushDisplay.isVisible) {
    MapHeightEditor.brushDisplay.updateHeight(height);
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

/**
 * Show brush display
 * 显示画笔显示器
 */
function showBrushDisplay() {
  const shouldShow = game.settings.get(MODULE_ID, "brushDisplayVisible");
  if (shouldShow && MapHeightEditor.brushDisplay) {
    MapHeightEditor.brushDisplay.show();
    MapHeightEditor.brushDisplay.updateHeight(MapHeightEditor.currentBrushHeight);
  }
}

/**
 * Hide brush display
 * 隐藏画笔显示器
 */
function hideBrushDisplay() {
  if (MapHeightEditor.brushDisplay) {
    MapHeightEditor.brushDisplay.hide();
  }
}

/**
 * Enable keyboard shortcuts
 * 启用键盘快捷键
 */
function enableKeyboardShortcuts() {
  if (MapHeightEditor.keyboardHandler) {
    MapHeightEditor.keyboardHandler.enable();
  }
}

/**
 * Disable keyboard shortcuts
 * 禁用键盘快捷键
 */
function disableKeyboardShortcuts() {
  if (MapHeightEditor.keyboardHandler) {
    MapHeightEditor.keyboardHandler.disable();
  }
}

// Export for potential use by other modules
export { MODULE_ID, MODULE_TITLE };