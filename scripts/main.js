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

  // Register custom canvas layer (MUST await to ensure registration completes)
  await registerCanvasLayer();

  console.log(`${MODULE_TITLE} | Module initialized successfully`);
  console.log(`${MODULE_TITLE} | Canvas layer registered:`, CONFIG.Canvas.layers.mapheight);
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
  console.log(`${MODULE_TITLE} | getSceneControlButtons hook fired`);
  console.log(`${MODULE_TITLE} | User is GM:`, game.user.isGM);
  console.log(`${MODULE_TITLE} | CONFIG.Canvas.layers.mapheight:`, CONFIG.Canvas.layers.mapheight);

  if (!game.user.isGM) {
    console.log(`${MODULE_TITLE} | Skipping scene control registration (user is not GM)`);
    return;
  }

  const mapHeightControl = {
    name: "mapheight",
    title: "Map Height Editor",
    icon: "fas fa-mountain",
    layer: "mapheight",
    activeTool: "brush", // Default active tool
    tools: [
      {
        name: "brush",
        title: "Paint Height",
        icon: "fas fa-paint-brush"
      }
    ]
  };

  controls.push(mapHeightControl);
  console.log(`${MODULE_TITLE} | Scene control added:`, mapHeightControl);
  console.log(`${MODULE_TITLE} | Total controls:`, controls.length);
  console.log(`${MODULE_TITLE} | All control names:`, controls.map(c => c.name));
});

/**
 * Hook after scene controls are rendered
 * 场景控件渲染后的钩子
 */
Hooks.on('renderSceneControls', (app, html, data) => {
  console.log(`${MODULE_TITLE} | SceneControls rendered`);
  console.log(`${MODULE_TITLE} | Active control:`, ui.controls.activeControl);
  console.log(`${MODULE_TITLE} | Active tool:`, ui.controls.activeTool);

  // Check if our button exists in the DOM
  const mapheightButton = html.find('[data-control="mapheight"]');
  console.log(`${MODULE_TITLE} | Map Height button in DOM:`, mapheightButton.length > 0);

  if (mapheightButton.length > 0) {
    console.log(`${MODULE_TITLE} | Button HTML:`, mapheightButton[0]);
  } else {
    console.warn(`${MODULE_TITLE} | Map Height button NOT found in DOM!`);
    console.log(`${MODULE_TITLE} | Available control buttons:`, html.find('[data-control]').toArray().map(el => el.dataset.control));
  }
});

/**
 * Register custom canvas layer
 * 注册自定义canvas层
 */
async function registerCanvasLayer() {
  try {
    console.log(`${MODULE_TITLE} | Registering canvas layer...`);

    // Import the custom layer
    const HeightLayer = await import('./ui/height-layer.js');
    MapHeightEditor.HeightLayer = HeightLayer.default;

    console.log(`${MODULE_TITLE} | HeightLayer class loaded:`, HeightLayer.default);

    // Register the layer with FVTT
    CONFIG.Canvas.layers.mapheight = {
      layerClass: HeightLayer.default,
      group: "interface"
    };

    console.log(`${MODULE_TITLE} | Canvas layer registered successfully`);

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

  // Data management settings (buttons)
  game.settings.registerMenu(MODULE_ID, "dataManagement", {
    name: "Data Management",
    label: "Manage Height Data",
    hint: "Import, export, or clear height data for the current scene",
    icon: "fas fa-database",
    type: DataManagementConfig,
    restricted: true
  });
}

/**
 * Data Management Configuration Form
 * 数据管理配置表单
 */
class DataManagementConfig extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "map-height-data-management",
      title: "Map Height Data Management",
      template: "modules/fvtt-map-height/templates/data-management.hbs",
      classes: ["map-height-config"],
      width: 500,
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false
    });
  }

  getData(options = {}) {
    const heightManager = window.MapHeightEditor?.heightManager;
    const stats = heightManager ? {
      totalGrids: heightManager.gridHeights.size,
      exceptions: heightManager.exceptTokens.size
    } : { totalGrids: 0, exceptions: 0 };

    return {
      ...super.getData(options),
      stats
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find('[data-action="export"]').click(() => this._onExport());
    html.find('[data-action="import"]').click(() => this._onImport());
    html.find('[data-action="clear"]').click(() => this._onClear());
  }

  async _onExport() {
    const heightManager = window.MapHeightEditor?.heightManager;
    if (!heightManager) return;

    const data = heightManager.exportData();
    const filename = `map-heights-${canvas.scene.name.slugify()}-${Date.now()}.json`;

    saveDataToFile(JSON.stringify(data, null, 2), "application/json", filename);
    ui.notifications.info("Height data exported successfully");
  }

  async _onImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        const heightManager = window.MapHeightEditor?.heightManager;
        if (!heightManager) return;

        const success = await heightManager.importData(data);
        if (success) {
          ui.notifications.info("Height data imported successfully");
          this.render();
        } else {
          ui.notifications.error("Failed to import height data");
        }
      } catch (error) {
        console.error("Error importing height data:", error);
        ui.notifications.error("Invalid file format");
      }
    };

    input.click();
  }

  async _onClear() {
    const confirmed = await Dialog.confirm({
      title: "Clear All Heights",
      content: "<p>Are you sure you want to clear all grid heights? This action cannot be undone.</p>",
      yes: () => true,
      no: () => false
    });

    if (confirmed) {
      const heightManager = window.MapHeightEditor?.heightManager;
      if (!heightManager) return;

      heightManager.resetData();
      await heightManager.saveHeightData();
      ui.notifications.info("All grid heights cleared");
      this.render();
    }
  }

  async _updateObject(event, formData) {
    // No form data to process
  }
}

