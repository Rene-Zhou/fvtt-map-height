/**
 * FVTT Map Height Editor - Token Automation
 * Handles automatic token height updates based on grid positions
 */

const MODULE_ID = "fvtt-map-height";

/**
 * TokenAutomation class - manages automatic token elevation updates
 * Token自动化类 - 管理自动Token高度更新
 */
export default class TokenAutomation {
  constructor(heightManager) {
    this.heightManager = heightManager;
    this.isEnabled = true;
    this.updateQueue = new Set();
    this.processingQueue = false;
    
    // Throttling for performance
    this.lastUpdate = 0;
    this.updateThreshold = 100; // Minimum milliseconds between updates
    
    this.initialize();
  }

  /**
   * Initialize token automation hooks
   * 初始化Token自动化钩子
   */
  initialize() {
    // Hook for token movement
    Hooks.on('updateToken', this.onTokenUpdate.bind(this));
    
    // Hook for token creation
    Hooks.on('createToken', this.onTokenCreate.bind(this));
    
    // Hook for scene change
    Hooks.on('canvasReady', this.onCanvasReady.bind(this));
    
    // Module-specific hooks
    Hooks.on(`${MODULE_ID}.gridHeightChanged`, this.onGridHeightChanged.bind(this));
    Hooks.on(`${MODULE_ID}.areaHeightChanged`, this.onAreaHeightChanged.bind(this));
    
    console.log(`${MODULE_ID} | Token automation initialized`);
  }

  /**
   * Handle token updates (movement, etc.)
   * 处理Token更新（移动等）
   */
  async onTokenUpdate(tokenDocument, changes, options, userId) {
    // Only process if auto-update is enabled
    if (!this.isEnabled || !game.settings.get(MODULE_ID, "autoUpdateTokens")) {
      return;
    }

    // Only process position changes
    if (!('x' in changes || 'y' in changes)) {
      return;
    }

    // Only process for GMs or if user controls the token
    if (!game.user.isGM && !tokenDocument.isOwner) {
      return;
    }

    // Don't process if token is in exception list
    if (this.heightManager.isExceptionToken(tokenDocument.id)) {
      return;
    }

    // Add to update queue with throttling
    this.queueTokenUpdate(tokenDocument);
  }

  /**
   * Handle token creation
   * 处理Token创建
   */
  async onTokenCreate(tokenDocument, options, userId) {
    if (!this.isEnabled || !game.settings.get(MODULE_ID, "autoUpdateTokens")) {
      return;
    }

    if (!game.user.isGM && !tokenDocument.isOwner) {
      return;
    }

    if (this.heightManager.isExceptionToken(tokenDocument.id)) {
      return;
    }

    // Update newly created token's height
    this.queueTokenUpdate(tokenDocument);
  }

  /**
   * Handle canvas ready event
   * 处理Canvas准备事件
   */
  onCanvasReady() {
    // Re-evaluate all tokens on scene change
    if (this.isEnabled && game.user.isGM) {
      this.updateAllTokens();
    }
  }

  /**
   * Handle grid height changes
   * 处理网格高度变化
   */
  onGridHeightChanged(data) {
    if (!this.isEnabled || !game.settings.get(MODULE_ID, "autoUpdateTokens")) {
      return;
    }

    // Find tokens on the changed grid and update them
    const tokensOnGrid = this.getTokensOnGrid(data.gridX, data.gridY);
    tokensOnGrid.forEach(token => {
      if (!this.heightManager.isExceptionToken(token.id)) {
        this.queueTokenUpdate(token);
      }
    });
  }

  /**
   * Handle area height changes
   * 处理区域高度变化
   */
  onAreaHeightChanged(gridPositions, height) {
    if (!this.isEnabled || !game.settings.get(MODULE_ID, "autoUpdateTokens")) {
      return;
    }

    // Find all tokens in the affected area
    const affectedTokens = new Set();
    
    gridPositions.forEach(pos => {
      const tokensOnGrid = this.getTokensOnGrid(pos.x, pos.y);
      tokensOnGrid.forEach(token => {
        if (!this.heightManager.isExceptionToken(token.id)) {
          affectedTokens.add(token);
        }
      });
    });

    // Queue all affected tokens for update
    affectedTokens.forEach(token => {
      this.queueTokenUpdate(token);
    });
  }

  /**
   * Queue a token for height update with throttling
   * 将Token排队进行高度更新（带限流）
   */
  queueTokenUpdate(tokenDocument) {
    this.updateQueue.add(tokenDocument.id);
    
    // Process queue with throttling
    if (!this.processingQueue) {
      this.processingQueue = true;
      setTimeout(() => {
        this.processUpdateQueue();
        this.processingQueue = false;
      }, this.updateThreshold);
    }
  }

  /**
   * Process the token update queue
   * 处理Token更新队列
   */
  async processUpdateQueue() {
    if (this.updateQueue.size === 0) return;

    const now = Date.now();
    if (now - this.lastUpdate < this.updateThreshold) {
      // Too soon, schedule for later
      setTimeout(() => this.processUpdateQueue(), this.updateThreshold);
      return;
    }

    const tokenIds = Array.from(this.updateQueue);
    this.updateQueue.clear();
    this.lastUpdate = now;

    for (const tokenId of tokenIds) {
      const tokenDocument = canvas.tokens.get(tokenId)?.document;
      if (tokenDocument) {
        await this.updateTokenElevation(tokenDocument);
      }
    }
  }

