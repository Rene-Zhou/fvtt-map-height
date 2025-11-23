/**
 * FVTT Map Height Editor - Height Overlay
 * Canvas overlay for displaying grid height numbers
 */

const MODULE_ID = "fvtt-map-height";

/**
 * HeightOverlay class - manages the canvas overlay for height display
 * 高度覆盖层类 - 管理用于高度显示的canvas覆盖层
 */
export default class HeightOverlay extends PIXI.Container {
  
  constructor(heightManager) {
    super();
    
    this.heightManager = heightManager;
    this.isVisible = false;
    this.gridElements = new Map(); // Map of grid key -> PIXI element
    this.opacity = 0.8;
    
    // Performance optimization
    this.lastUpdate = 0;
    this.updateThreshold = 100; // Minimum milliseconds between updates
    this.viewportBounds = { left: 0, top: 0, right: 0, bottom: 0 };
    
    // Drag painting state
    this.isDragging = false;
    this.dragStartGrid = null;
    this.lastDragGrid = null;
    this.paintedGrids = new Set(); // Track grids painted in current drag operation
    
    // Grid parameters (will be updated from canvas)
    this.gridSize = 100;
    this.gridOffsetX = 0;
    this.gridOffsetY = 0;
    
    this.initialize();
  }

  /**
   * Initialize the overlay
   * 初始化覆盖层
   */
  initialize() {
    // Set initial properties
    this.name = "map-height-overlay";
    this.sortableChildren = true;
    this.visible = false;
    
    // Update grid parameters from canvas
    this.updateGridParameters();
    
    // Hook into canvas events
    this.setupHooks();
    
  }

  /**
   * Setup event hooks
   * 设置事件钩子
   */
  setupHooks() {
    // Listen for height changes
    Hooks.on(`${MODULE_ID}.gridHeightChanged`, this.onGridHeightChanged.bind(this));
    Hooks.on(`${MODULE_ID}.areaHeightChanged`, this.onAreaHeightChanged.bind(this));
    
    // Listen for canvas pan/zoom
    Hooks.on('canvasPan', this.onCanvasTransform.bind(this));
    Hooks.on('canvasZoom', this.onCanvasTransform.bind(this));
    
    // Listen for scene updates (including padding changes)
    Hooks.on('updateScene', this.onSceneUpdate.bind(this));
    
    // Listen for settings changes
    Hooks.on('updateSetting', this.onSettingUpdate.bind(this));
  }

  /**
   * Update grid parameters from canvas
   * 从canvas更新网格参数
   */
  updateGridParameters() {
    if (!canvas || !canvas.grid || !canvas.scene) return;

    this.gridSize = canvas.grid.size;

    // Calculate padding offset - scene origin in canvas coordinates
    // Grid (0,0) should always point to scene (0,0), regardless of padding
    // Padding adds extra space around the scene, shifting the scene's position in canvas
    // 计算padding偏移量 - scene原点在canvas坐标系中的位置
    // Grid (0,0) 应该始终指向 scene (0,0)，无论padding如何变化
    // Padding在scene周围添加额外空间，使scene在canvas中的位置发生偏移
    const padding = canvas.scene.padding || 0;
    const sceneWidth = canvas.scene.width;
    const sceneHeight = canvas.scene.height;

    // Calculate padding in grid units, then convert to pixels
    // Padding is applied symmetrically on all sides
    const paddingGridsX = Math.ceil((sceneWidth * padding) / this.gridSize);
    const paddingGridsY = Math.ceil((sceneHeight * padding) / this.gridSize);

    // Grid offset = scene's top-left position in canvas coordinates
    // This makes grid (0,0) always correspond to scene (0,0)
    // Padding area will have negative grid coordinates (e.g., -1, -2)
    this.gridOffsetX = paddingGridsX * this.gridSize;
    this.gridOffsetY = paddingGridsY * this.gridSize;

  }

  /**
   * Show the overlay
   * 显示覆盖层
   */
  show() {
    if (this.isVisible) return;
    
    this.isVisible = true;
    this.visible = true;
    
    // Update opacity from settings
    this.opacity = game.settings.get(MODULE_ID, "overlayOpacity");
    this.alpha = this.opacity;
    
    // Add to canvas
    if (!canvas.stage.children.includes(this)) {
      canvas.stage.addChild(this);
    }
    
    // Calculate visible area and render grid numbers
    this.updateViewport();
    this.renderVisibleGrids();
    
  }

