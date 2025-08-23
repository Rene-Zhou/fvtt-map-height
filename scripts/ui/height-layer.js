/**
 * FVTT Map Height Editor - Custom Canvas Layer
 * Custom canvas layer for height editing functionality
 */

const MODULE_ID = "fvtt-map-height";

/**
 * MapHeightLayer class - custom canvas layer for height editing
 * 地图高度层类 - 用于高度编辑的自定义canvas层
 */
export default class MapHeightLayer extends InteractionLayer {
  
  constructor() {
    super();
    
    this.isHeightEditMode = false;
  }

  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: "mapheight",
      zIndex: 220 // Between drawings and notes
    });
  }

  /**
   * Actions to take when the layer is activated
   * 层被激活时执行的操作
   */
  activate() {
    super.activate();
    console.log(`${MODULE_ID} | Map height layer activated`);
    
    // Show height overlay if height edit mode is active
    if (window.MapHeightEditor?.isActive && window.MapHeightEditor?.heightOverlay) {
      window.MapHeightEditor.heightOverlay.show();
    }
    
    return this;
  }

  /**
   * Actions to take when the layer is deactivated
   * 层被停用时执行的操作
   */
  deactivate() {
    super.deactivate();
    console.log(`${MODULE_ID} | Map height layer deactivated`);
    
    // Hide height overlay
    if (window.MapHeightEditor?.heightOverlay) {
      window.MapHeightEditor.heightOverlay.hide();
    }
    
    return this;
  }

  /**
   * Handle left-click events on the canvas
   * 处理canvas上的左键点击事件
   */
  _onClickLeft(event) {
    if (!this.isHeightEditMode || !window.MapHeightEditor?.heightManager) {
      return;
    }

    // Convert screen coordinates to world coordinates
    const worldPos = event.data.getLocalPosition(canvas.stage);
    
    // Get height overlay for grid calculations
    const heightOverlay = window.MapHeightEditor.heightOverlay;
    if (!heightOverlay) return;
    
    // Convert world coordinates to grid coordinates
    const gridX = Math.floor((worldPos.x - heightOverlay.gridOffsetX) / heightOverlay.gridSize);
    const gridY = Math.floor((worldPos.y - heightOverlay.gridOffsetY) / heightOverlay.gridSize);
    
    // Set grid height using current brush height
    const brushHeight = window.MapHeightEditor.currentBrushHeight || 0;
    window.MapHeightEditor.heightManager.setGridHeight(gridX, gridY, brushHeight);
    
    console.log(`${MODULE_ID} | Set grid (${gridX}, ${gridY}) height to ${brushHeight}`);
  }

  /**
   * Handle right-click events on the canvas
   * 处理canvas上的右键点击事件
   */
  _onClickRight(event) {
    // Don't interfere with right-click canvas dragging
    // Right-click should always allow default behavior for canvas panning
    return true;
  }

  /**
   * Enable height edit mode for this layer
   * 为此层启用高度编辑模式
   */
  enableHeightEditMode() {
    this.isHeightEditMode = true;
    console.log(`${MODULE_ID} | Height edit mode enabled on layer`);
  }

  /**
   * Disable height edit mode for this layer  
   * 为此层禁用高度编辑模式
   */
  disableHeightEditMode() {
    this.isHeightEditMode = false;
    console.log(`${MODULE_ID} | Height edit mode disabled on layer`);
  }
}