/**
 * FVTT Map Height Editor - Sidebar Control
 * ApplicationV2-based sidebar control interface
 */

const MODULE_ID = "fvtt-map-height";

/**
 * MapHeightSidebar class - ApplicationV2-based sidebar control
 * 地图高度侧边栏类 - 基于ApplicationV2的侧边栏控件
 */
export default class MapHeightSidebar extends foundry.applications.api.ApplicationV2 {
  
  constructor(heightManager, options = {}) {
    super(options);
    this.heightManager = heightManager;
    this.isEditMode = false;
    this.currentBrushHeight = 0;
    this.customHeight = 0;
  }

  /**
   * Default application options
   * 默认应用程序选项
   */
  static DEFAULT_OPTIONS = {
    id: "map-height-sidebar",
    classes: ["map-height-sidebar"],
    tag: "form",
    window: {
      title: "MAP_HEIGHT.ModuleTitle",
      icon: "fas fa-mountain",
      minimizable: true,
      resizable: false
    },
    position: {
      width: 300,
      height: "auto",
      left: 120,
      top: 150
    },
    form: {
      handler: MapHeightSidebar.formHandler,
      submitOnChange: false,
      closeOnSubmit: false
    }
  };

  /**
   * HTML template for the sidebar
   * 侧边栏的HTML模板
   */
  static PARTS = {
    form: {
      template: "modules/fvtt-map-height/templates/sidebar-control.hbs"
    }
  };

  /**
   * Prepare data for rendering
   * 准备渲染数据
   */
  async _prepareContext(options) {
    const context = {
      isGM: game.user.isGM,
      isEditMode: this.isEditMode,
      currentBrushHeight: this.currentBrushHeight,
      customHeight: this.customHeight,
      autoUpdate: game.settings.get(MODULE_ID, "autoUpdateTokens"),
      overlayOpacity: game.settings.get(MODULE_ID, "overlayOpacity"),
      heightEnabled: this.heightManager?.enabled || false,
      
      // Predefined brush heights
      brushHeights: [
        { value: 0, label: "Water", icon: "fas fa-water", color: "#4FC3F7" },
        { value: 5, label: "Ground", icon: "fas fa-seedling", color: "#81C784" },
        { value: 10, label: "Hill", icon: "fas fa-mountain", color: "#FFB74D" },
        { value: 15, label: "High", icon: "fas fa-mountain", color: "#F06292" },
        { value: 20, label: "Peak", icon: "fas fa-mountain", color: "#9575CD" }
      ],
      
      // Statistics
      stats: this.heightManager ? this.heightManager.getStatistics() : null,
      
      // Exception tokens
      exceptionTokens: this.getExceptionTokenList()
    };

    return context;
  }

  /**
   * Get list of exception tokens with details
   * 获取例外Token的详细列表
   */
  getExceptionTokenList() {
    if (!this.heightManager || !canvas.tokens) return [];
    
    const exceptions = [];
    
    for (const tokenId of this.heightManager.exceptTokens) {
      const token = canvas.tokens.get(tokenId);
      if (token) {
        exceptions.push({
          id: tokenId,
          name: token.document.name,
          img: token.document.texture.src,
          actor: token.actor?.name || "Unknown"
        });
      }
    }
    
    return exceptions;
  }

  /**
   * Event listeners for the sidebar
   * 侧边栏的事件监听器
   */
  _attachFrameListeners() {
    super._attachFrameListeners();
    
    const html = this.element;
    
    // Edit mode toggle
    html.querySelector('[data-action="toggle-edit-mode"]')?.addEventListener('click', 
      this._onToggleEditMode.bind(this));
    
    // Brush height selection
    html.querySelectorAll('[data-action="select-brush"]').forEach(btn => {
      btn.addEventListener('click', this._onSelectBrush.bind(this));
    });
    
    // Custom height input
    html.querySelector('[data-action="set-custom-height"]')?.addEventListener('click', 
      this._onSetCustomHeight.bind(this));
    
    // Clear all heights
    html.querySelector('[data-action="clear-all"]')?.addEventListener('click', 
      this._onClearAll.bind(this));
    
    // Export/Import
    html.querySelector('[data-action="export-data"]')?.addEventListener('click', 
      this._onExportData.bind(this));
    html.querySelector('[data-action="import-data"]')?.addEventListener('click', 
      this._onImportData.bind(this));
    
    // Exception management
    html.querySelectorAll('[data-action="remove-exception"]').forEach(btn => {
      btn.addEventListener('click', this._onRemoveException.bind(this));
    });
    
    // Add selected token as exception
    html.querySelector('[data-action="add-exception"]')?.addEventListener('click', 
      this._onAddException.bind(this));
    
    // Settings changes
    html.querySelector('[name="autoUpdate"]')?.addEventListener('change', 
      this._onSettingChange.bind(this));
    html.querySelector('[name="overlayOpacity"]')?.addEventListener('input', 
      this._onOpacityChange.bind(this));
  }

  /**
   * Toggle edit mode
   * 切换编辑模式
   */
  _onToggleEditMode(event) {
    event.preventDefault();
    this.isEditMode = !this.isEditMode;
    
    // Update global state
    window.MapHeightEditor.isActive = this.isEditMode;
    
    if (this.isEditMode) {
      ui.notifications.info(game.i18n.localize("MAP_HEIGHT.Notifications.HeightModeActivated"));
      this._showHeightOverlay();
    } else {
      ui.notifications.info(game.i18n.localize("MAP_HEIGHT.Notifications.HeightModeDeactivated"));
      this._hideHeightOverlay();
    }
    
    // Refresh scene controls and sidebar
    ui.controls.render();
    this.render();
  }

