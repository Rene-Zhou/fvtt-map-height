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
  // Register module settings
  registerModuleSettings();

  // Initialize global module object
  MapHeightEditor.MODULE_ID = MODULE_ID;
  MapHeightEditor.isActive = false;
  MapHeightEditor.currentBrushHeight = 0;

  // Register custom canvas layer
  await registerCanvasLayer();
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
    title: game.i18n.localize("MAP_HEIGHT.ModuleTitle"),
    icon: "fas fa-mountain",
    layer: "mapheight",
    activeTool: "brush",
    tools: [
      {
        name: "brush",
        title: game.i18n.localize("MAP_HEIGHT.Controls.PaintHeight"),
        icon: "fas fa-paint-brush"
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
    name: game.i18n.localize("MAP_HEIGHT.Settings.AutoUpdateTokens.Name"),
    hint: game.i18n.localize("MAP_HEIGHT.Settings.AutoUpdateTokens.Hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Height visualization opacity
  game.settings.register(MODULE_ID, "overlayOpacity", {
    name: game.i18n.localize("MAP_HEIGHT.Settings.OverlayOpacity.Name"),
    hint: game.i18n.localize("MAP_HEIGHT.Settings.OverlayOpacity.Hint"),
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
    name: game.i18n.localize("MAP_HEIGHT.Settings.BrushDisplayVisible.Name"),
    hint: game.i18n.localize("MAP_HEIGHT.Settings.BrushDisplayVisible.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  // Keyboard shortcuts enabled
  game.settings.register(MODULE_ID, "keyboardShortcutsEnabled", {
    name: game.i18n.localize("MAP_HEIGHT.Settings.KeyboardShortcuts.Name"),
    hint: game.i18n.localize("MAP_HEIGHT.Settings.KeyboardShortcuts.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  // Data management settings (buttons)
  game.settings.registerMenu(MODULE_ID, "dataManagement", {
    name: game.i18n.localize("MAP_HEIGHT.Settings.DataManagementMenu.Name"),
    label: game.i18n.localize("MAP_HEIGHT.Settings.DataManagementMenu.Label"),
    hint: game.i18n.localize("MAP_HEIGHT.Settings.DataManagementMenu.Hint"),
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
      title: game.i18n.localize("MAP_HEIGHT.DataManagement.Title"),
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
    ui.notifications.info(game.i18n.localize("MAP_HEIGHT.Notifications.DataExported"));
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
          ui.notifications.info(game.i18n.localize("MAP_HEIGHT.Notifications.DataImported"));
          this.render();
        } else {
          ui.notifications.error(game.i18n.localize("MAP_HEIGHT.Notifications.DataImportFailed"));
        }
      } catch (error) {
        console.error("Error importing height data:", error);
        ui.notifications.error(game.i18n.localize("MAP_HEIGHT.Notifications.InvalidFileFormat"));
      }
    };

    input.click();
  }

  async _onClear() {
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("MAP_HEIGHT.Dialog.ClearConfirm.Title"),
      content: `<p>${game.i18n.localize("MAP_HEIGHT.Dialog.ClearConfirm.Content")}</p>`,
      yes: () => true,
      no: () => false
    });

    if (confirmed) {
      const heightManager = window.MapHeightEditor?.heightManager;
      if (!heightManager) return;

      heightManager.resetData();
      await heightManager.saveHeightData();
      ui.notifications.info(game.i18n.localize("MAP_HEIGHT.Notifications.AllHeightsCleared"));
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
    // Import height manager
    const HeightManager = await import('./height-manager.js');
    MapHeightEditor.HeightManager = HeightManager.default;

    // Import token automation
    const TokenAutomation = await import('./token-automation.js');
    MapHeightEditor.TokenAutomation = TokenAutomation.default;

    // Import UI components
    const HeightOverlay = await import('./ui/height-overlay.js');
    MapHeightEditor.HeightOverlay = HeightOverlay.default;

    // Import brush display
    const BrushDisplay = await import('./ui/brush-display.js');
    MapHeightEditor.BrushDisplay = BrushDisplay.default;

    // Import keyboard handler
    const KeyboardHandler = await import('./keyboard-handler.js');
    MapHeightEditor.KeyboardHandler = KeyboardHandler.default;

    // Import debug helper (only in debug mode)
    if (window.location.search.includes("debug")) {
      const DebugHelper = await import('./debug-helper.js');
      MapHeightEditor.DebugHelper = DebugHelper.default;
    }
  } catch (error) {
    console.error(`${MODULE_TITLE} | Error loading components:`, error);
    throw error;
  }
}

/**
 * Initialize GM-specific interface elements
 * 初始化GM专用界面元素
 */
function initializeGMInterface() {
  // Check if components are loaded
  if (!MapHeightEditor.HeightManager) {
    console.error(`${MODULE_TITLE} | HeightManager class not loaded!`);
    return;
  }

  // Initialize height manager
  MapHeightEditor.heightManager = new MapHeightEditor.HeightManager();
  const initialized = MapHeightEditor.heightManager.initialize();

  if (!initialized) {
    console.error(`${MODULE_TITLE} | Failed to initialize height manager`);
    return;
  }

  // Initialize token automation
  MapHeightEditor.tokenAutomation = new MapHeightEditor.TokenAutomation(MapHeightEditor.heightManager);

  // Initialize height overlay
  MapHeightEditor.heightOverlay = new MapHeightEditor.HeightOverlay(MapHeightEditor.heightManager);

  // Initialize brush display
  MapHeightEditor.brushDisplay = new MapHeightEditor.BrushDisplay();

  // Initialize keyboard handler
  MapHeightEditor.keyboardHandler = new MapHeightEditor.KeyboardHandler(
    null,
    MapHeightEditor.brushDisplay
  );

  // Install debug commands if available
  if (MapHeightEditor.DebugHelper) {
    MapHeightEditor.DebugHelper.installDebugCommands();
  }
}

// Edit mode is now controlled by canvas layer activation/deactivation
// 编辑模式现在由canvas层的激活/停用控制
// See height-layer.js activate() and deactivate() methods

// Export for potential use by other modules
export { MODULE_ID, MODULE_TITLE };