/**
 * FVTT Map Height Editor - Sidebar Control
 * ApplicationV2-based sidebar control interface
 */

const MODULE_ID = "fvtt-map-height";

/**
 * MapHeightSidebar class - Application-based sidebar control
 * 地图高度侧边栏类 - 基于Application的侧边栏控件
 */
export default class MapHeightSidebar extends Application {
  
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
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "map-height-sidebar",
      classes: ["map-height-sidebar"],
      title: "Map Height Editor",
      template: "modules/fvtt-map-height/templates/sidebar-control.hbs",
      width: 320,
      height: "auto",
      left: 120,
      top: 150,
      minimizable: true,
      resizable: false,
      submitOnChange: false,
      closeOnSubmit: false
    });
  }

  /**
   * Prepare data for rendering
   * 准备渲染数据
   */
  getData(options) {
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
        { value: 5, label: "Ground", icon: "fas fa-leaf", color: "#81C784" },
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
  activateListeners(html) {
    super.activateListeners(html);
    
    // Convert jQuery to DOM element if needed
    const element = html[0] || html;
    
    // Edit mode toggle
    html.find('[data-action="toggle-edit-mode"]').on('click', 
      this._onToggleEditMode.bind(this));
    
    // Brush height selection
    html.find('[data-action="select-brush"]').on('click', 
      this._onSelectBrush.bind(this));
    
    // Custom height input
    html.find('[data-action="set-custom-height"]').on('click', 
      this._onSetCustomHeight.bind(this));
    
    // Clear all heights
    html.find('[data-action="clear-all"]').on('click', 
      this._onClearAll.bind(this));
    
    // Export/Import
    html.find('[data-action="export-data"]').on('click', 
      this._onExportData.bind(this));
    html.find('[data-action="import-data"]').on('click', 
      this._onImportData.bind(this));
    
    // Exception management
    html.find('[data-action="remove-exception"]').on('click', 
      this._onRemoveException.bind(this));
    
    // Add selected token as exception
    html.find('[data-action="add-exception"]').on('click', 
      this._onAddException.bind(this));
    
    // Settings changes
    html.find('[name="autoUpdate"]').on('change', 
      this._onSettingChange.bind(this));
    html.find('[name="overlayOpacity"]').on('input', 
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
    const $target = $(event.currentTarget);
    const height = parseInt($target.data('height'));
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
    
    const $form = this.element;
    const customHeight = parseInt($form.find('[name="customHeight"]').val());
    
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
    
    const $target = $(event.currentTarget);
    const tokenId = $target.data('token-id');
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
    const $target = $(event.target);
    const setting = $target.attr('name');
    const value = $target.is(':checked');
    
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
    const $target = $(event.target);
    const opacity = parseFloat($target.val());
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