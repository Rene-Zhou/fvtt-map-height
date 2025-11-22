# CLAUDE.md - AI Assistant Guide for FVTT Map Height Editor

This document provides comprehensive guidance for AI assistants working on the FVTT Map Height Editor module.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Codebase Structure](#codebase-structure)
3. [Architecture and Design Patterns](#architecture-and-design-patterns)
4. [Key Components](#key-components)
5. [Development Workflows](#development-workflows)
6. [Coding Conventions](#coding-conventions)
7. [Common Tasks Guide](#common-tasks-guide)
8. [Critical Patterns to Follow](#critical-patterns-to-follow)
9. [Testing and Debugging](#testing-and-debugging)
10. [Git Workflow](#git-workflow)

---

## Project Overview

### Purpose
A Foundry VTT v12.343+ module that enables Game Masters to paint ground heights on grid-based maps and automatically manages token elevations based on their grid positions. Essential for maps with cliffs, elevated platforms, and multi-level terrain.

### Core Features
- **One-Click Activation**: Single button in scene controls to enter/exit edit mode
- **Canvas Brush Display**: Floating, draggable window showing current brush height with quick adjustment buttons
- **Keyboard Shortcuts**: Arrow keys, +/-, and 0 key for rapid height adjustments
- **Height Painting**: Click or drag to paint height values on grid squares
- **Automatic Token Elevation**: Tokens automatically update elevation when moving
- **Automatic Flying Detection**: D&D 5e fly speed detection, active effects parsing, token status detection
- **Visual Overlay**: PIXI-based canvas overlay showing height values with color coding
- **Data Management**: Import/export/clear height data through settings menu
- **Layer-Based Edit Mode**: Integrates seamlessly with Foundry's canvas layer system

### Technology Stack
- **Platform**: Foundry VTT v12.343+
- **Language**: Pure ES6 Modules (no build process)
- **UI Framework**: Canvas Layer System + PIXI.js overlays (no ApplicationV2 sidebar)
- **Rendering**: PIXI.js (Foundry's canvas engine)
- **Templates**: Handlebars (for data management dialog only)
- **Storage**: Scene Flags (persistent per-scene data)
- **Internationalization**: English and Chinese (中文)

---

## Codebase Structure

```
fvtt-map-height/
├── module.json                  # Module manifest and configuration
├── README.md                    # User documentation
├── CLAUDE.md                    # This file - AI assistant guide
├── scripts/
│   ├── main.js                 # Module entry point, layer registration, scene controls
│   ├── height-manager.js       # Core data management layer
│   ├── token-automation.js     # Automatic token elevation + flying detection
│   ├── keyboard-handler.js     # Keyboard shortcut system
│   ├── debug-helper.js         # Development debugging utilities
│   └── ui/
│       ├── brush-display.js    # Canvas overlay brush height display
│       ├── height-overlay.js   # PIXI canvas overlay renderer
│       └── height-layer.js     # Custom canvas interaction layer
├── templates/
│   └── data-management.hbs     # Data import/export/clear dialog
├── styles/
│   └── map-height.css          # All module styles (900+ lines)
└── lang/
    ├── en.json                 # English translations
    └── cn.json                 # Chinese translations
```

### File Purpose Quick Reference

| File | Primary Responsibility | When to Modify |
|------|----------------------|----------------|
| `main.js` | Module initialization, scene controls, layer registration | Adding new hooks, controls, settings |
| `height-manager.js` | Data CRUD, grid calculations, scene flag management | Changing data structure, grid logic |
| `token-automation.js` | Token movement tracking, elevation updates, flying detection | Modifying auto-update, detection logic |
| `brush-display.js` | Canvas overlay with brush height, quick buttons, drag support | Changing brush display UI |
| `keyboard-handler.js` | Keyboard shortcuts for height adjustment | Adding/modifying shortcuts |
| `height-overlay.js` | PIXI rendering, visual overlay, viewport culling | Changing visual appearance, performance |
| `height-layer.js` | Canvas layer integration, activate/deactivate logic | Canvas interaction, edit mode lifecycle |
| `debug-helper.js` | Debug commands and testing utilities | Adding debug features |

---

## Architecture and Design Patterns

### Four-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  UI Control Layer (height-layer.js, brush-display.js,          │
│                     keyboard-handler.js)                        │
│  - Canvas layer lifecycle, user interactions, keyboard input   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│  Rendering Layer (height-overlay.js, brush-display.js)         │
│  - PIXI visualization, viewport culling, brush display         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│  Logic Layer (token-automation.js, main.js)                     │
│  - Token tracking, flying detection, event handling             │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│  Data Storage Layer (height-manager.js)                 │
│  - Scene flags, grid calculations, validation           │
└─────────────────────────────────────────────────────────┘
```

### State Management Hierarchy

```javascript
// Global State (window.MapHeightEditor)
{
  MODULE_ID: "fvtt-map-height",
  isActive: boolean,              // Module enabled for current user
  currentBrushHeight: number,     // Active brush value
  heightManager: HeightManager,   // Singleton instance
  tokenAutomation: TokenAutomation,
  sidebar: MapHeightSidebar,
  heightOverlay: HeightOverlay,
  DebugHelper: DebugHelper        // Only in debug mode
}

// Persistent Storage (scene.flags["fvtt-map-height"].heightData)
{
  gridHeights: {[key: string]: number},  // "x,y" -> height
  exceptTokens: string[],                // Token IDs
  enabled: boolean,
  version: "1.0.0",
  lastUpdated: timestamp
}

// Client Settings (game.settings)
- autoUpdateTokens (world scope, boolean)
- overlayOpacity (client scope, 0-1)
- defaultBrushHeight (client scope, number)
```

### Design Patterns Used

1. **Singleton Pattern**: Core managers (HeightManager, TokenAutomation) are singletons stored in `window.MapHeightEditor`

2. **Observer Pattern**: Extensive use of Foundry Hooks for decoupled communication
   ```javascript
   Hooks.callAll("fvtt-map-height.gridHeightChanged", {gridX, gridY, height});
   ```

3. **Event Delegation**: ApplicationV2 uses `data-action` attributes for event routing
   ```javascript
   <button data-action="select-brush" data-height="10">
   ```

4. **Throttling Pattern**: Update queues prevent performance issues
   ```javascript
   queueTokenUpdate(tokenId) {
     this.updateQueue.add(tokenId);
     setTimeout(() => this.processUpdateQueue(), 100);
   }
   ```

5. **Viewport Culling**: Only render visible elements for performance
   ```javascript
   renderVisibleGrids() {
     const bounds = this.calculateViewportBounds();
     // Only render grids within bounds
   }
   ```

---

## Key Components

### HeightManager (Core Data Manager)
**Location**: `scripts/height-manager.js`

**Purpose**: Central data management for all height-related operations

**Key Responsibilities**:
- Load/save height data from Scene flags
- Grid coordinate validation and key generation (`"x,y"` format)
- Token grid position calculation with padding support
- Exception token management
- Data import/export
- Grid parameter synchronization

**Critical Methods**:
```javascript
// Initialize for a scene
async initialize(scene)

// Get/Set grid heights
getGridHeight(gridX, gridY) -> number
async setGridHeight(gridX, gridY, height)

// Token positioning
getTokenGridPosition(token) -> {x, y}

// Grid calculations (handles padding)
updateGridParameters()
getTotalCanvasCoverage() -> {width, height}

// Exception management
isExceptionToken(tokenId) -> boolean
async addExceptionToken(tokenId)
async removeExceptionToken(tokenId)

// Data operations
exportData() -> object
async importData(data)
```

**Important Details**:
- Grid keys are **strings**: `"x,y"` (e.g., `"10,5"`)
- Height validation: -1000 to 1000 range
- Three fallback methods for grid position calculation (cross-version compatibility)
- Padding handled in grid units, not pixels
- All Scene flag updates are async

### TokenAutomation (Elevation Manager)
**Location**: `scripts/token-automation.js`

**Purpose**: Automatic token elevation updates based on grid position

**Key Responsibilities**:
- Listen for token movement/creation events
- Queue and throttle elevation updates
- Respect exception list
- Handle multi-grid tokens
- Track final token positions

**Critical Methods**:
```javascript
// Hook handlers
async onTokenUpdate(tokenDocument, changed, options, userId)
async onTokenMoved(tokenDocument, scene)

// Update logic
async updateTokenElevation(tokenDocument)
queueTokenUpdate(tokenId)
async processUpdateQueue()
async updateAllTokens()
```

**Update Flow**:
1. Token moves → `updateToken` or `moveToken` hook fires
2. `onTokenUpdate()` captures event
3. Token queued with throttling (100ms)
4. `updateTokenElevation()` calculates grid position
5. Gets height from HeightManager
6. Updates `token.document.elevation` if changed
7. Fires custom hook: `fvtt-map-height.tokenElevationUpdated`

### MapHeightSidebar (UI Controller)
**Location**: `scripts/ui/sidebar-control.js`

**Purpose**: ApplicationV2-based user interface

**ApplicationV2 Structure**:
```javascript
class MapHeightSidebar extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "map-height-sidebar",
    classes: ["map-height"],
    window: {
      title: "MAP_HEIGHT.ModuleTitle",
      minimizable: true,
      resizable: false
    },
    position: { width: 320, height: "auto" }
  };

  static PARTS = {
    form: { template: "modules/fvtt-map-height/templates/sidebar-control.hbs" }
  };

  _prepareContext(options) {
    // Return data for template
  }

  _attachPartListeners(partId, htmlElement, options) {
    // Event delegation via data-action
  }
}
```

**Event Actions** (via `data-action`):
- `toggle-edit-mode` - Enable/disable height editing
- `select-brush` - Choose height brush value
- `set-custom-height` - Apply custom height
- `add-exception` - Add selected token to exception list
- `remove-exception` - Remove token from exception list
- `export-data` - Export height data to JSON
- `import-data` - Import height data from JSON
- `clear-all` - Reset all heights (with confirmation)

### HeightOverlay (Visual Renderer)
**Location**: `scripts/ui/height-overlay.js`

**Purpose**: PIXI-based canvas visualization

**Key Features**:
- **Viewport Culling**: Only renders visible grids (viewport + 2 grid buffer)
- **Drag Painting**: Click and drag to paint multiple grids
- **Color Coding**:
  - Blue (#4FC3F7): Height 0 (water level)
  - Green (#81C784): Positive elevation
  - Red (#E57373): Negative elevation
- **Performance**: Element reuse, throttled rendering (100ms)

**Critical Methods**:
```javascript
// Rendering
renderVisibleGrids()
cullOffscreenElements()
calculateViewportBounds() -> {left, top, right, bottom}

// Interaction
onGridPointerDown(x, y, event)
paintGrid(x, y)
onGlobalPointerMove(event)  // Drag painting

// Synchronization
updateGridParameters()  // Sync with HeightManager
```

**Grid Element Structure**:
```javascript
// Each grid is a PIXI.Container with:
{
  ._background: PIXI.Graphics,     // Colored rectangle
  ._text: PIXI.Text,               // Height number
  ._gridX: number,
  ._gridY: number,
  ._height: number
}
```

### MapHeightLayer (Canvas Layer)
**Location**: `scripts/ui/height-layer.js`

**Purpose**: Custom InteractionLayer for canvas integration

**Integration**:
```javascript
CONFIG.Canvas.layers.mapheight = {
  layerClass: MapHeightLayer,
  group: "interface"
};
```

**Layer Configuration**:
- Z-index: 220 (between drawings and notes)
- Activates edit mode when layer is activated
- Deactivates edit mode when layer is deactivated
- Handles left-click events for painting

**Edit Mode Lifecycle**:
```javascript
activate() {
  // Called when Map Height Editor button is clicked
  window.MapHeightEditor.isActive = true;
  this.isHeightEditMode = true;

  // Show UI components
  heightOverlay.show();
  brushDisplay.show();
  keyboardHandler.enable();

  // Fire hook and notify user
  Hooks.callAll("fvtt-map-height.editModeChanged", true);
  ui.notifications.info("Height edit mode activated");
}

deactivate() {
  // Only proceed if was actually active (prevents spurious notifications)
  if (!window.MapHeightEditor.isActive) return;

  // Hide UI and clean up
  heightOverlay.hide();
  brushDisplay.hide();
  keyboardHandler.disable();

  // Fire hook and notify user
  Hooks.callAll("fvtt-map-height.editModeChanged", false);
  ui.notifications.info("Height edit mode deactivated");
}
```

### BrushDisplay (Canvas Overlay UI)
**Location**: `scripts/ui/brush-display.js`

**Purpose**: Floating canvas overlay showing current brush height with quick adjustment controls

**Key Features**:
- Draggable PIXI.Container positioned on canvas
- Color-coded height display (blue=0, green=positive, red=negative)
- Quick action buttons: +1, 0 (zero), -1
- Pulse animation on height changes
- Persistent position (saved to client settings)
- × button exits edit mode (switches to tokens layer)

**Critical Methods**:
```javascript
// Show/hide display
show() / hide()

// Update brush height and color coding
updateHeight(newHeight)

// Handle drag to reposition
onDragStart(event) / onDrag(event) / onDragEnd(event)

// Quick adjustment buttons
onQuickAction(action) // 'increment', 'decrement', 'zero'

// Close button - exits edit mode entirely
onCloseEditMode(event) {
  canvas.tokens?.activate(); // Switch to tokens layer
  ui.controls.initialize({ control: "token", tool: "select" });
}
```

**HTML Structure**:
```javascript
this.element.innerHTML = `
  <div class="brush-display-header">
    <i class="fas fa-paint-brush"></i>
    <span class="brush-display-title">Height Brush</span>
    <button class="brush-display-close">×</button>
  </div>
  <div class="brush-display-body">
    <div class="brush-height-value">0</div>
    <div class="brush-height-bar"></div>
  </div>
  <div class="brush-display-controls">
    <button class="brush-quick-btn positive">+</button>
    <button class="brush-quick-btn zero">0</button>
    <button class="brush-quick-btn negative">-</button>
  </div>
`;
```

### KeyboardHandler (Input Manager)
**Location**: `scripts/keyboard-handler.js`

**Purpose**: Manages keyboard shortcuts for brush height adjustment

**Keyboard Shortcuts**:
- **Arrow Up/Down**: ±10
- **Arrow Left/Right**: ±5
- **Plus/Minus (+/-)**: ±1
- **Digit 0**: Set to 0

**Key Features**:
- Only active during edit mode
- Disabled when input fields have focus (prevents conflicts)
- Updates both global brush height and brush display
- Shows visual feedback (floating indicators optional)
- Can be enabled/disabled via client setting

**Critical Methods**:
```javascript
// Enable/disable shortcuts
enable() / disable()

// Handle key press
onKeyDown(event) {
  // Check if shortcuts enabled and edit mode active
  if (!enabled || !MapHeightEditor.isActive) return;

  // Don't interfere with input fields
  if (document.activeElement.tagName === 'INPUT') return;

  // Check both event.code and event.key for compatibility
  let shortcut = this.shortcuts[event.code] || this.shortcuts[event.key];
  if (!shortcut) return;

  // Apply adjustment or set value
  const newHeight = shortcut.setValue ?? (currentHeight + shortcut.adjustment);
  updateBrushHeight(newHeight, shortcut.adjustment);
}

// Update brush height globally
updateBrushHeight(newHeight, adjustment) {
  window.MapHeightEditor.currentBrushHeight = newHeight;
  brushDisplay?.updateHeight(newHeight);
  ui.controls.render(); // Update scene controls
}
```

**Important**: Checks both `event.code` and `event.key` because symbol keys (+/-) work better with `event.key`.

---

## Development Workflows

### No Build Process
This module uses **pure ES6 modules** with no transpilation or bundling:
- Direct browser loading of ES modules
- Hot reload enabled for development (CSS, templates, JSON)
- No package.json or npm dependencies
- Immediate refresh on file changes

### Module Loading Sequence
1. `init` hook: Register settings, canvas layer config
2. `setup` hook: Load module components dynamically
3. `ready` hook: Initialize GM interface (sidebar, automation)
4. `canvasReady` hook: Initialize for current scene

### Hot Reload Configuration
From `module.json`:
```json
"flags": {
  "hotReload": {
    "extensions": ["css", "hbs", "json"],
    "paths": ["scripts", "styles", "templates", "lang"]
  }
}
```

**Note**: JavaScript files require manual refresh.

### Development Environment Setup
1. Install Foundry VTT v12.343+ locally
2. Create symlink in Foundry modules directory:
   ```bash
   ln -s /path/to/fvtt-map-height /path/to/FoundryVTT/Data/modules/
   ```
3. Enable module in Foundry
4. Enable debug mode: Add `?debug` to URL or set core debug setting
5. Open browser console for debug commands

---

## Coding Conventions

### File Organization

**ES6 Module Pattern**:
```javascript
/**
 * Class description in English
 * 中文描述
 */
export default class ClassName {
  constructor() {
    // Initialize
  }

  /**
   * Method description
   * @param {Type} paramName - Description
   * @returns {Type} Description
   */
  methodName(paramName) {
    // Implementation
  }
}
```

**Dynamic Imports** (in main.js):
```javascript
const { default: HeightManager } = await import('./height-manager.js');
```

### Naming Conventions

| Type | Convention | Examples |
|------|-----------|----------|
| Classes | PascalCase | `HeightManager`, `TokenAutomation` |
| Methods | camelCase | `getGridHeight`, `updateTokenElevation` |
| Private methods | `_underscore` prefix | `_onClickAction`, `_prepareContext` |
| Constants | UPPER_SNAKE_CASE | `MODULE_ID`, `DEFAULT_OPTIONS` |
| Grid keys | String `"x,y"` | `"10,5"`, `"-3,7"` |
| Hook names | `module.eventName` | `fvtt-map-height.gridHeightChanged` |

### Bilingual Comments

**Pattern**: English JSDoc + Chinese inline comments
```javascript
/**
 * Calculate token grid position with padding support
 * @param {Token} token - The token to calculate position for
 * @returns {{x: number, y: number}} Grid coordinates
 */
getTokenGridPosition(token) {
  // 获取Token的像素坐标
  const pixelX = token.document.x;
  const pixelY = token.document.y;

  // 转换为网格坐标
  // Convert to grid coordinates
  return this.pixelToGrid(pixelX, pixelY);
}
```

### Data Validation Pattern

**Always validate before processing**:
```javascript
validateGridCoordinates(x, y) {
  return typeof x === 'number' &&
         typeof y === 'number' &&
         isFinite(x) && isFinite(y) &&
         x >= -10000 && x <= 10000 &&
         y >= -10000 && y <= 10000 &&
         Number.isInteger(x) && Number.isInteger(y);
}

validateHeight(height) {
  return typeof height === 'number' &&
         isFinite(height) &&
         height >= -1000 && height <= 1000;
}
```

### Error Handling

**Defensive Programming**:
```javascript
async setGridHeight(gridX, gridY, height) {
  // Guard clauses
  if (!canvas || !canvas.scene) {
    console.warn("Cannot set grid height: No active scene");
    return;
  }

  if (!this.validateGridCoordinates(gridX, gridY)) {
    console.error(`Invalid grid coordinates: ${gridX}, ${gridY}`);
    return;
  }

  if (!this.validateHeight(height)) {
    ui.notifications.error("Invalid height value");
    return;
  }

  try {
    // Main logic
    const key = `${gridX},${gridY}`;
    this.gridHeights.set(key, height);
    await this.saveData();

    ui.notifications.info("Height updated successfully");
  } catch (error) {
    console.error("Error setting grid height:", error);
    ui.notifications.error("Failed to update height");
  }
}
```

### Async/Await for Scene Operations

**All Scene flag updates must be async**:
```javascript
// CORRECT
async setGridHeight(gridX, gridY, height) {
  await canvas.scene.setFlag(MODULE_ID, `heightData.gridHeights.${key}`, height);
}

// INCORRECT - Missing await
setGridHeight(gridX, gridY, height) {
  canvas.scene.setFlag(MODULE_ID, `heightData.gridHeights.${key}`, height);
}
```

### Grid Coordinate System

**Critical Convention**: Grid keys are strings
```javascript
// CORRECT
const key = `${gridX},${gridY}`;
this.gridHeights.set(key, height);

// INCORRECT - Don't use objects as keys
this.gridHeights.set({x: gridX, y: gridY}, height);
```

**Grid Origin**: Top-left is (0, 0)
**Padding**: Calculated in grid units, not pixels
```javascript
const paddingGridsPerSide = Math.ceil((sceneWidth * padding) / gridSize);
const totalWidth = sceneWidth + 2 * paddingGridsPerSide * gridSize;
```

### Event Delegation Pattern

**ApplicationV2 uses `data-action` routing**:
```handlebars
<button data-action="select-brush" data-height="10">
  Select Brush
</button>
```

```javascript
_onClickAction(event) {
  const action = event.target.closest('[data-action]')?.dataset.action;

  switch (action) {
    case 'select-brush':
      return this._onSelectBrush(event);
    case 'toggle-edit-mode':
      return this._onToggleEditMode(event);
    // ...
  }
}
```

### Hook Usage

**Consuming Foundry Hooks**:
```javascript
Hooks.on('updateToken', this.onTokenUpdate.bind(this));
Hooks.on('canvasReady', this.onCanvasReady.bind(this));
```

**Firing Custom Hooks** (for extensibility):
```javascript
Hooks.callAll("fvtt-map-height.gridHeightChanged", {
  gridX,
  gridY,
  height,
  oldHeight,
  key: `${gridX},${gridY}`
});
```

**Available Custom Hooks**:
- `fvtt-map-height.gridHeightChanged`
- `fvtt-map-height.areaHeightChanged`
- `fvtt-map-height.tokenElevationUpdated`
- `fvtt-map-height.tokenExceptionAdded`
- `fvtt-map-height.tokenExceptionRemoved`
- `fvtt-map-height.dataImported`

---

## Common Tasks Guide

### Adding a New UI Feature

**Files to modify**: `sidebar-control.js`, `sidebar-control.hbs`, `map-height.css`

1. **Add to template** (`sidebar-control.hbs`):
```handlebars
<button data-action="new-feature" data-tooltip="My new feature">
  <i class="fas fa-icon"></i>
  Label
</button>
```

2. **Add context data** (`sidebar-control.js`):
```javascript
_prepareContext(options) {
  return {
    ...super._prepareContext(options),
    myNewData: this.calculateNewData()
  };
}
```

3. **Add event handler**:
```javascript
_onClickAction(event) {
  const action = event.target.closest('[data-action]')?.dataset.action;

  switch (action) {
    case 'new-feature':
      return this._onNewFeature(event);
    // ...
  }
}

async _onNewFeature(event) {
  // Implementation
  await this.render(); // Re-render if needed
}
```

4. **Add styles** (`map-height.css`):
```css
.map-height .new-feature-button {
  /* Styles */
}
```

5. **Add translations** (`lang/en.json`, `lang/cn.json`):
```json
{
  "MAP_HEIGHT": {
    "NewFeature": {
      "Name": "New Feature",
      "Hint": "Description"
    }
  }
}
```

### Modifying Data Structure

**Files to modify**: `height-manager.js`

1. **Update data structure**:
```javascript
_createDefaultData() {
  return {
    gridHeights: {},
    exceptTokens: [],
    enabled: true,
    myNewField: defaultValue,  // Add here
    version: "1.0.0",
    lastUpdated: Date.now()
  };
}
```

2. **Update load method**:
```javascript
async initialize(scene) {
  const data = scene.getFlag(MODULE_ID, "heightData") || {};
  this.myNewField = data.myNewField ?? defaultValue;
  // ...
}
```

3. **Update save method**:
```javascript
async saveData() {
  await canvas.scene.setFlag(MODULE_ID, "heightData", {
    gridHeights: Object.fromEntries(this.gridHeights),
    exceptTokens: Array.from(this.exceptTokens),
    myNewField: this.myNewField,  // Add here
    // ...
  });
}
```

4. **Add migration logic** (if needed):
```javascript
_migrateData(data) {
  if (!data.myNewField) {
    data.myNewField = defaultValue;
  }
  return data;
}
```

### Adding a New Canvas Visual

**Files to modify**: `height-overlay.js`

1. **Create PIXI element**:
```javascript
createCustomElement() {
  const container = new PIXI.Container();
  const graphics = new PIXI.Graphics();
  graphics.beginFill(0xFF0000);
  graphics.drawRect(0, 0, 50, 50);
  graphics.endFill();
  container.addChild(graphics);
  return container;
}
```

2. **Add to render cycle**:
```javascript
renderVisibleGrids() {
  // Existing grid rendering

  // Add custom elements
  this.renderCustomElements();
}
```

3. **Clean up on hide**:
```javascript
hide() {
  this.clearCustomElements();
  super.hide();
}
```

### Changing Token Automation Logic

**Files to modify**: `token-automation.js`

1. **Modify update logic**:
```javascript
async updateTokenElevation(tokenDocument) {
  if (!this.heightManager.isExceptionToken(tokenDocument.id)) {
    const gridPos = this.heightManager.getTokenGridPosition(tokenDocument.object);
    let height = this.heightManager.getGridHeight(gridPos.x, gridPos.y);

    // ADD CUSTOM LOGIC HERE
    height = this.applyCustomModifier(height, tokenDocument);

    if (tokenDocument.elevation !== height) {
      await tokenDocument.update({elevation: height});
    }
  }
}
```

2. **Add custom conditions**:
```javascript
shouldUpdateToken(tokenDocument) {
  // Custom conditions
  if (tokenDocument.actor?.type === 'flying') return false;
  return !this.heightManager.isExceptionToken(tokenDocument.id);
}
```

### Adding Debug Commands

**Files to modify**: `debug-helper.js`

1. **Add method to DebugHelper class**:
```javascript
testNewFeature() {
  console.group("New Feature Test");

  // Test logic
  const result = this.calculateSomething();
  console.log("Result:", result);

  console.groupEnd();
}
```

2. **Access in browser console**:
```javascript
debugMapHeight.testNewFeature();
```

---

## Critical Patterns to Follow

### 1. Always Use Async for Scene Flag Operations

```javascript
// CORRECT
async setGridHeight(gridX, gridY, height) {
  await canvas.scene.setFlag(MODULE_ID, key, value);
}

// INCORRECT
setGridHeight(gridX, gridY, height) {
  canvas.scene.setFlag(MODULE_ID, key, value); // Missing await
}
```

### 2. Fire Custom Hooks for Extensibility

Other modules may want to react to your changes:
```javascript
async setGridHeight(gridX, gridY, height) {
  const oldHeight = this.getGridHeight(gridX, gridY);

  // Update
  this.gridHeights.set(key, height);
  await this.saveData();

  // Fire hook for other modules
  Hooks.callAll("fvtt-map-height.gridHeightChanged", {
    gridX, gridY, height, oldHeight, key
  });
}
```

### 3. Validate All User Input

```javascript
async setGridHeight(gridX, gridY, height) {
  if (!this.validateGridCoordinates(gridX, gridY)) {
    console.error(`Invalid coordinates: ${gridX}, ${gridY}`);
    return;
  }

  if (!this.validateHeight(height)) {
    ui.notifications.error("Height must be between -1000 and 1000");
    return;
  }

  // Proceed with validated data
}
```

### 4. Guard Against Missing Canvas/Scene

Canvas may not be ready during initialization:
```javascript
updateVisuals() {
  if (!canvas || !canvas.scene || !canvas.grid) {
    console.warn("Canvas not ready");
    return;
  }

  // Safe to use canvas
}
```

### 5. Use Throttling for Frequent Operations

```javascript
class TokenAutomation {
  constructor() {
    this.updateQueue = new Set();
    this.processingQueue = false;
    this.THROTTLE_MS = 100;
  }

  queueTokenUpdate(tokenId) {
    this.updateQueue.add(tokenId);

    if (!this.processingQueue) {
      setTimeout(() => this.processUpdateQueue(), this.THROTTLE_MS);
    }
  }

  async processUpdateQueue() {
    this.processingQueue = true;

    for (const tokenId of this.updateQueue) {
      await this.updateTokenElevation(tokenId);
    }

    this.updateQueue.clear();
    this.processingQueue = false;
  }
}
```

### 6. Clean Up PIXI Elements

Prevent memory leaks:
```javascript
destroy() {
  // Remove event listeners
  this.removeEventListeners();

  // Destroy PIXI elements
  for (const [key, container] of this.gridElements) {
    container.destroy({ children: true });
  }
  this.gridElements.clear();

  // Remove from parent
  this.removeChild();
}
```

### 7. Maintain Bilingual Comments

```javascript
/**
 * Calculate grid position with padding support
 * 计算包含边距的网格位置
 */
getTokenGridPosition(token) {
  // 获取基础坐标 - Get base coordinates
  const x = token.document.x;
  const y = token.document.y;

  // 考虑场景边距 - Account for scene padding
  const gridPos = this.pixelToGrid(x, y);

  return gridPos;
}
```

### 8. Use Grid String Keys Consistently

```javascript
// CORRECT - String key
const key = `${gridX},${gridY}`;
const height = this.gridHeights.get(key);

// INCORRECT - Don't use separate variables
const height = this.gridHeights.get(gridX + "," + gridY);

// INCORRECT - Don't use objects
const height = this.gridHeights.get({x: gridX, y: gridY});
```

### 9. Handle Padding Correctly

Padding is **grid-based**, not pixel-based:
```javascript
updateGridParameters() {
  const scene = canvas.scene;
  const padding = scene.padding || 0;

  // Calculate padding in grid units
  const paddingGridsPerSide = Math.ceil(
    (scene.width * padding) / this.gridSize
  );

  // Total coverage includes padding
  this.totalGridWidth = Math.ceil(scene.width / this.gridSize) +
                        2 * paddingGridsPerSide;
}
```

### 10. Provide User Feedback

```javascript
async importData(data) {
  try {
    // Validate
    if (!this.validateImportData(data)) {
      ui.notifications.error("Invalid import data format");
      return false;
    }

    // Import
    await this.loadDataFromObject(data);

    // Success feedback
    ui.notifications.info("Height data imported successfully");
    return true;

  } catch (error) {
    console.error("Import error:", error);
    ui.notifications.error("Failed to import height data");
    return false;
  }
}
```

---

## Testing and Debugging

### Debug Mode

**Enable debug mode**:
- Add `?debug` to Foundry URL: `http://localhost:30000/game?debug`
- Or enable core debug setting in Foundry

**Debug commands** (available in browser console):
```javascript
// Show current scene info
debugMapHeight.showInfo()

// Test padding calculations
debugMapHeight.testPadding()

// Test coordinate conversions
debugMapHeight.testCoords()

// Test grid coverage
debugMapHeight.testCoverage()

// Access global state
window.MapHeightEditor.heightManager
window.MapHeightEditor.tokenAutomation
```

### Console Logging

The module uses extensive console logging:
```javascript
console.log("[Map Height] Module initialized");
console.warn("[Map Height] Canvas not ready");
console.error("[Map Height] Failed to save data:", error);
```

**To reduce verbosity**, comment out debug logs in production.

### Manual Testing Checklist

When making changes, test:

1. **Height Painting**
   - [ ] Single grid click works
   - [ ] Drag painting works
   - [ ] Custom height input works
   - [ ] Visual overlay updates

2. **Token Automation**
   - [ ] Tokens update on movement
   - [ ] Exception tokens ignore updates
   - [ ] Multiple tokens update correctly
   - [ ] Performance acceptable with many tokens

3. **Data Persistence**
   - [ ] Heights save on scene reload
   - [ ] Exception list persists
   - [ ] Import/export works
   - [ ] Settings save correctly

4. **UI Responsiveness**
   - [ ] Sidebar toggles work
   - [ ] Brush selection works
   - [ ] Statistics update
   - [ ] Exception list updates

5. **Edge Cases**
   - [ ] Scene with padding
   - [ ] Very large maps
   - [ ] Negative heights
   - [ ] Deleted tokens in exception list

### Performance Testing

Test with large scenes:
```javascript
// Generate test data
debugMapHeight.generateTestHeights(1000); // 1000 random heights

// Measure render performance
console.time("render");
window.MapHeightEditor.heightOverlay.renderVisibleGrids();
console.timeEnd("render");
```

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Heights not saving | Missing `await` on Scene.setFlag | Add `await` to all flag operations |
| Token elevation wrong | Grid calculation error | Use `updateGridParameters()` after scene changes |
| Overlay not rendering | Canvas not ready | Add `if (!canvas)` guard clauses |
| Memory leak | PIXI elements not destroyed | Call `destroy({ children: true })` |
| Drag painting broken | Event listener not cleaned up | Remove global listeners on drag end |
| Padding calculation wrong | Using pixels instead of grids | Convert padding to grid units first |

---

## Git Workflow

### Branch Strategy

Development happens on feature branches with pattern: `claude/claude-md-*`

**Current branch**: `claude/claude-md-mi8c6ufp06wwvkp4-01FWZu4qUqNCzHhvWzXWtTkW`

### Commit Message Style

Based on recent commits:
```
Implement grid parameter synchronization between HeightManager and HeightOverlay, including padding adjustments for accurate grid bounds calculation.

less log

padding

ui fix

ApplicationV2
```

**Pattern**: Descriptive messages, focus on what changed and why.

**Recommended format**:
```
<Type>: <Short description>

<Optional detailed explanation>
<Why this change was needed>
```

Types: feat, fix, refactor, docs, style, perf, test

### Committing Changes

**Only commit when user explicitly requests it.**

When asked to commit:

1. **Check status**:
```bash
git status
git diff
```

2. **Stage relevant files**:
```bash
git add scripts/modified-file.js
git add templates/sidebar-control.hbs
```

3. **Create commit with descriptive message**:
```bash
git commit -m "$(cat <<'EOF'
feat: Add new height visualization mode

- Implement contour line rendering
- Add color gradient option for heights
- Update UI with visualization mode selector
EOF
)"
```

4. **Push to feature branch**:
```bash
git push -u origin claude/claude-md-mi8c6ufp06wwvkp4-01FWZu4qUqNCzHhvWzXWtTkW
```

**Retry logic**: If push fails due to network, retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s).

### Never Push To Main

The main branch is protected. Always push to the designated feature branch.

---

## Additional Resources

### Foundry VTT API Documentation
- **Official Docs**: https://foundryvtt.com/api/
- **ApplicationV2 Guide**: https://foundryvtt.com/article/v2-applications/
- **Canvas Layers**: https://foundryvtt.com/api/CanvasLayer.html
- **Scene Flags**: https://foundryvtt.com/api/Scene.html

### PIXI.js Documentation
- **Official Docs**: https://pixijs.download/release/docs/index.html
- **Graphics API**: https://pixijs.download/release/docs/PIXI.Graphics.html
- **Text API**: https://pixijs.download/release/docs/PIXI.Text.html

### Module Development
- **Module Development Guide**: https://foundryvtt.com/article/module-development/
- **Hooks Reference**: https://foundryvtt.com/api/Hooks.html

---

## Quick Reference Cards

### File Change Checklist

When modifying code, check if you need to update:

- [ ] **Code** - The JavaScript implementation
- [ ] **Template** - The Handlebars UI template
- [ ] **Styles** - CSS for visual changes
- [ ] **Translations** - Both en.json and cn.json
- [ ] **Validation** - Input validation logic
- [ ] **Hooks** - Fire custom hooks for changes
- [ ] **Documentation** - Update this file if architecture changes
- [ ] **Debug** - Add debug commands if helpful

### Common Gotchas

1. Grid keys are **strings** `"x,y"`, not objects
2. Always `await` Scene.setFlag() operations
3. Check `if (!canvas || !canvas.scene)` before canvas operations
4. Padding is in **grid units**, not pixels
5. PIXI elements need manual `.destroy()` to prevent leaks
6. ApplicationV2 requires specific structure (DEFAULT_OPTIONS, PARTS)
7. Event listeners must be removed to prevent memory leaks
8. Token position during animation ≠ final position

### Performance Checklist

When optimizing:

- [ ] Use viewport culling for large areas
- [ ] Throttle frequent updates (100ms minimum)
- [ ] Reuse PIXI elements instead of recreating
- [ ] Use Set for deduplication (update queues)
- [ ] Batch Scene flag updates when possible
- [ ] Clean up event listeners and PIXI elements
- [ ] Profile with console.time() / console.timeEnd()

---

## Conclusion

This module is well-architected with clear separation of concerns:
- **Data layer** handles persistence
- **Logic layer** handles automation
- **Render layer** handles visualization
- **UI layer** handles user interaction

Follow the patterns established in the codebase, validate all inputs, handle errors gracefully, and maintain bilingual documentation.

**When in doubt**:
1. Check existing code for similar patterns
2. Use debug mode and console commands
3. Test with various map sizes and padding settings
4. Ensure backwards compatibility with existing save data

Happy coding! 🚀
