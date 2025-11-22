/**
 * FVTT Map Height Editor - Keyboard Handler
 * Handles keyboard shortcuts for brush height adjustment
 * 键盘处理器 - 处理画笔高度调整的键盘快捷键
 */

const MODULE_ID = "fvtt-map-height";

/**
 * KeyboardHandler class - Manages keyboard shortcuts for height brush
 * 键盘处理类 - 管理高度画笔的键盘快捷键
 */
export default class KeyboardHandler {

  constructor(sidebar, brushDisplay) {
    this.sidebar = sidebar; // May be null (sidebar has been removed)
    this.brushDisplay = brushDisplay;
    this.isEnabled = false;

    // Keyboard shortcuts configuration
    // 键盘快捷键配置
    this.shortcuts = {
      'ArrowUp': { adjustment: 10, description: 'Increase height by 10' },
      'ArrowDown': { adjustment: -10, description: 'Decrease height by 10' },
      'ArrowLeft': { adjustment: -5, description: 'Decrease height by 5' },
      'ArrowRight': { adjustment: 5, description: 'Increase height by 5' },
      '+': { adjustment: 1, description: 'Increase height by 1' },
      '=': { adjustment: 1, description: 'Increase height by 1' }, // For US keyboards (Shift+=)
      '-': { adjustment: -1, description: 'Decrease height by 1' },
      '_': { adjustment: -1, description: 'Decrease height by 1' }, // For Shift+-
      'Digit0': { setValue: 0, description: 'Set height to 0', requiresNumpad: false },
      'Numpad0': { setValue: 0, description: 'Set height to 0' }
    };

    // Initialize
    this.initialize();
  }

  /**
   * Initialize keyboard handler
   * 初始化键盘处理器
   */
  initialize() {
    // Bind keyboard event handler
    this.keydownHandler = this.onKeyDown.bind(this);

    // Setup hooks
    this.setupHooks();
  }

  /**
   * Setup event hooks
   * 设置事件钩子
   */
  setupHooks() {
    // Listen for edit mode changes
    Hooks.on(`${MODULE_ID}.editModeChanged`, (isActive) => {
      if (isActive) {
        this.enable();
      } else {
        this.disable();
      }
    });
  }

  /**
   * Enable keyboard shortcuts
   * 启用键盘快捷键
   */
  enable() {
    if (this.isEnabled) return;

    // Check if keyboard shortcuts are enabled in settings
    const settingEnabled = game.settings.get(MODULE_ID, "keyboardShortcutsEnabled");
    if (!settingEnabled) return;

    document.addEventListener('keydown', this.keydownHandler);
    this.isEnabled = true;

    console.log("[Map Height] Keyboard shortcuts enabled");
  }

  /**
   * Disable keyboard shortcuts
   * 禁用键盘快捷键
   */
  disable() {
    if (!this.isEnabled) return;

    document.removeEventListener('keydown', this.keydownHandler);
    this.isEnabled = false;

    console.log("[Map Height] Keyboard shortcuts disabled");
  }

  /**
   * Handle keydown events
   * 处理按键事件
   */
  onKeyDown(event) {
    // Don't interfere with input fields
    // 不干扰输入框
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable) {
      return;
    }

    // Check if this is a registered shortcut
    // 检查是否为已注册的快捷键
    // Try event.code first, then event.key for compatibility
    let shortcut = this.shortcuts[event.code];

    // If not found by code, try by key (for +, -, = etc.)
    if (!shortcut) {
      shortcut = this.shortcuts[event.key];
    }

    if (!shortcut) return;

    // Prevent default behavior for our shortcuts
    event.preventDefault();
    event.stopPropagation();

    // Get current height
    let currentHeight = window.MapHeightEditor?.currentBrushHeight || 0;
    let newHeight;

    // Calculate new height
    if (shortcut.setValue !== undefined) {
      // Direct value set
      newHeight = shortcut.setValue;
    } else if (shortcut.adjustment !== undefined) {
      // Adjustment
      newHeight = currentHeight + shortcut.adjustment;
    } else {
      return;
    }

    // Validate height
    const heightManager = window.MapHeightEditor?.heightManager;
    if (!heightManager || !heightManager.validateHeight(newHeight)) {
      ui.notifications.warn(game.i18n.localize("MAP_HEIGHT.Notifications.InvalidHeight"));
      return;
    }

