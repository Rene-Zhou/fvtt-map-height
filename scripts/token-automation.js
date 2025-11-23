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
    // Hook for token movement (post-update)
    Hooks.on('updateToken', this.onTokenUpdate.bind(this));
    
    // Hook for token movement completion (more reliable)
    Hooks.on('moveToken', this.onTokenMoved.bind(this));
    
    // Hook for token creation
    Hooks.on('createToken', this.onTokenCreate.bind(this));
    
    // Hook for scene change
    Hooks.on('canvasReady', this.onCanvasReady.bind(this));
    
    // Module-specific hooks
    Hooks.on(`${MODULE_ID}.gridHeightChanged`, this.onGridHeightChanged.bind(this));
    Hooks.on(`${MODULE_ID}.areaHeightChanged`, this.onAreaHeightChanged.bind(this));
    
  }

  /**
   * Handle token updates (movement, etc.)
   * 处理Token更新（移动等）
   */
  async onTokenUpdate(tokenDocument, changes, options, userId) {
    
    // 深入分析 changes 对象的内容
    if ('x' in changes || 'y' in changes) {
      if ('x' in changes) {
      }
      if ('y' in changes) {
      }
    }
    
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

    // Don't process if token is in exception list or has flying status
    if (this.shouldSkipToken(tokenDocument)) {
      return;
    }

    // Get the final position from changes (avoiding animation transition coordinates)
    const finalX = changes.x !== undefined ? changes.x : tokenDocument.x;
    const finalY = changes.y !== undefined ? changes.y : tokenDocument.y;
    
    
    // Create a temporary token object with final coordinates for grid calculation
    const finalTokenData = {
      document: {
        x: finalX,
        y: finalY,
        width: tokenDocument.width,
        height: tokenDocument.height,
        id: tokenDocument.id,
        name: tokenDocument.name
      }
    };
    
    // Test grid position with final coordinates
    const testPosition = this.heightManager.getTokenGridPosition(finalTokenData);
    if (testPosition) {
      const testHeight = this.heightManager.getGridHeight(testPosition.i, testPosition.j);
      
      // Store the final coordinates for later use in updateTokenElevation
      tokenDocument._mapHeightFinalX = finalX;
      tokenDocument._mapHeightFinalY = finalY;
      
    } else {
    }
    
    
    // Add to update queue with throttling
    this.queueTokenUpdate(tokenDocument);
  }

  /**
   * Handle token movement completion (moveToken hook)
   * 处理Token移动完成（moveToken钩子）
   */
  async onTokenMoved(tokenDocument, movement, operation, user) {

    // Only process if auto-update is enabled
    if (!this.isEnabled || !game.settings.get(MODULE_ID, "autoUpdateTokens")) {
      return;
    }

    // Only process for GMs or if user controls the token
    if (!game.user.isGM && !tokenDocument.isOwner) {
      return;
    }

    // Don't process if token is in exception list or has flying status
    if (this.shouldSkipToken(tokenDocument)) {
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
  onAreaHeightChanged(data) {
    if (!this.isEnabled || !game.settings.get(MODULE_ID, "autoUpdateTokens")) {
      return;
    }

    // Destructure data object
    // 解构数据对象
    const { gridPositions, height } = data;

    // Find all tokens in the affected area
    const affectedTokens = new Set();

    gridPositions.forEach(pos => {
      const tokensOnGrid = this.getTokensOnGrid(pos.x, pos.y);
      tokensOnGrid.forEach(token => {
        if (!this.shouldSkipToken(token)) {
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

      // Skip if token should be excluded
      if (this.shouldSkipToken(tokenDocument)) {
        return;
      }

      // Use stored final coordinates if available, otherwise use current coordinates
      let targetTokenData = tokenDocument;
      if (tokenDocument._mapHeightFinalX !== undefined && tokenDocument._mapHeightFinalY !== undefined) {
        targetTokenData = {
          document: {
            x: tokenDocument._mapHeightFinalX,
            y: tokenDocument._mapHeightFinalY,
            width: tokenDocument.width,
            height: tokenDocument.height,
            id: tokenDocument.id,
            name: tokenDocument.name
          }
        };
        
        // Clear the stored coordinates
        delete tokenDocument._mapHeightFinalX;
        delete tokenDocument._mapHeightFinalY;
      } else {
      }

      // Get token's grid position
      const position = this.heightManager.getTokenGridPosition(targetTokenData);
      if (!position) {
        return;
      }

      // Get height for this token (handles multi-grid tokens by using maximum height)
      // 获取Token的高度（对于多网格Token使用最大高度）
      const newHeight = this.calculateMultiGridHeight(targetTokenData.document || targetTokenData);
      const currentHeight = tokenDocument.elevation || 0;


      // Only update if height has changed
      if (currentHeight !== newHeight) {
        await tokenDocument.update({ elevation: newHeight });
        
        
        // Trigger custom hook
        Hooks.callAll(`${MODULE_ID}.tokenElevationUpdated`, {
          tokenDocument,
          oldElevation: currentHeight,
          newElevation: newHeight,
          gridPosition: position
        });
      } else {
      }
      
      console.log(`${MODULE_ID} | === updateTokenElevation END for "${tokenDocument.name}" ===`);

    } catch (error) {
      console.log(`${MODULE_ID} | === updateTokenElevation ERROR END for "${tokenDocument.name}" ===`);
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
      if (!this.shouldSkipToken(tokenDocument)) {
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
   * Calculate maximum height for multi-grid tokens
   * 计算多网格Token的最大高度
   */
  calculateMultiGridHeight(tokenDocument) {
    const coverage = this.getTokenGridCoverage(tokenDocument);
    if (coverage.length === 0) return 0;

    const heights = coverage.map(pos =>
      this.heightManager.getGridHeight(pos.i, pos.j)
    );

    // Return the maximum height among all grids the token occupies
    // 返回Token占据的所有网格中的最大高度
    return Math.max(...heights);
  }

  /**
   * Check if a token should skip automatic height updates
   * 检查Token是否应跳过自动高度更新
   */
  shouldSkipToken(tokenDocument) {
    // Check exception list
    if (this.heightManager.isExceptionToken(tokenDocument.id)) {
      return true;
    }

    // Check for flying status
    if (this.hasFlyingStatus(tokenDocument)) {
      return true;
    }

    return false;
  }

  /**
   * Check if a token has flying status
   * 检查Token是否具有飞行状态
   *
   * Uses multiple detection methods:
   * 1. Actor's active effects (v12+ recommended approach)
   * 2. D&D 5e fly speed attribute
   * 3. Custom flying properties
   *
   * Note: Does NOT use tokenDocument.effects (deprecated in v12)
   */
  hasFlyingStatus(tokenDocument) {
    // Get the actor
    const actor = tokenDocument.actor;
    if (!actor) return false;

    // Check for active effects with flying status
    // 检查具有飞行状态的激活效果
    const flyingStatuses = ['fly', 'flying', 'hover', 'hovering', 'levitate', 'levitating'];

    // Method 1: Check actor's active effects
    // 检查Actor的激活效果 - 这是v12+推荐的方式
    if (actor.effects) {
      for (const effect of actor.effects) {
        const label = effect.label?.toLowerCase() || effect.name?.toLowerCase() || '';
        const statusId = effect.statuses?.values().next().value?.toLowerCase() || '';
        const icon = effect.icon?.toLowerCase() || '';

        if (flyingStatuses.some(status =>
          label.includes(status) ||
          statusId.includes(status) ||
          icon.includes(status)
        )) {
          return true;
        }
      }
    }

    // Method 2: For D&D 5e system - check movement speeds
    // D&D 5e系统 - 检查移动速度
    if (game.system.id === 'dnd5e' && actor.system?.attributes?.movement?.fly) {
      const flySpeed = actor.system.attributes.movement.fly;
      // If fly speed exists and is greater than 0, consider it flying
      if (flySpeed && parseFloat(flySpeed) > 0) {
        return true;
      }
    }

    // Method 3: Check for custom flying property (some systems use this)
    // 检查自定义飞行属性（某些系统使用此方式）
    if (actor.system?.attributes?.flying === true) {
      return true;
    }

    return false;
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