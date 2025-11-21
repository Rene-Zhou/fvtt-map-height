# Map Height Editor

A Foundry VTT module for editing map ground heights and automatically managing token elevations based on grid positions.

[中文文档](README_CN.md)

## Features

### Height Painting
- **Click and Paint**: Click on grid squares to set their height
- **Drag Painting**: Click and drag to paint multiple grid squares at once
- **Predefined Brushes**: Quick access to common height values (0, 5, 10)
- **Custom Heights**: Set any height value between -1000 and 1000
- **Visual Overlay**: Color-coded overlay showing height values on the map
  - Blue (#4FC3F7): Height 0 (water level)
  - Green (#81C784): Positive elevation
  - Red (#E57373): Negative elevation

### Automatic Token Elevation
- **Auto-Update**: Tokens automatically update their elevation when moving to different height grids
- **Multi-Grid Support**: Correctly handles tokens that occupy multiple grid squares
- **Exception List**: Manage flying units and other tokens that should ignore automatic height updates
- **Performance Optimized**: Throttled updates and viewport culling for smooth performance

### Data Management
- **Persistent Storage**: Height data is saved per-scene in Scene Flags
- **Import/Export**: Export height data to JSON files for backup and sharing
- **Clear All**: Reset all height data with a single click
- **Real-time Statistics**: Track grid coverage and height ranges

## Installation

### Method 1: Manifest URL
1. In Foundry VTT, go to **Add-on Modules**
2. Click **Install Module**
3. Paste the manifest URL: `https://github.com/your-username/fvtt-map-height/releases/latest/download/module.json`
4. Click **Install**

### Method 2: Manual Installation
1. Download the latest release from [Releases](https://github.com/your-username/fvtt-map-height/releases)
2. Extract the ZIP file to your Foundry `Data/modules` directory
3. Restart Foundry VTT
4. Enable the module in your world

## Requirements

- **Foundry VTT**: Version 12.343 or higher
- **Game System**: Any (system-agnostic)
- **Map Type**: Grid-based maps (square or hex grids)

## Usage

### Getting Started

1. **Activate the Module**
   - Enable "Map Height Editor" in your world's module settings
   - The module interface will appear in the sidebar (GM only)

2. **Enable Height Edit Mode**
   - Click the "Height Edit Mode" button to activate editing
   - The height overlay will appear on the canvas

3. **Paint Heights**
   - Select a brush height from the toolbar
   - Click on grid squares to set their height
   - Or click and drag to paint multiple squares

4. **Configure Auto-Updates**
   - Enable "Auto Update Token Heights" to automatically update token elevations
   - Add flying units to the exception list to prevent auto-updates

### Interface Overview

#### Height Brush Section
- **Predefined Brushes**: Quick access to heights 0, 5, and 10
- **Custom Height Input**: Enter any height value between -1000 and 1000
- **Current Brush Display**: Shows the currently selected brush value

#### Settings Section
- **Auto Update Token Heights**: Toggle automatic token elevation updates
- **Height Overlay Opacity**: Adjust the visibility of the height overlay (0-1)

#### Exception Management
- **Add Exception**: Add selected tokens to the flying units exception list
- **Remove Exception**: Remove tokens from the exception list
- **Exception List**: View all tokens that ignore auto-height updates

#### Data Management
- **Export Data**: Export height data to a JSON file
- **Import Data**: Import height data from a JSON file
- **Clear All**: Reset all height data (with confirmation)

### Advanced Features

#### Viewport Culling
The module automatically culls off-screen grid elements for optimal performance on large maps. Only visible grids (plus a 2-grid buffer) are rendered.

#### Padding Support
The module correctly handles scene padding settings, ensuring accurate grid positioning even with extended canvas areas.

#### Multi-Grid Tokens
Tokens that occupy multiple grid squares will use the height of their top-left grid position.

## Configuration

### Module Settings

#### Auto Update Token Heights
- **Type**: World Setting (affects all players)
- **Default**: Enabled
- **Description**: Automatically updates token elevations when they move to different height grids

#### Height Overlay Opacity
- **Type**: Client Setting (per-player)
- **Default**: 0.7
- **Range**: 0.0 (transparent) to 1.0 (opaque)
- **Description**: Controls the visibility of the height number overlay

#### Default Brush Height
- **Type**: Client Setting (per-player)
- **Default**: 0
- **Range**: -1000 to 1000
- **Description**: The default height value when the module is first activated

## Troubleshooting

### Heights not saving
- Ensure you have GM permissions
- Check that the scene is not locked
- Verify that the module is enabled for the current world

### Token elevations not updating
- Check that "Auto Update Token Heights" is enabled
- Verify the token is not in the exception list
- Ensure the token has moved to a different grid square

### Overlay not visible
- Check the "Height Overlay Opacity" setting
- Ensure "Height Edit Mode" is activated
- Verify that the canvas layer is not hidden

### Performance issues on large maps
- The module uses viewport culling to optimize performance
- Only visible grids are rendered, so performance should remain smooth
- If issues persist, try reducing the overlay opacity or disabling the overlay when not editing

## Development

### Project Structure
```
fvtt-map-height/
├── module.json                  # Module manifest
├── CLAUDE.md                    # AI assistant development guide
├── README.md                    # This file
├── README_CN.md                 # Chinese documentation
├── scripts/
│   ├── main.js                 # Module entry point
│   ├── height-manager.js       # Core data management
│   ├── token-automation.js     # Token elevation automation
│   ├── debug-helper.js         # Development utilities
│   └── ui/
│       ├── sidebar-control.js  # ApplicationV2 UI
│       ├── height-overlay.js   # PIXI canvas overlay
│       └── height-layer.js     # Canvas interaction layer
├── templates/
│   └── sidebar-control.hbs     # Handlebars UI template
├── styles/
│   └── map-height.css          # Module styles
└── lang/
    ├── en.json                 # English translations
    └── cn.json                 # Chinese translations
```

### Architecture
The module follows a four-layer architecture:
1. **UI Control Layer** - User interactions and controls
2. **Rendering Layer** - PIXI visualization and viewport culling
3. **Logic Layer** - Token tracking and business logic
4. **Data Storage Layer** - Scene flags and grid calculations

For detailed development documentation, see [CLAUDE.md](CLAUDE.md).

### Building and Testing

This module uses **pure ES6 modules** with no build process:
- No transpilation or bundling required
- Hot reload enabled for CSS, templates, and JSON files
- Direct browser loading of ES modules

To develop:
1. Create a symlink in your Foundry modules directory
2. Enable the module in Foundry
3. Enable debug mode by adding `?debug` to the URL
4. Use the browser console for debug commands (`debugMapHeight.*`)

## API for Developers

### Custom Hooks

The module fires custom hooks that other modules can listen to:

```javascript
// Fired when a grid height is changed
Hooks.on("fvtt-map-height.gridHeightChanged", ({gridX, gridY, height, oldHeight, key}) => {
  console.log(`Grid (${gridX}, ${gridY}) changed from ${oldHeight} to ${height}`);
});

// Fired when a token's elevation is automatically updated
Hooks.on("fvtt-map-height.tokenElevationUpdated", ({tokenDocument, oldElevation, newElevation}) => {
  console.log(`Token ${tokenDocument.name} elevation changed from ${oldElevation} to ${newElevation}`);
});

// Fired when a token is added to the exception list
Hooks.on("fvtt-map-height.tokenExceptionAdded", ({tokenId}) => {
  console.log(`Token ${tokenId} added to exception list`);
});

// Fired when a token is removed from the exception list
Hooks.on("fvtt-map-height.tokenExceptionRemoved", ({tokenId}) => {
  console.log(`Token ${tokenId} removed from exception list`);
});

// Fired when height data is imported
Hooks.on("fvtt-map-height.dataImported", ({scene, data}) => {
  console.log(`Height data imported for scene ${scene.name}`);
});
```

### Accessing Module API

```javascript
// Access the HeightManager
const heightManager = window.MapHeightEditor.heightManager;

// Get height of a specific grid
const height = heightManager.getGridHeight(10, 5);

// Set height of a specific grid (GM only)
await heightManager.setGridHeight(10, 5, 15);

// Check if a token is in the exception list
const isException = heightManager.isExceptionToken(token.id);

// Export height data
const data = heightManager.exportData();

// Import height data
await heightManager.importData(data);
```

## License

This module is licensed under the [MIT License](LICENSE).

## Credits

- **Developer**: Map Height Editor Developer
- **Foundry VTT**: [https://foundryvtt.com](https://foundryvtt.com)
- **PIXI.js**: [https://pixijs.com](https://pixijs.com)

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/fvtt-map-height/issues)
- **Discord**: developer#0000

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

**Note**: This module is designed for Foundry VTT v12.343+. It uses the modern ApplicationV2 framework and may not be compatible with earlier versions of Foundry VTT.