  /**
   * Hide the overlay
   * 隐藏覆盖层
   */
  hide() {
    if (!this.isVisible) return;
    
    this.isVisible = false;
    this.visible = false;
    
    // Clear all grid elements
    this.clearAllGrids();
    
  }

  /**
   * Update viewport bounds for performance optimization
   * 更新视口边界以进行性能优化
   */
  updateViewport() {
    if (!canvas || !canvas.stage || !canvas.scene) return;
    
    const stage = canvas.stage;
    const bounds = canvas.app.renderer.screen;
    
    // Calculate viewport in world coordinates
    const transform = stage.transform.worldTransform;
    const scale = transform.a; // Assuming uniform scaling
    
    // Get scene dimensions and padding
    const sceneWidth = canvas.scene.width;
    const sceneHeight = canvas.scene.height;
    const padding = canvas.scene.padding || 0; // padding as decimal (0.25 = 25%)
    
    // Calculate total canvas dimensions including padding
    // Padding is applied symmetrically in grid units, not pixels
    // Formula: totalSize = originalSize + 2 × Math.ceil((originalSize × padding) / gridSize) × gridSize
    const paddingGridsWidthPerSide = Math.ceil((sceneWidth * padding) / this.gridSize);
    const paddingGridsHeightPerSide = Math.ceil((sceneHeight * padding) / this.gridSize);
    const paddingWidthPerSide = paddingGridsWidthPerSide * this.gridSize;
    const paddingHeightPerSide = paddingGridsHeightPerSide * this.gridSize;
    const totalWidth = sceneWidth + 2 * paddingWidthPerSide;
    const totalHeight = sceneHeight + 2 * paddingHeightPerSide;
    
    // Calculate total grid rows and columns to cover the expanded canvas
    const totalCols = Math.ceil(totalWidth / this.gridSize);
    const totalRows = Math.ceil(totalHeight / this.gridSize);

    // Calculate viewport bounds in canvas coordinates, then convert to grid coordinates
    // Grid coordinates are relative to scene origin, so we need to account for gridOffset
    const canvasViewportLeft = -transform.tx / scale - this.gridSize;
    const canvasViewportTop = -transform.ty / scale - this.gridSize;
    const canvasViewportRight = (-transform.tx + bounds.width) / scale + this.gridSize;
    const canvasViewportBottom = (-transform.ty + bounds.height) / scale + this.gridSize;

    // Convert canvas coordinates to grid coordinates (grid relative to scene)
    const viewportLeft = Math.floor((canvasViewportLeft - this.gridOffsetX) / this.gridSize);
    const viewportTop = Math.floor((canvasViewportTop - this.gridOffsetY) / this.gridSize);
    const viewportRight = Math.ceil((canvasViewportRight - this.gridOffsetX) / this.gridSize);
    const viewportBottom = Math.ceil((canvasViewportBottom - this.gridOffsetY) / this.gridSize);

    // Calculate grid bounds including padding area (padding area has negative coordinates)
    const minGridX = -paddingGridsWidthPerSide;
    const minGridY = -paddingGridsHeightPerSide;
    const maxGridX = Math.ceil(sceneWidth / this.gridSize) + paddingGridsWidthPerSide - 1;
    const maxGridY = Math.ceil(sceneHeight / this.gridSize) + paddingGridsHeightPerSide - 1;

    // Constrain to total canvas boundaries (including padding area)
    this.viewportBounds = {
      left: Math.max(minGridX, viewportLeft),
      top: Math.max(minGridY, viewportTop),
      right: Math.min(maxGridX, viewportRight),
      bottom: Math.min(maxGridY, viewportBottom)
    };
    
  }

  /**
   * Render grid numbers for visible area
   * 为可见区域渲染网格数字
   */
  renderVisibleGrids() {
    if (!this.isVisible || !this.heightManager) return;
    
    const now = Date.now();
    if (now - this.lastUpdate < this.updateThreshold) {
      // Schedule update for later
      setTimeout(() => this.renderVisibleGrids(), this.updateThreshold);
      return;
    }
    this.lastUpdate = now;
    
    // Clear existing elements that are outside viewport
    this.cullOffscreenElements();
    
    // Render visible grid squares
    for (let x = this.viewportBounds.left; x <= this.viewportBounds.right; x++) {
      for (let y = this.viewportBounds.top; y <= this.viewportBounds.bottom; y++) {
        this.renderGridNumber(x, y);
      }
    }
  }