/**
 * Load module components dynamically
 * 动态加载模块组件
 */
async function loadModuleComponents() {
  try {
    console.log(`${MODULE_TITLE} | Loading module components...`);

    // Import height manager
    const HeightManager = await import('./height-manager.js');
    MapHeightEditor.HeightManager = HeightManager.default;
    console.log(`${MODULE_TITLE} | HeightManager loaded`);

    // Import token automation
    const TokenAutomation = await import('./token-automation.js');
    MapHeightEditor.TokenAutomation = TokenAutomation.default;
    console.log(`${MODULE_TITLE} | TokenAutomation loaded`);

    // Import UI components
    const HeightOverlay = await import('./ui/height-overlay.js');
    MapHeightEditor.HeightOverlay = HeightOverlay.default;
    console.log(`${MODULE_TITLE} | HeightOverlay loaded`);

    // Import brush display
    const BrushDisplay = await import('./ui/brush-display.js');
    MapHeightEditor.BrushDisplay = BrushDisplay.default;
    console.log(`${MODULE_TITLE} | BrushDisplay loaded`);

    // Import keyboard handler
    const KeyboardHandler = await import('./keyboard-handler.js');
    MapHeightEditor.KeyboardHandler = KeyboardHandler.default;
    console.log(`${MODULE_TITLE} | KeyboardHandler loaded`);

    // Import debug helper (only in debug mode)
    // Check URL parameter for debug mode (safer than checking core.debug setting)
    if (window.location.search.includes("debug")) {
      const DebugHelper = await import('./debug-helper.js');
      MapHeightEditor.DebugHelper = DebugHelper.default;
      console.log(`${MODULE_TITLE} | DebugHelper loaded`);
    }

    // HeightLayer is already imported during init in registerCanvasLayer()

    console.log(`${MODULE_TITLE} | All components loaded successfully`);

  } catch (error) {
    console.error(`${MODULE_TITLE} | Error loading components:`, error);
    throw error; // Re-throw to make the error more visible
  }
}

/**
 * Initialize GM-specific interface elements
 * 初始化GM专用界面元素
 */
function initializeGMInterface() {
  console.log(`${MODULE_TITLE} | Initializing GM interface...`);

  // Check if components are loaded
  if (!MapHeightEditor.HeightManager) {
    console.error(`${MODULE_TITLE} | HeightManager class not loaded!`);
    return;
  }

  // Initialize height manager
  console.log(`${MODULE_TITLE} | Creating HeightManager instance...`);
  MapHeightEditor.heightManager = new MapHeightEditor.HeightManager();
  const initialized = MapHeightEditor.heightManager.initialize();

  if (!initialized) {
    console.error(`${MODULE_TITLE} | Failed to initialize height manager`);
    return;
  }
  console.log(`${MODULE_TITLE} | HeightManager initialized`);

  // Initialize token automation
  console.log(`${MODULE_TITLE} | Creating TokenAutomation instance...`);
  MapHeightEditor.tokenAutomation = new MapHeightEditor.TokenAutomation(MapHeightEditor.heightManager);
  console.log(`${MODULE_TITLE} | TokenAutomation initialized`);

  // Initialize height overlay
  console.log(`${MODULE_TITLE} | Creating HeightOverlay instance...`);
  MapHeightEditor.heightOverlay = new MapHeightEditor.HeightOverlay(MapHeightEditor.heightManager);
  console.log(`${MODULE_TITLE} | HeightOverlay initialized`);

  // Initialize brush display
  console.log(`${MODULE_TITLE} | Creating BrushDisplay instance...`);
  MapHeightEditor.brushDisplay = new MapHeightEditor.BrushDisplay();
  console.log(`${MODULE_TITLE} | BrushDisplay initialized`);

  // Initialize keyboard handler (pass null for sidebar since we removed it)
  console.log(`${MODULE_TITLE} | Creating KeyboardHandler instance...`);
  MapHeightEditor.keyboardHandler = new MapHeightEditor.KeyboardHandler(
    null,
    MapHeightEditor.brushDisplay
  );
  console.log(`${MODULE_TITLE} | KeyboardHandler initialized`);

  // Install debug commands if available
  if (MapHeightEditor.DebugHelper) {
    MapHeightEditor.DebugHelper.installDebugCommands();
    console.log(`${MODULE_TITLE} | DebugHelper commands installed`);
  }

  console.log(`${MODULE_TITLE} | GM interface initialization complete`);
}

// Edit mode is now controlled by canvas layer activation/deactivation
// 编辑模式现在由canvas层的激活/停用控制
// See height-layer.js activate() and deactivate() methods

// Export for potential use by other modules
export { MODULE_ID, MODULE_TITLE };