    // Update height
    this.updateBrushHeight(newHeight, shortcut.adjustment || 0);
  }

  /**
   * Update brush height and UI
   * 更新画笔高度和UI
   */
  updateBrushHeight(newHeight, adjustment = 0) {
    // Update global state
    window.MapHeightEditor.currentBrushHeight = newHeight;

    // Update brush display
    if (this.brushDisplay && this.brushDisplay.isVisible) {
      this.brushDisplay.updateHeight(newHeight);
    }

    // Update scene controls to reflect active brush
    ui.controls.render();

    // Show visual feedback with the adjustment amount
    // 显示调整量的视觉反馈
    if (adjustment !== 0) {
      this.showAdjustmentFeedback(adjustment);
    }
  }

  /**
   * Show visual feedback for height adjustment
   * 显示高度调整的视觉反馈
   */
  showAdjustmentFeedback(adjustment) {
    // Create floating text near brush display
    // 在画笔显示器附近创建浮动文本
    const feedback = document.createElement('div');
    feedback.className = 'brush-adjustment-feedback';
    feedback.textContent = adjustment > 0 ? `+${adjustment}` : `${adjustment}`;

    if (adjustment > 0) {
      feedback.classList.add('positive');
    } else {
      feedback.classList.add('negative');
    }

    // Position near brush display if visible, otherwise center
    if (this.brushDisplay && this.brushDisplay.isVisible && this.brushDisplay.element) {
      const displayRect = this.brushDisplay.element.getBoundingClientRect();
      feedback.style.left = `${displayRect.right + 10}px`;
      feedback.style.top = `${displayRect.top + displayRect.height / 2}px`;
    } else {
      // Center of screen
      feedback.style.left = '50%';
      feedback.style.top = '50%';
      feedback.style.transform = 'translate(-50%, -50%)';
    }

    document.body.appendChild(feedback);

    // Animate and remove
    setTimeout(() => {
      feedback.classList.add('fade-out');
      setTimeout(() => {
        feedback.remove();
      }, 300);
    }, 800);
  }

  /**
   * Show keyboard shortcuts help
   * 显示键盘快捷键帮助
   */
  showHelp() {
    const helpContent = `
      <div class="keyboard-shortcuts-help">
        <h3><i class="fas fa-keyboard"></i> ${game.i18n.localize("MAP_HEIGHT.KeyboardShortcuts.Title")}</h3>
        <table>
          <thead>
            <tr>
              <th>${game.i18n.localize("MAP_HEIGHT.KeyboardShortcuts.Key")}</th>
              <th>${game.i18n.localize("MAP_HEIGHT.KeyboardShortcuts.Action")}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><kbd>↑</kbd></td><td>${game.i18n.localize("MAP_HEIGHT.KeyboardShortcuts.ArrowUp")}</td></tr>
            <tr><td><kbd>↓</kbd></td><td>${game.i18n.localize("MAP_HEIGHT.KeyboardShortcuts.ArrowDown")}</td></tr>
            <tr><td><kbd>←</kbd></td><td>${game.i18n.localize("MAP_HEIGHT.KeyboardShortcuts.ArrowLeft")}</td></tr>
            <tr><td><kbd>→</kbd></td><td>${game.i18n.localize("MAP_HEIGHT.KeyboardShortcuts.ArrowRight")}</td></tr>
            <tr><td><kbd>+</kbd></td><td>${game.i18n.localize("MAP_HEIGHT.KeyboardShortcuts.Plus")}</td></tr>
            <tr><td><kbd>-</kbd></td><td>${game.i18n.localize("MAP_HEIGHT.KeyboardShortcuts.Minus")}</td></tr>
            <tr><td><kbd>0</kbd></td><td>${game.i18n.localize("MAP_HEIGHT.KeyboardShortcuts.Zero")}</td></tr>
          </tbody>
        </table>
        <p class="hint">${game.i18n.localize("MAP_HEIGHT.KeyboardShortcuts.Hint")}</p>
      </div>
    `;

    new Dialog({
      title: game.i18n.localize("MAP_HEIGHT.KeyboardShortcuts.Title"),
      content: helpContent,
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("Close")
        }
      },
      default: "close"
    }).render(true);
  }

  /**
   * Destroy the keyboard handler
   * 销毁键盘处理器
   */
  destroy() {
    this.disable();
  }
}