  /**
   * Render a single grid number
   * 渲染单个网格数字
   */
  renderGridNumber(gridX, gridY) {
    const key = `${gridX},${gridY}`;
    
    // Check if element already exists
    if (this.gridElements.has(key)) {
      // Update existing element
      this.updateGridElement(key, gridX, gridY);
      return;
    }
    
    // Get height for this grid
    const height = this.heightManager.getGridHeight(gridX, gridY);
    
    // Create new element
    const element = this.createGridElement(gridX, gridY, height);
    if (element) {
      this.addChild(element);
      this.gridElements.set(key, element);
    }
  }

  /**
   * Create a grid element (text + background)
   * 创建网格元素（文本+背景）
   */
  createGridElement(gridX, gridY, height) {
    const container = new PIXI.Container();
    container.name = `grid-${gridX}-${gridY}`;
    container.interactive = true;
    container.buttonMode = true;
    
    // Position the container
    const worldX = gridX * this.gridSize + this.gridOffsetX + this.gridSize / 2;
    const worldY = gridY * this.gridSize + this.gridOffsetY + this.gridSize / 2;
    container.position.set(worldX, worldY);
    
    // Create background
    const background = new PIXI.Graphics();
    this.updateBackgroundStyle(background, height);
    container.addChild(background);
    
    // Create text
    const text = new PIXI.Text(height.toString(), this.getTextStyle(height));
    text.anchor.set(0.5, 0.5);
    container.addChild(text);
    
    // Store references
    container._background = background;
    container._text = text;
    container._gridX = gridX;
    container._gridY = gridY;
    container._height = height;
    
    // Add event listeners
    container.on('pointerdown', this.onGridPointerDown.bind(this, gridX, gridY));
    container.on('pointerup', this.onGridPointerUp.bind(this, gridX, gridY));
    container.on('pointerover', this.onGridHover.bind(this, gridX, gridY));
    container.on('pointerout', this.onGridOut.bind(this, gridX, gridY));
    container.on('pointermove', this.onGridPointerMove.bind(this, gridX, gridY));
    
    return container;
  }

  /**
   * Update an existing grid element
   * 更新现有网格元素
   */
  updateGridElement(key, gridX, gridY) {
    const element = this.gridElements.get(key);
    if (!element) return;
    
    const height = this.heightManager.getGridHeight(gridX, gridY);
    
    // Update only if height changed
    if (element._height !== height) {
      element._height = height;
      element._text.text = height.toString();
      element._text.style = this.getTextStyle(height);
      this.updateBackgroundStyle(element._background, height);
    }
  }

  /**
   * Update background style based on height
   * 根据高度更新背景样式
   */
  updateBackgroundStyle(graphics, height) {
    graphics.clear();
    
    // Choose color based on height
    let color, alpha;
    if (height === 0) {
      color = 0x4FC3F7; // Blue for water level
      alpha = 0.3;
    } else if (height > 0) {
      color = 0x81C784; // Green for positive elevation
      alpha = 0.2 + Math.min(height / 50, 0.3); // Gradually more opaque
    } else {
      color = 0xE57373; // Red for below water level
      alpha = 0.2 + Math.min(Math.abs(height) / 50, 0.3);
    }
    
    // Draw rounded rectangle background
    const size = this.gridSize * 0.8;
    graphics.beginFill(color, alpha);
    graphics.lineStyle(1, color, 0.8);
    graphics.drawRoundedRect(-size / 2, -size / 2, size, size, 4);
    graphics.endFill();
  }

