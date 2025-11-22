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
   * ApplicationV2 default options
   * ApplicationV2默认选项
   */
  static DEFAULT_OPTIONS = {
    id: "map-height-sidebar",
    classes: ["map-height"],
    tag: "section",
    window: {
      title: "MAP_HEIGHT.ModuleTitle",
      icon: "fas fa-mountain",
      minimizable: true,
      resizable: true
    },
    position: {
      width: 320,
      height: "auto",
      left: 120,
      top: 150
    },
    form: {
      handler: MapHeightSidebar.#onFormSubmit,
      submitOnChange: false,
      closeOnSubmit: false
    }
  };

  /**
   * ApplicationV2 template parts
   * ApplicationV2模板部分
   */
  static PARTS = {
    form: {
      template: "modules/fvtt-map-height/templates/sidebar-control.hbs"
    }
  };

  /**
   * ApplicationV2 static form handler
   * ApplicationV2静态表单处理器
   */
  static async #onFormSubmit(event, form, formData) {
    // 处理表单提交（如果需要）
    return;
  }

  /**
   * ApplicationV2 required render method
   * ApplicationV2必需的渲染方法
   */
  async _renderHTML(context, options) {
    const html = await renderTemplate(this.constructor.PARTS.form.template, context);
    return html;
  }

  /**
   * ApplicationV2 required replace method
   * ApplicationV2必需的替换方法
   */
  _replaceHTML(result, content, options) {
    content.innerHTML = result;
  }

  /**
   * Prepare context data for rendering
   * 准备渲染的上下文数据
   */
  async _prepareContext(options = {}) {
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
   * ApplicationV2 event listeners
   * ApplicationV2事件监听器
   */
  _attachFrameListeners() {
    super._attachFrameListeners();
  }

  /**
   * ApplicationV2 part listeners
   * ApplicationV2部分监听器
   */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    
    // Edit mode toggle
    htmlElement.addEventListener('click', this._onClickAction.bind(this));
    
    // Settings changes
    htmlElement.addEventListener('change', this._onFormChange.bind(this));
    htmlElement.addEventListener('input', this._onFormInput.bind(this));
  }

  /**
   * Handle click events with data-action attributes
   * 处理带有data-action属性的点击事件
   */
  _onClickAction(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    switch (action) {
      case 'toggle-edit-mode':
        return this._onToggleEditMode(event);
      case 'select-brush':
        return this._onSelectBrush(event);
      case 'set-custom-height':
        return this._onSetCustomHeight(event);
      case 'clear-all':
        return this._onClearAll(event);
      case 'export-data':
        return this._onExportData(event);
      case 'import-data':
        return this._onImportData(event);
      case 'remove-exception':
        return this._onRemoveException(event);
      case 'add-exception':
        return this._onAddException(event);
    }
  }

  /**
   * Handle form change events
   * 处理表单变化事件
   */
  _onFormChange(event) {
    if (event.target.name === 'autoUpdate') {
      return this._onSettingChange(event);
    }
  }

  /**
   * Handle form input events
   * 处理表单输入事件
   */
  _onFormInput(event) {
    if (event.target.name === 'overlayOpacity') {
      return this._onOpacityChange(event);
    }
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
    const target = event.target.closest('[data-action="select-brush"]');
    const height = parseInt(target.dataset.height);
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
    
    const form = this.element.querySelector('form');
    const customHeightInput = form.querySelector('[name="customHeight"]');
    const customHeight = parseInt(customHeightInput.value);
    
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
    
    const target = event.target.closest('[data-action="remove-exception"]');
    const tokenId = target.dataset.tokenId;
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
    const target = event.target;
    const setting = target.name;
    const value = target.checked;
    
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
    const target = event.target;
    const opacity = parseFloat(target.value);
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