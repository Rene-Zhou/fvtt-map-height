/**
 * FVTT Map Height Editor - Height Data Manager
 * Manages height data storage using Scene flags
 */

const MODULE_ID = "fvtt-map-height";

/**
 * HeightManager class - handles all height data operations
 * 高度管理器类 - 处理所有高度数据操作
 */
export default class HeightManager {
  constructor() {
    this.scene = null;
    this.gridHeights = new Map();
    this.exceptTokens = new Set();
    this.enabled = false;
    
    // Cache for performance optimization
    this.gridCache = new Map();
    this.lastCacheUpdate = 0;
    this.cacheTimeout = 1000; // 1 second cache timeout
    
    // Grid parameters (synchronized with height-overlay)
    this.gridSize = 100;
    this.gridOffsetX = 0;
    this.gridOffsetY = 0;
  }

  /**
   * Initialize the height manager for the current scene
   * 为当前场景初始化高度管理器
   */
  initialize(scene = null) {
    this.scene = scene || canvas.scene;
    if (!this.scene) {
      console.warn(`${MODULE_ID} | No scene available for height manager`);
      return false;
    }

    this.loadHeightData();
    this.updateGridParameters();
    return true;
  }

  /**
   * Update grid parameters to sync with height-overlay
   * 更新网格参数以与height-overlay同步
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
   * Load height data from scene flags
   * 从场景标志加载高度数据
   */
  loadHeightData() {
    try {
      const flagData = this.scene.getFlag(MODULE_ID, "heightData") || {};
      
      // Load grid heights
      this.gridHeights.clear();
      if (flagData.gridHeights) {
        Object.entries(flagData.gridHeights).forEach(([key, height]) => {
          this.gridHeights.set(key, Number(height));
        });
      }
      
      // Load exception tokens
      this.exceptTokens.clear();
      if (flagData.exceptTokens) {
        flagData.exceptTokens.forEach(tokenId => {
          this.exceptTokens.add(tokenId);
        });
      }
      
      // Load enabled state
      this.enabled = flagData.enabled !== false; // Default to true
      
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error loading height data:`, error);
      this.resetData();
    }
  }

  /**
   * Save height data to scene flags
   * 保存高度数据到场景标志
   */
  async saveHeightData() {
    if (!this.scene) {
      console.error(`${MODULE_ID} | Cannot save: no scene available`);
      return false;
    }

    try {
      const heightData = {
        gridHeights: Object.fromEntries(this.gridHeights),
        exceptTokens: Array.from(this.exceptTokens),
        enabled: this.enabled,
        version: "1.0.0",
        lastUpdated: Date.now()
      };

      await this.scene.setFlag(MODULE_ID, "heightData", heightData);
      return true;
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error saving height data:`, error);
      ui.notifications.error(game.i18n.localize("MAP_HEIGHT.Notifications.ErrorSavingData"));
      return false;
    }
  }

  /**
   * Get height for a specific grid coordinate
   * 获取特定网格坐标的高度
   */
  getGridHeight(gridX, gridY) {
    const key = this.getGridKey(gridX, gridY);
    const height = this.gridHeights.get(key) || 0;
    return height;
  }

  /**
   * Set height for a specific grid coordinate
   * 设置特定网格坐标的高度
   */
  async setGridHeight(gridX, gridY, height) {
    
    if (!this.validateGridCoordinates(gridX, gridY)) {
      console.warn(`${MODULE_ID} | Invalid grid coordinates: ${gridX}, ${gridY}`);
      return false;
    }

    if (!this.validateHeight(height)) {
      console.warn(`${MODULE_ID} | Invalid height value: ${height}`);
      return false;
    }

    const key = this.getGridKey(gridX, gridY);
    const oldHeight = this.gridHeights.get(key) || 0;
    
    
    if (oldHeight === height) {
      return true; // No change needed
    }

    this.gridHeights.set(key, height);
    
    // Clear cache for this grid
    this.gridCache.delete(key);
    
    // Save to scene flags
    const saved = await this.saveHeightData();
    
    if (saved) {
      
      // Trigger update event
      Hooks.callAll(`${MODULE_ID}.gridHeightChanged`, {
        gridX, gridY, height, oldHeight, key
      });
    }
    
    return saved;
  }

  /**
   * Get token's current grid position
   * 获取Token当前的网格位置
   */
  getTokenGridPosition(token) {
    if (!token || !canvas.grid) {
      console.warn(`${MODULE_ID} | Cannot get grid position: token or grid not available`);
      return null;
    }
    
    try {
      const tokenDoc = token.document || token;
      
      // Get grid size and scene info for debugging
      const gridSize = canvas.grid.size;
      const sceneWidth = canvas.scene.width;
      const sceneHeight = canvas.scene.height;
      const gridType = canvas.grid.type;
      
      
      let gridCoords;
      
      // Use multiple methods and compare results for accuracy
      let v12Result = null;
      let offsetResult = null;
      let manualResult = null;
      
      // Method 1: Try v12+ getTopLeftPoint
      if (canvas.grid.getTopLeftPoint) {
        try {
          const topLeft = canvas.grid.getTopLeftPoint({x: tokenDoc.x, y: tokenDoc.y});
          const gridX = Math.floor(topLeft.x / gridSize);
          const gridY = Math.floor(topLeft.y / gridSize);
          v12Result = { i: gridX, j: gridY };
        } catch (error) {
          console.warn(`${MODULE_ID} | v12 getTopLeftPoint failed:`, error);
        }
      }
      
      // Method 2: Try legacy getOffset
      if (canvas.grid.getOffset) {
        try {
          const offset = canvas.grid.getOffset({x: tokenDoc.x, y: tokenDoc.y});
          offsetResult = { i: offset.i, j: offset.j };
        } catch (error) {
          console.warn(`${MODULE_ID} | getOffset failed:`, error);
        }
      }
      
      // Method 3: Manual calculation (always works)
      // Use same formula as height-overlay.js for consistency
      manualResult = {
        i: Math.floor((tokenDoc.x - this.gridOffsetX) / this.gridSize),
        j: Math.floor((tokenDoc.y - this.gridOffsetY) / this.gridSize)
      };
      
      // Choose the most reliable result
      if (v12Result && offsetResult && manualResult) {
        // Compare all three methods
        const v12Manual = (Math.abs(v12Result.i - manualResult.i) <= 1 && Math.abs(v12Result.j - manualResult.j) <= 1);
        const offsetManual = (Math.abs(offsetResult.i - manualResult.i) <= 1 && Math.abs(offsetResult.j - manualResult.j) <= 1);
        const offsetSwapped = (Math.abs(offsetResult.i - manualResult.j) <= 1 && Math.abs(offsetResult.j - manualResult.i) <= 1);
        
        if (v12Manual && offsetManual) {
          gridCoords = v12Result;
        } else if (v12Manual) {
          console.log(`${MODULE_ID} | v12 and manual agree, using v12 result`);
          gridCoords = v12Result;
        } else if (offsetManual) {
          gridCoords = offsetResult;
        } else if (offsetSwapped) {
          gridCoords = { i: offsetResult.j, j: offsetResult.i };
        } else {
          console.warn(`${MODULE_ID} | Methods disagree, using manual calculation`);
          gridCoords = manualResult;
        }
      } else if (v12Result && manualResult) {
        // Only v12 and manual available
        if (Math.abs(v12Result.i - manualResult.i) <= 1 && Math.abs(v12Result.j - manualResult.j) <= 1) {
          console.log(`${MODULE_ID} | v12 and manual agree, using v12 result`);
          gridCoords = v12Result;
        } else {
          console.warn(`${MODULE_ID} | v12 and manual disagree, using manual`);
          gridCoords = manualResult;
        }
      } else if (offsetResult && manualResult) {
        // Only offset and manual available
        if (Math.abs(offsetResult.i - manualResult.i) <= 1 && Math.abs(offsetResult.j - manualResult.j) <= 1) {
          gridCoords = offsetResult;
        } else if (Math.abs(offsetResult.i - manualResult.j) <= 1 && Math.abs(offsetResult.j - manualResult.i) <= 1) {
          gridCoords = { i: offsetResult.j, j: offsetResult.i };
        } else {
          console.warn(`${MODULE_ID} | offset unreliable, using manual`);
          gridCoords = manualResult;
        }
      } else {
        // Only manual available
        gridCoords = manualResult;
      }
      
      // Final validation and clamping
      if (gridCoords.i < 0 || gridCoords.j < 0) {
        console.warn(`${MODULE_ID} | Negative grid coordinates detected, clamping to 0`);
        gridCoords.i = Math.max(0, gridCoords.i);
        gridCoords.j = Math.max(0, gridCoords.j);
      }
      
      // Calculate total grid bounds including padding
      const padding = canvas.scene.padding || 0;
      const paddingGridsWidthPerSide = Math.ceil((sceneWidth * padding) / this.gridSize);
      const paddingGridsHeightPerSide = Math.ceil((sceneHeight * padding) / this.gridSize);
      const paddingWidthPerSide = paddingGridsWidthPerSide * this.gridSize;
      const paddingHeightPerSide = paddingGridsHeightPerSide * this.gridSize;
      const totalWidth = sceneWidth + 2 * paddingWidthPerSide;
      const totalHeight = sceneHeight + 2 * paddingHeightPerSide;
      
      const maxGridX = Math.ceil(totalWidth / this.gridSize) - 1;
      const maxGridY = Math.ceil(totalHeight / this.gridSize) - 1;
      
      if (gridCoords.i > maxGridX || gridCoords.j > maxGridY) {
        console.warn(`${MODULE_ID} | Grid coordinates exceed canvas bounds (including padding), clamping`);
        gridCoords.i = Math.min(gridCoords.i, maxGridX);
        gridCoords.j = Math.min(gridCoords.j, maxGridY);
      }
      
      
      return {
        i: gridCoords.i,
        j: gridCoords.j,
        x: tokenDoc.x,
        y: tokenDoc.y
      };
    } catch (error) {
      console.error(`${MODULE_ID} | Error getting token grid position:`, error);
      return null;
    }
  }

  /**
   * Get height for token's current position
   * 获取Token当前位置的高度
   */
  getTokenHeight(token) {
    const position = this.getTokenGridPosition(token);
    if (!position) return 0;
    
    return this.getGridHeight(position.i, position.j);
  }

  /**
   * Check if token is in exception list (flying units)
   * 检查Token是否在例外列表中（飞行单位）
   */
  isExceptionToken(tokenId) {
    return this.exceptTokens.has(tokenId);
  }

  /**
   * Add token to exception list
   * 将Token添加到例外列表
   */
  async addTokenException(tokenId) {
    if (!tokenId) return false;
    
    this.exceptTokens.add(tokenId);
    const saved = await this.saveHeightData();
    
    if (saved) {
      Hooks.callAll(`${MODULE_ID}.tokenExceptionAdded`, tokenId);
    }
    
    return saved;
  }

  /**
   * Remove token from exception list
   * 从例外列表中移除Token
   */
  async removeTokenException(tokenId) {
    if (!tokenId || !this.exceptTokens.has(tokenId)) return false;
    
    this.exceptTokens.delete(tokenId);
    const saved = await this.saveHeightData();
    
    if (saved) {
      Hooks.callAll(`${MODULE_ID}.tokenExceptionRemoved`, tokenId);
    }
    
    return saved;
  }

  /**
   * Toggle token exception status
   * 切换Token的例外状态
   */
  async toggleTokenException(tokenId) {
    if (this.isExceptionToken(tokenId)) {
      return await this.removeTokenException(tokenId);
    } else {
      return await this.addTokenException(tokenId);
    }
  }

  /**
   * Get all grid heights in a specific area
   * 获取特定区域内的所有网格高度
   */
  getAreaHeights(startX, startY, endX, endY) {
    const heights = new Map();
    
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = this.getGridKey(x, y);
        const height = this.gridHeights.get(key) || 0;
        heights.set(key, height);
      }
    }
    
    return heights;
  }

  /**
   * Set heights for multiple grids
   * 为多个网格设置高度
   */
  async setAreaHeights(gridPositions, height) {
    if (!Array.isArray(gridPositions) || gridPositions.length === 0) {
      return false;
    }

    let changesMade = false;
    
    for (const pos of gridPositions) {
      const { x, y } = pos;
      if (this.validateGridCoordinates(x, y)) {
        const key = this.getGridKey(x, y);
        const oldHeight = this.gridHeights.get(key) || 0;
        
        if (oldHeight !== height) {
          this.gridHeights.set(key, height);
          this.gridCache.delete(key);
          changesMade = true;
        }
      }
    }
    
    if (changesMade) {
      const saved = await this.saveHeightData();
      if (saved) {
        Hooks.callAll(`${MODULE_ID}.areaHeightChanged`, gridPositions, height);
      }
      return saved;
    }
    
    return true;
  }

  /**
   * Reset all height data
   * 重置所有高度数据
   */
  resetData() {
    this.gridHeights.clear();
    this.exceptTokens.clear();
    this.enabled = true;
    this.gridCache.clear();
  }

  /**
   * Generate grid key from coordinates
   * 从坐标生成网格键
   */
  getGridKey(gridX, gridY) {
    return `${Math.floor(gridX)},${Math.floor(gridY)}`;
  }

  /**
   * Parse grid key back to coordinates
   * 将网格键解析回坐标
   */
  parseGridKey(key) {
    const parts = key.split(',');
    if (parts.length !== 2) return null;
    
    const x = parseInt(parts[0]);
    const y = parseInt(parts[1]);
    
    if (isNaN(x) || isNaN(y)) return null;
    
    return { x, y };
  }

  /**
   * Validate grid coordinates
   * 验证网格坐标
   */
  validateGridCoordinates(gridX, gridY) {
    return (
      typeof gridX === 'number' &&
      typeof gridY === 'number' &&
      isFinite(gridX) &&
      isFinite(gridY) &&
      gridX >= -10000 &&
      gridX <= 10000 &&
      gridY >= -10000 &&
      gridY <= 10000
    );
  }

  /**
   * Validate height value
   * 验证高度值
   */
  validateHeight(height) {
    return (
      typeof height === 'number' &&
      isFinite(height) &&
      height >= -1000 &&
      height <= 1000
    );
  }

  /**
   * Get statistics about current height data
   * 获取当前高度数据的统计信息
   */
  getStatistics() {
    const heights = Array.from(this.gridHeights.values());
    
    return {
      totalGrids: this.gridHeights.size,
      exceptionTokens: this.exceptTokens.size,
      minHeight: heights.length > 0 ? Math.min(...heights) : 0,
      maxHeight: heights.length > 0 ? Math.max(...heights) : 0,
      averageHeight: heights.length > 0 ? heights.reduce((a, b) => a + b, 0) / heights.length : 0,
      enabled: this.enabled
    };
  }

  /**
   * Export height data for backup/sharing
   * 导出高度数据用于备份/分享
   */
  exportData() {
    return {
      gridHeights: Object.fromEntries(this.gridHeights),
      exceptTokens: Array.from(this.exceptTokens),
      enabled: this.enabled,
      scene: this.scene?.id,
      sceneName: this.scene?.name,
      exportDate: new Date().toISOString(),
      version: "1.0.0"
    };
  }

  /**
   * Import height data from backup
   * 从备份导入高度数据
   */
  async importData(data) {
    try {
      if (data.gridHeights) {
        this.gridHeights.clear();
        Object.entries(data.gridHeights).forEach(([key, height]) => {
          if (this.validateHeight(height)) {
            this.gridHeights.set(key, Number(height));
          }
        });
      }
      
      if (data.exceptTokens && Array.isArray(data.exceptTokens)) {
        this.exceptTokens.clear();
        data.exceptTokens.forEach(tokenId => {
          if (typeof tokenId === 'string') {
            this.exceptTokens.add(tokenId);
          }
        });
      }
      
      if (typeof data.enabled === 'boolean') {
        this.enabled = data.enabled;
      }
      
      const saved = await this.saveHeightData();
      if (saved) {
        Hooks.callAll(`${MODULE_ID}.dataImported`, data);
      }
      
      return saved;
      
    } catch (error) {
      console.error(`${MODULE_ID} | Error importing height data:`, error);
      return false;
    }
  }
}