  /**
   * Get text style based on height
   * 根据高度获取文本样式
   */
  getTextStyle(height) {
    const baseSize = Math.max(12, this.gridSize / 8);

    // Use 3x font size multiplier for better visibility
    // 使用3倍字体大小以提高可见性
    const fontSize = baseSize * 3.0;

    return new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: fontSize,
      fontWeight: 'bold',
      fill: 0xFFFFFF,
      stroke: 0x000000,
      strokeThickness: 2,
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowBlur: 2,
      dropShadowAngle: Math.PI / 6,
      dropShadowDistance: 1
    });
  }

  /**
   * Handle grid pointer down events
   * 处理网格指针按下事件
   */
  onGridPointerDown(gridX, gridY, event) {
    if (!this.isVisible || !window.MapHeightEditor) return;
    
    // Only handle left clicks (button 0), ignore right clicks (button 2) 
    if (event.data.button !== 0) return;
    
    event.stopPropagation();
    
    // Start drag operation
    this.isDragging = true;
    this.dragStartGrid = { x: gridX, y: gridY };
    this.lastDragGrid = { x: gridX, y: gridY };
    this.paintedGrids.clear();
    
    // Paint the initial grid
    this.paintGrid(gridX, gridY);
    
    // Add global pointer listeners for drag handling
    canvas.app.stage.interactive = true;
    canvas.app.stage.on('pointerup', this.onGlobalPointerUp.bind(this));
    canvas.app.stage.on('pointermove', this.onGlobalPointerMove.bind(this));
  }

  /**
   * Handle grid pointer up events
   * 处理网格指针抬起事件
   */
  onGridPointerUp(gridX, gridY, event) {
    // Parameters needed for interface compatibility
    this.endDragOperation();
  }

  /**
   * Handle global pointer up (end drag anywhere)
   * 处理全局指针抬起（在任何地方结束拖拽）
   */
  onGlobalPointerUp(event) {
    // Event parameter needed for interface compatibility
    this.endDragOperation();
  }

  /**
   * Handle global pointer move (drag across canvas)
   * 处理全局指针移动（在canvas上拖拽）
   */
  onGlobalPointerMove(event) {
    if (!this.isDragging) return;
    
    // Convert screen coordinates to world coordinates
    const worldPos = event.data.getLocalPosition(canvas.stage);
    
    // Convert world coordinates to grid coordinates
    const gridX = Math.floor((worldPos.x - this.gridOffsetX) / this.gridSize);
    const gridY = Math.floor((worldPos.y - this.gridOffsetY) / this.gridSize);
    
    // Only paint if we've moved to a different grid
    if (!this.lastDragGrid || gridX !== this.lastDragGrid.x || gridY !== this.lastDragGrid.y) {
      this.paintGrid(gridX, gridY);
      this.lastDragGrid = { x: gridX, y: gridY };
    }
  }

  /**
   * Handle grid pointer move events
   * 处理网格指针移动事件
   */
  onGridPointerMove(gridX, gridY, event) {
    if (this.isDragging) {
      // Paint this grid if dragging
      this.paintGrid(gridX, gridY);
      this.lastDragGrid = { x: gridX, y: gridY };
    }
  }

  /**
   * Paint a grid with the current brush height
   * 用当前画笔高度绘制网格
   */
  paintGrid(gridX, gridY) {
    const currentHeight = window.MapHeightEditor.currentBrushHeight || 0;
    const gridKey = `${gridX},${gridY}`;
    
    // Skip if already painted in this drag operation
    if (this.paintedGrids.has(gridKey)) return;
    
    // Mark as painted
    this.paintedGrids.add(gridKey);
    
    // Set grid height
    this.heightManager.setGridHeight(gridX, gridY, currentHeight);
    
    // Visual feedback
    const element = this.gridElements.get(gridKey);
    if (element) {
      this.animateHeightChange(element);
    }
    
  }

  /**
   * End the current drag operation
   * 结束当前拖拽操作
   */
  endDragOperation() {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.dragStartGrid = null;
    this.lastDragGrid = null;
    
    // Remove global listeners
    canvas.app.stage.off('pointerup', this.onGlobalPointerUp.bind(this));
    canvas.app.stage.off('pointermove', this.onGlobalPointerMove.bind(this));

    this.paintedGrids.clear();
  }

  /**
   * Handle grid hover events
   * 处理网格悬停事件
   */
  onGridHover(gridX, gridY, event) {
    // Event parameter needed for interface compatibility
    const element = this.gridElements.get(`${gridX},${gridY}`);
    if (element) {
      element.scale.set(1.1);
      element._background.alpha *= 1.5;
    }
  }

  /**
   * Handle grid out events
   * 处理网格离开事件
   */
  onGridOut(gridX, gridY, event) {
    // Event parameter needed for interface compatibility
    const element = this.gridElements.get(`${gridX},${gridY}`);
    if (element) {
      element.scale.set(1.0);
      element._background.alpha /= 1.5;
    }
  }

  /**
   * Animate height change
   * 动画显示高度变化
   */
  animateHeightChange(element) {
    // Scale animation
    const originalScale = element.scale.x;
    element.scale.set(1.3);
    
    // Tween back to original scale
    const duration = 300;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const scale = 1.3 - (1.3 - originalScale) * easeOut;
      element.scale.set(scale);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * Remove elements that are outside viewport
   * 移除视口外的元素
   */
  cullOffscreenElements() {
    const toRemove = [];
    
    for (const [key, element] of this.gridElements) {
      const coords = key.split(',').map(Number);
      const [x, y] = coords;
      
      if (x < this.viewportBounds.left - 2 || x > this.viewportBounds.right + 2 ||
          y < this.viewportBounds.top - 2 || y > this.viewportBounds.bottom + 2) {
        toRemove.push(key);
      }
    }
    
    toRemove.forEach(key => {
      const element = this.gridElements.get(key);
      if (element) {
        this.removeChild(element);
        element.destroy();
        this.gridElements.delete(key);
      }
    });
  }

  /**
   * Clear all grid elements
   * 清除所有网格元素
   */
  clearAllGrids() {
    for (const element of this.gridElements.values()) {
      this.removeChild(element);
      element.destroy();
    }
    this.gridElements.clear();
  }

  /**
   * Handle grid height changes
   * 处理网格高度变化
   */
  onGridHeightChanged(data) {
    if (!this.isVisible) return;
    
    const { gridX, gridY } = data;
    const key = `${gridX},${gridY}`;
    
    if (this.gridElements.has(key)) {
      this.updateGridElement(key, gridX, gridY);
    }
  }

  /**
   * Handle area height changes
   * 处理区域高度变化
   */
  onAreaHeightChanged(data) {
    if (!this.isVisible) return;
    
    const { gridPositions, height } = data;
    gridPositions.forEach(pos => {
      const key = `${pos.x},${pos.y}`;
      if (this.gridElements.has(key)) {
        this.updateGridElement(key, pos.x, pos.y);
      }
    });
  }

  /**
   * Handle canvas transform events
   * 处理canvas变换事件
   */
  onCanvasTransform() {
    if (!this.isVisible) return;
    
    // Update viewport and re-render
    this.updateViewport();
    this.renderVisibleGrids();
  }

  /**
   * Handle scene updates (including padding changes)
   * 处理场景更新（包括padding变化）
   */
  onSceneUpdate(scene, updateData, options, userId) {
    // Parameters needed for interface compatibility
    // Check if this is the current scene and if padding-related properties changed
    if (scene.id === canvas?.scene?.id && 
        (updateData.hasOwnProperty('padding') || 
         updateData.hasOwnProperty('width') || 
         updateData.hasOwnProperty('height') ||
         updateData.hasOwnProperty('gridSize'))) {
      
      
      // Update grid parameters and refresh overlay
      this.updateGridParameters();
      
      // Also update height-manager grid parameters to keep them in sync
      if (window.MapHeightEditor?.heightManager) {
        window.MapHeightEditor.heightManager.updateGridParameters();
      }
      
      if (this.isVisible) {
        this.refresh();
      }
    }
  }

  /**
   * Handle setting updates
   * 处理设置更新
   */
  onSettingUpdate(setting, value) {
    if (setting.key === `${MODULE_ID}.overlayOpacity`) {
      this.opacity = value;
      this.alpha = value;
    }
  }

  /**
   * Refresh the entire overlay
   * 刷新整个覆盖层
   */
  refresh() {
    if (!this.isVisible) return;
    
    this.clearAllGrids();
    this.updateGridParameters();
    this.updateViewport();
    this.renderVisibleGrids();
  }

  /**
   * Destroy the overlay and cleanup
   * 销毁覆盖层并清理
   */
  destroy() {
    this.hide();
    this.clearAllGrids();
    
    // Remove from canvas if still attached
    if (canvas.stage.children.includes(this)) {
      canvas.stage.removeChild(this);
    }
    
    super.destroy();
    console.log(`${MODULE_ID} | Height overlay destroyed`);
  }
}