  /**
   * Update a single token's elevation based on its grid position
   * 根据网格位置更新单个Token的高度
   */
  async updateTokenElevation(tokenDocument) {
    try {
      // Skip if token is in exception list
      if (this.heightManager.isExceptionToken(tokenDocument.id)) {
        return;
      }

      // Get token's current grid position
      const position = this.heightManager.getTokenGridPosition(tokenDocument);
      if (!position) {
        console.warn(`${MODULE_ID} | Could not determine grid position for token ${tokenDocument.name}`);
        return;
      }

      // Get height for this grid position
      const newHeight = this.heightManager.getGridHeight(position.i, position.j);
      const currentHeight = tokenDocument.elevation || 0;

      // Only update if height has changed
      if (currentHeight !== newHeight) {
        await tokenDocument.update({ elevation: newHeight });
        
        console.log(`${MODULE_ID} | Updated token "${tokenDocument.name}" elevation: ${currentHeight} → ${newHeight}`);
        
        // Trigger custom hook
        Hooks.callAll(`${MODULE_ID}.tokenElevationUpdated`, {
          tokenDocument,
          oldElevation: currentHeight,
          newElevation: newHeight,
          gridPosition: position
        });
      }

    } catch (error) {
      console.error(`${MODULE_ID} | Error updating token elevation:`, error);
    }
  }

  /**
   * Get all tokens on a specific grid coordinate
   * 获取特定网格坐标上的所有Token
   */
  getTokensOnGrid(gridX, gridY) {
    if (!canvas.tokens) return [];

    const tokens = [];
    
    for (const token of canvas.tokens.placeables) {
      const position = this.heightManager.getTokenGridPosition(token.document);
      if (position && position.i === gridX && position.j === gridY) {
        tokens.push(token.document);
      }
    }

    return tokens;
  }

  /**
   * Update all tokens on the current scene
   * 更新当前场景中的所有Token
   */
  async updateAllTokens() {
    if (!canvas.tokens || !this.isEnabled) return;

    console.log(`${MODULE_ID} | Updating all tokens on scene`);
    
    const tokens = canvas.tokens.placeables.map(t => t.document);
    let updatedCount = 0;

    for (const tokenDocument of tokens) {
      if (!this.heightManager.isExceptionToken(tokenDocument.id)) {
        const oldElevation = tokenDocument.elevation || 0;
        await this.updateTokenElevation(tokenDocument);
        
        const newElevation = tokenDocument.elevation || 0;
        if (oldElevation !== newElevation) {
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      ui.notifications.info(`Updated elevation for ${updatedCount} tokens`);
    }

    console.log(`${MODULE_ID} | Token update complete: ${updatedCount}/${tokens.length} tokens updated`);
  }

  /**
   * Enable or disable token automation
   * 启用或禁用Token自动化
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`${MODULE_ID} | Token automation ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled && game.user.isGM) {
      // Update all tokens when re-enabling
      this.updateAllTokens();
    }
  }

  /**
   * Toggle token automation state
   * 切换Token自动化状态
   */
  toggle() {
    this.setEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  /**
   * Force update a specific token
   * 强制更新特定Token
   */
  async forceUpdateToken(tokenId) {
    const tokenDocument = canvas.tokens.get(tokenId)?.document;
    if (!tokenDocument) {
      console.warn(`${MODULE_ID} | Token not found: ${tokenId}`);
      return false;
    }

    await this.updateTokenElevation(tokenDocument);
    return true;
  }

  /**
   * Get automation status
   * 获取自动化状态
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      queueSize: this.updateQueue.size,
      processing: this.processingQueue,
      lastUpdate: this.lastUpdate,
      settingEnabled: game.settings.get(MODULE_ID, "autoUpdateTokens")
    };
  }

  /**
   * Handle token size changes for multi-grid tokens
   * 处理多网格Token的尺寸变化
   */
  getTokenGridCoverage(tokenDocument) {
    const position = this.heightManager.getTokenGridPosition(tokenDocument);
    if (!position) return [];

    const width = tokenDocument.width || 1;
    const height = tokenDocument.height || 1;
    const coverage = [];

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        coverage.push({
          i: position.i + x,
          j: position.j + y
        });
      }
    }

    return coverage;
  }

  /**
   * Calculate average height for multi-grid tokens
   * 计算多网格Token的平均高度
   */
  calculateMultiGridHeight(tokenDocument) {
    const coverage = this.getTokenGridCoverage(tokenDocument);
    if (coverage.length === 0) return 0;

    const heights = coverage.map(pos => 
      this.heightManager.getGridHeight(pos.i, pos.j)
    );

    // Return the average height, rounded to nearest integer
    const averageHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;
    return Math.round(averageHeight);
  }

  /**
   * Cleanup resources
   * 清理资源
   */
  destroy() {
    this.updateQueue.clear();
    this.processingQueue = false;
    this.isEnabled = false;
    console.log(`${MODULE_ID} | Token automation destroyed`);
  }
}