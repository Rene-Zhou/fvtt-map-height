/**
 * FVTT Map Height Editor - Debug Helper
 * Debug utilities for testing padding percentage functionality
 */

const MODULE_ID = "fvtt-map-height";

/**
 * Debug helper class for testing padding functionality
 * 用于测试padding功能的调试助手类
 */
export default class DebugHelper {
  
  /**
   * Test grid parameters with different padding values
   * 用不同的padding值测试网格参数
   */
  static testPaddingCalculations() {
    if (!canvas || !canvas.scene || !canvas.grid) {
      console.error(`${MODULE_ID} | Debug: No canvas/scene/grid available`);
      return;
    }
    
    const scene = canvas.scene;
    const sceneWidth = scene.width;
    const sceneHeight = scene.height;
    const gridSize = canvas.grid.size;
    const currentPadding = scene.padding || 0;
    
    console.group(`${MODULE_ID} | Debug: Testing Simplified Padding Calculations`);
    console.log(`Scene: ${sceneWidth}x${sceneHeight}, Grid Size: ${gridSize}, Current Padding: ${(currentPadding * 100).toFixed(1)}%`);
    
    // Test different padding values (as decimals like FVTT uses)
    const testPaddings = [0, 0.1, 0.25, 0.5]; // 0%, 10%, 25%, 50%
    
    testPaddings.forEach(padding => {
      console.group(`Testing Padding: ${(padding * 100).toFixed(1)}%`);
      
      // Test with grid-based symmetric padding calculation
      // Padding is applied symmetrically in grid units, not pixels
      // Formula: totalSize = originalSize + 2 × Math.ceil((originalSize × padding) / gridSize) × gridSize
      const paddingGridsWidthPerSide = Math.ceil((sceneWidth * padding) / gridSize);
      const paddingGridsHeightPerSide = Math.ceil((sceneHeight * padding) / gridSize);
      const paddingWidthPerSide = paddingGridsWidthPerSide * gridSize;
      const paddingHeightPerSide = paddingGridsHeightPerSide * gridSize;
      const totalWidth = sceneWidth + 2 * paddingWidthPerSide;
      const totalHeight = sceneHeight + 2 * paddingHeightPerSide;
      const totalCols = Math.ceil(totalWidth / gridSize);
      const totalRows = Math.ceil(totalHeight / gridSize);
      
      console.log('Grid-Based Padding Calculation:', {
        paddingDecimal: padding,
        paddingPercentage: `${(padding * 100).toFixed(1)}%`,
        paddingGridsPerSide: `${paddingGridsWidthPerSide}x${paddingGridsHeightPerSide} grids`,
        paddingPixelsPerSide: `${paddingWidthPerSide}x${paddingHeightPerSide}px`,
        originalSize: `${sceneWidth}x${sceneHeight}`,
        totalSize: `${totalWidth}x${totalHeight}`,
        gridCoverage: `${totalCols}x${totalRows} grids`,
        gridOffsetX: 0, // Always 0 - grid starts from origin
        gridOffsetY: 0  // Always 0 - grid starts from origin
      });
      
      console.groupEnd();
    });
    
    console.groupEnd();
  }
  