  /**
   * Select brush height
   * 选择画笔高度
   */
  _onSelectBrush(event) {
    event.preventDefault();
    const height = parseInt(event.currentTarget.dataset.height);
    this.currentBrushHeight = height;
    window.MapHeightEditor.currentBrushHeight = height;
    
    // Update settings
    game.settings.set(MODULE_ID, "defaultBrushHeight", height);
    
    // Refresh UI
    this.render();
    ui.controls.render();
  }

  /**
   * Set custom height
   * 设置自定义高度
   */
  async _onSetCustomHeight(event) {
    event.preventDefault();
    
    const customHeight = parseInt(this.element.querySelector('[name="customHeight"]').value);
    
    if (isNaN(customHeight) || !this.heightManager.validateHeight(customHeight)) {
      ui.notifications.warn("Invalid height value. Must be between -1000 and 1000.");
      return;
    }
    
    this.currentBrushHeight = customHeight;
    window.MapHeightEditor.currentBrushHeight = customHeight;
    
    // Update settings
    game.settings.set(MODULE_ID, "defaultBrushHeight", customHeight);
    
    this.render();
  }

  /**
   * Clear all heights
   * 清除所有高度
   */
  async _onClearAll(event) {
    event.preventDefault();
    
    const confirmed = await Dialog.confirm({
      title: "Clear All Heights",
      content: "<p>Are you sure you want to clear all grid heights? This action cannot be undone.</p>",
      yes: () => true,
      no: () => false
    });
    
    if (confirmed) {
      this.heightManager.resetData();
      await this.heightManager.saveHeightData();
      ui.notifications.info("All grid heights cleared");
      this.render();
    }
  }

  /**
   * Export height data
   * 导出高度数据
   */
  _onExportData(event) {
    event.preventDefault();
    
    const data = this.heightManager.exportData();
    const filename = `map-heights-${this.heightManager.scene.name.slugify()}-${Date.now()}.json`;
    
    saveDataToFile(JSON.stringify(data, null, 2), "application/json", filename);
    ui.notifications.info("Height data exported successfully");
  }

  /**
   * Import height data
   * 导入高度数据
   */
  async _onImportData(event) {
    event.preventDefault();
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const success = await this.heightManager.importData(data);
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

  /**
   * Add selected token as exception
   * 将选中的Token添加为例外
   */
  async _onAddException(event) {
    event.preventDefault();
    
    const controlled = canvas.tokens.controlled;
    if (controlled.length === 0) {
      ui.notifications.warn(game.i18n.localize("MAP_HEIGHT.Dialog.ExceptionManagement.NoTokenSelected"));
      return;
    }
    
    for (const token of controlled) {
      await this.heightManager.addTokenException(token.document.id);
      ui.notifications.info(`${token.document.name} added to flying units exception list`);
    }
    
    this.render();
  }

  /**
   * Remove token from exceptions
   * 从例外列表中移除Token
   */
  async _onRemoveException(event) {
    event.preventDefault();
    
    const tokenId = event.currentTarget.dataset.tokenId;
    const success = await this.heightManager.removeTokenException(tokenId);
    
    if (success) {
      ui.notifications.info("Token removed from exception list");
      this.render();
    }
  }

  /**
   * Handle setting changes
   * 处理设置变化
   */
  async _onSettingChange(event) {
    const setting = event.target.name;
    const value = event.target.checked;
    
    await game.settings.set(MODULE_ID, setting, value);
    
    if (setting === "autoUpdateTokens" && window.MapHeightEditor.tokenAutomation) {
      window.MapHeightEditor.tokenAutomation.setEnabled(value);
    }
  }

  /**
   * Handle opacity slider changes
   * 处理透明度滑块变化
   */
  async _onOpacityChange(event) {
    const opacity = parseFloat(event.target.value);
    await game.settings.set(MODULE_ID, "overlayOpacity", opacity);
    
    // Update overlay if visible
    if (this.isEditMode) {
      this._updateOverlayOpacity(opacity);
    }
  }

  /**
   * Show height overlay
   * 显示高度覆盖层
   */
  _showHeightOverlay() {
    if (window.MapHeightEditor?.heightOverlay) {
      window.MapHeightEditor.heightOverlay.show();
    }
  }

  /**
   * Hide height overlay
   * 隐藏高度覆盖层
   */
  _hideHeightOverlay() {
    if (window.MapHeightEditor?.heightOverlay) {
      window.MapHeightEditor.heightOverlay.hide();
    }
  }

  /**
   * Update overlay opacity
   * 更新覆盖层透明度
   */
  _updateOverlayOpacity(opacity) {
    if (window.MapHeightEditor?.heightOverlay) {
      window.MapHeightEditor.heightOverlay.opacity = opacity;
      window.MapHeightEditor.heightOverlay.alpha = opacity;
    }
  }

  /**
   * Form submission handler
   * 表单提交处理器
   */
  static async formHandler(event, form, formData) {
    // Handle form submission if needed
    console.log("Form submitted:", formData);
  }

  /**
   * Refresh sidebar data
   * 刷新侧边栏数据
   */
  refresh() {
    this.render();
  }

  /**
   * Close and cleanup
   * 关闭和清理
   */
  async close(options = {}) {
    // Hide overlay if active
    if (this.isEditMode) {
      this.isEditMode = false;
      window.MapHeightEditor.isActive = false;
      this._hideHeightOverlay();
      ui.controls.render();
    }
    
    return super.close(options);
  }
}