/**
 * FVTT Map Height Editor - Brush Display
 * Canvas overlay display showing current brush height
 * 画布画笔显示器 - 显示当前画笔高度的画布覆盖层
 */

const MODULE_ID = "fvtt-map-height";

/**
 * BrushDisplay class - On-canvas display for current brush height
 * 画笔显示类 - 画布上的当前画笔高度显示器
 */
export default class BrushDisplay {

  constructor() {
    this.element = null;
    this.currentHeight = 0;
    this.isVisible = false;
    this.isDragging = false;

    // Position (will be loaded from settings)
    this.position = { x: 20, y: 20 }; // Default top-left with margin

    // Drag state
    this.dragOffset = { x: 0, y: 0 };

    this.initialize();
  }

  /**
   * Initialize the brush display
   * 初始化画笔显示器
   */
  async initialize() {
    // Load saved position from settings
    const savedPosition = game.settings.get(MODULE_ID, "brushDisplayPosition");
    if (savedPosition) {
      this.position = savedPosition;
    }

    // Create the display element
    this.createElement();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Create the HTML element for the brush display
   * 创建画笔显示器的HTML元素
   */
  createElement() {
    // Create container
    this.element = document.createElement('div');
    this.element.className = 'map-height-brush-display';
    this.element.style.left = `${this.position.x}px`;
    this.element.style.top = `${this.position.y}px`;

    // Create inner structure
    this.element.innerHTML = `
      <div class="brush-display-header">
        <i class="fas fa-paint-brush"></i>
        <span class="brush-display-title">${game.i18n.localize("MAP_HEIGHT.BrushDisplay.Title")}</span>
        <button class="brush-display-close" title="${game.i18n.localize("MAP_HEIGHT.BrushDisplay.CloseEditMode")}">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="brush-display-body">
        <div class="brush-height-value" data-height="0">0</div>
        <div class="brush-height-bar"></div>
      </div>
      <div class="brush-display-controls">
        <button class="brush-quick-btn positive" data-action="increment" title="${game.i18n.localize("MAP_HEIGHT.BrushDisplay.Increment")}">
          <i class="fas fa-plus"></i>
        </button>
        <button class="brush-quick-btn zero" data-action="zero" title="${game.i18n.localize("MAP_HEIGHT.BrushDisplay.Zero")}">
          0
        </button>
        <button class="brush-quick-btn negative" data-action="decrement" title="${game.i18n.localize("MAP_HEIGHT.BrushDisplay.Decrement")}">
          <i class="fas fa-minus"></i>
        </button>
      </div>
    `;

    // Initially hidden
    this.element.style.display = 'none';
  }

  /**
   * Setup event listeners
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.element) return;

    const header = this.element.querySelector('.brush-display-header');
    const closeBtn = this.element.querySelector('.brush-display-close');

    // Dragging functionality
    header.addEventListener('mousedown', this.onDragStart.bind(this));
    document.addEventListener('mousemove', this.onDrag.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));

    // Close button - now exits edit mode instead of just hiding display
    closeBtn.addEventListener('click', this.onCloseEditMode.bind(this));

    // Quick action buttons
    this.element.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = e.currentTarget.dataset.action;
        this.onQuickAction(action);
      });
    });

    // Prevent drag from triggering other canvas events
    this.element.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    this.element.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Start dragging
   * 开始拖动
   */
  onDragStart(event) {
    // Only left mouse button
    if (event.button !== 0) return;

    // Don't start drag if clicking close button
    if (event.target.closest('.brush-display-close')) return;

    this.isDragging = true;
    this.element.classList.add('dragging');

    // Calculate offset from element position to mouse
    const rect = this.element.getBoundingClientRect();
    this.dragOffset.x = event.clientX - rect.left;
    this.dragOffset.y = event.clientY - rect.top;

    event.preventDefault();
  }

  /**
   * Handle dragging
   * 处理拖动
   */
  onDrag(event) {
    if (!this.isDragging) return;

    // Calculate new position
    const newX = event.clientX - this.dragOffset.x;
    const newY = event.clientY - this.dragOffset.y;

    // Constrain to viewport
    const maxX = window.innerWidth - this.element.offsetWidth;
    const maxY = window.innerHeight - this.element.offsetHeight;

    this.position.x = Math.max(0, Math.min(newX, maxX));
    this.position.y = Math.max(0, Math.min(newY, maxY));

    // Update position
    this.element.style.left = `${this.position.x}px`;
    this.element.style.top = `${this.position.y}px`;

    event.preventDefault();
  }

  /**
   * End dragging
   * 结束拖动
   */
  async onDragEnd(event) {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.element.classList.remove('dragging');

    // Save position to settings
    await game.settings.set(MODULE_ID, "brushDisplayPosition", this.position);
  }

  /**
   * Handle close button - exits edit mode by switching to tokens layer
   * 处理关闭按钮 - 通过切换到tokens层退出编辑模式
   */
  onCloseEditMode(event) {
    event.stopPropagation();

    // Switch to tokens layer, which will automatically deactivate mapheight layer
    // 切换到tokens层，这会自动停用mapheight层
    if (window.MapHeightEditor?.isActive && ui.controls) {
      // Switch to the default tokens control
      // This triggers the mapheight layer's deactivate() method
      ui.controls.initialize({ tool: "select", layer: "tokens" });
    }
  }

  /**
   * Handle quick action buttons (+, 0, -)
   * 处理快捷操作按钮 (+, 0, -)
   */
  onQuickAction(action) {
    let newHeight = this.currentHeight;

    switch (action) {
      case 'increment':
        newHeight = this.currentHeight + 1;
        break;
      case 'decrement':
        newHeight = this.currentHeight - 1;
        break;
      case 'zero':
        newHeight = 0;
        break;
    }

    // Validate height
    if (newHeight < -1000 || newHeight > 1000) {
      ui.notifications.warn(game.i18n.localize("MAP_HEIGHT.Notifications.InvalidHeight"));
      return;
    }

    // Update global state
    window.MapHeightEditor.currentBrushHeight = newHeight;

    // Update display
    this.updateHeight(newHeight);

    // Update scene controls
    ui.controls.render();
  }

  /**
   * Update the displayed height
   * 更新显示的高度
   */
  updateHeight(height) {
    this.currentHeight = height;

    if (!this.element) return;

    const valueElement = this.element.querySelector('.brush-height-value');
    const barElement = this.element.querySelector('.brush-height-bar');

    // Update value
    valueElement.textContent = height;
    valueElement.dataset.height = height;

    // Update color based on height
    valueElement.className = 'brush-height-value';
    barElement.className = 'brush-height-bar';

    if (height === 0) {
      valueElement.classList.add('height-zero');
      barElement.classList.add('height-zero');
    } else if (height > 0) {
      valueElement.classList.add('height-positive');
      barElement.classList.add('height-positive');
    } else {
      valueElement.classList.add('height-negative');
      barElement.classList.add('height-negative');
    }

    // Pulse animation on change
    valueElement.classList.add('updating');
    setTimeout(() => {
      valueElement.classList.remove('updating');
    }, 400);
  }

  /**
   * Show the brush display
   * 显示画笔显示器
   */
  show() {
    if (!this.element) {
      this.createElement();
      this.setupEventListeners();
    }

    // Append to body if not already
    if (!this.element.parentElement) {
      document.body.appendChild(this.element);
    }

    this.element.style.display = 'block';
    this.isVisible = true;

    // Update to current height
    this.updateHeight(this.currentHeight);
  }

  /**
   * Hide the brush display
   * 隐藏画笔显示器
   */
  hide() {
    if (!this.element) return;

    this.element.style.display = 'none';
    this.isVisible = false;
  }

  /**
   * Reset position to default
   * 重置位置到默认值
   */
  async resetPosition() {
    this.position = { x: 20, y: 20 };

    if (this.element) {
      this.element.style.left = `${this.position.x}px`;
      this.element.style.top = `${this.position.y}px`;
    }

    await game.settings.set(MODULE_ID, "brushDisplayPosition", this.position);
  }

  /**
   * Destroy the brush display
   * 销毁画笔显示器
   */
  destroy() {
    if (this.element && this.element.parentElement) {
      this.element.remove();
    }
    this.element = null;
    this.isVisible = false;
  }
}