  /**
   * Test coordinate conversion with current settings
   * 用当前设置测试坐标转换
   */
  static testCoordinateConversion() {
    if (!window.MapHeightEditor?.heightOverlay) {
      console.error(`${MODULE_ID} | Debug: Height overlay not available`);
      return;
    }
    
    const overlay = window.MapHeightEditor.heightOverlay;
    const testPoints = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: overlay.gridSize, y: overlay.gridSize },
      { x: overlay.gridSize * 2, y: overlay.gridSize * 2 }
    ];
    
    console.group(`${MODULE_ID} | Debug: Testing Coordinate Conversion`);
    console.log(`Grid Size: ${overlay.gridSize}, Offset: (${overlay.gridOffsetX}, ${overlay.gridOffsetY})`);
    
    testPoints.forEach(point => {
      const gridX = Math.floor((point.x - overlay.gridOffsetX) / overlay.gridSize);
      const gridY = Math.floor((point.y - overlay.gridOffsetY) / overlay.gridSize);
      const worldX = gridX * overlay.gridSize + overlay.gridOffsetX + overlay.gridSize / 2;
      const worldY = gridY * overlay.gridSize + overlay.gridOffsetY + overlay.gridSize / 2;
      
      console.log(`World (${point.x}, ${point.y}) -> Grid (${gridX}, ${gridY}) -> World Center (${worldX}, ${worldY})`);
    });
    
    console.groupEnd();
  }
  
  /**
   * Show current scene and grid information
   * 显示当前场景和网格信息
   */
  static showCurrentInfo() {
    if (!canvas || !canvas.scene) {
      console.error(`${MODULE_ID} | Debug: No canvas/scene available`);
      return;
    }
    
    const scene = canvas.scene;
    const grid = canvas.grid;
    const overlay = window.MapHeightEditor?.heightOverlay;
    
    console.group(`${MODULE_ID} | Debug: Current Scene Information`);
    console.log('Scene:', {
      id: scene.id,
      name: scene.name,
      width: scene.width,
      height: scene.height,
      padding: `${((scene.padding || 0) * 100).toFixed(1)}%`,
      gridSize: scene.grid?.size || 'undefined',
      gridType: scene.grid?.type || 'undefined'
    });
    
    console.log('Canvas Grid:', {
      size: grid?.size,
      type: grid?.type
    });
    
    if (overlay) {
      // Calculate expected total coverage
      const padding = scene.padding || 0;
      // Use grid-based padding calculation: padding is applied symmetrically in grid units
      const expectedPaddingGridsWidthPerSide = Math.ceil((scene.width * padding) / overlay.gridSize);
      const expectedPaddingGridsHeightPerSide = Math.ceil((scene.height * padding) / overlay.gridSize);
      const expectedPaddingWidthPerSide = expectedPaddingGridsWidthPerSide * overlay.gridSize;
      const expectedPaddingHeightPerSide = expectedPaddingGridsHeightPerSide * overlay.gridSize;
      const expectedTotalWidth = scene.width + 2 * expectedPaddingWidthPerSide;
      const expectedTotalHeight = scene.height + 2 * expectedPaddingHeightPerSide;
      const expectedTotalCols = Math.ceil(expectedTotalWidth / overlay.gridSize);
      const expectedTotalRows = Math.ceil(expectedTotalHeight / overlay.gridSize);
      
      console.log('Height Overlay:', {
        isVisible: overlay.isVisible,
        gridSize: overlay.gridSize,
        gridOffsetX: overlay.gridOffsetX,
        gridOffsetY: overlay.gridOffsetY,
        viewportBounds: overlay.viewportBounds,
        expectedCoverage: {
          totalWidth: expectedTotalWidth,
          totalHeight: expectedTotalHeight,
          totalCols: expectedTotalCols,
          totalRows: expectedTotalRows
        }
      });
    } else {
      console.log('Height Overlay: Not initialized');
    }
    
    console.groupEnd();
  }
  
  /**
   * Test grid coverage at scene boundaries
   * 测试场景边界的网格覆盖
   */
  static testGridCoverage() {
    if (!canvas || !canvas.scene) {
      console.error(`${MODULE_ID} | Debug: No canvas/scene available`);
      return;
    }
    
    const scene = canvas.scene;
    const padding = scene.padding || 0;
    const gridSize = canvas.grid.size;
    // Use grid-based padding calculation: padding is applied symmetrically in grid units
    const paddingGridsWidthPerSide = Math.ceil((scene.width * padding) / gridSize);
    const paddingGridsHeightPerSide = Math.ceil((scene.height * padding) / gridSize);
    const paddingWidthPerSide = paddingGridsWidthPerSide * gridSize;
    const paddingHeightPerSide = paddingGridsHeightPerSide * gridSize;
    const totalWidth = scene.width + 2 * paddingWidthPerSide;
    const totalHeight = scene.height + 2 * paddingHeightPerSide;
    
    console.group(`${MODULE_ID} | Debug: Testing Grid Coverage`);
    console.log(`Scene: ${scene.width}x${scene.height}, Padding: ${(padding * 100).toFixed(1)}%`);
    console.log(`Total Canvas: ${totalWidth}x${totalHeight}`);
    
    // Test corner points
    const testPoints = [
      { name: "Top-Left Corner", x: 0, y: 0 },
      { name: "Top-Right Corner", x: totalWidth - 1, y: 0 },
      { name: "Bottom-Left Corner", x: 0, y: totalHeight - 1 },
      { name: "Bottom-Right Corner", x: totalWidth - 1, y: totalHeight - 1 },
      { name: "Original Scene Top-Left", x: paddingWidthPerSide, y: paddingHeightPerSide },
      { name: "Original Scene Bottom-Right", x: paddingWidthPerSide + scene.width - 1, y: paddingHeightPerSide + scene.height - 1 }
    ];
    
    testPoints.forEach(point => {
      const gridX = Math.floor(point.x / gridSize);
      const gridY = Math.floor(point.y / gridSize);
      console.log(`${point.name}: World(${Math.ceil(point.x)}, ${Math.ceil(point.y)}) -> Grid(${gridX}, ${gridY})`);
    });
    
    console.groupEnd();
  }
  
  /**
   * Install debug commands to global scope
   * 将调试命令安装到全局作用域
   */
  static installDebugCommands() {
    window.debugMapHeight = {
      testPadding: () => DebugHelper.testPaddingCalculations(),
      testCoords: () => DebugHelper.testCoordinateConversion(),
      testCoverage: () => DebugHelper.testGridCoverage(),
      showInfo: () => DebugHelper.showCurrentInfo(),
      help: () => {
        console.log(`${MODULE_ID} | Debug Commands:
        debugMapHeight.testPadding() - Test simplified padding calculations
        debugMapHeight.testCoords() - Test coordinate conversion
        debugMapHeight.testCoverage() - Test grid coverage at boundaries
        debugMapHeight.showInfo() - Show current scene/grid info
        debugMapHeight.help() - Show this help`);
      }
    };
    
    console.log(`${MODULE_ID} | Debug commands installed. Type 'debugMapHeight.help()' for available commands.`);
  }
}