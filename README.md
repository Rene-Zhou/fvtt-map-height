# Map Height Editor

A Foundry VTT module for editing map ground heights and automatically managing token elevations based on grid positions.

[中文文档](README_CN.md)

## Features

### Streamlined UI/UX
- **One-Click Activation**: Click the Map Height Editor button in scene controls to activate edit mode
- **Canvas Brush Display**: Floating, draggable window showing current brush height
  - Color-coded display (blue/green/red matching overlay colors)
  - Quick adjustment buttons (+1, 0, -1)
  - Persistent position across sessions
- **Keyboard Shortcuts**: Adjust brush height without clicking
  - Arrow Up/Down: ±10
  - Arrow Left/Right: ±5
  - Plus/Minus: ±1
  - 0: Set to zero
- **Automatic Layer Switching**: Edit mode automatically deactivates when switching to other tools

### Height Painting
- **Click and Paint**: Click on grid squares to set their height
- **Drag Painting**: Click and drag to paint multiple grid squares at once
- **Visual Overlay**: Color-coded overlay showing height values on the map
  - Blue: Height 0 (water level)
  - Green: Positive elevation
  - Red: Negative elevation
- **Real-time Updates**: Height changes immediately reflected in the overlay

### Automatic Token Elevation
- **Auto-Update**: Tokens automatically update their elevation when moving to different height grids
- **Multi-Grid Support**: Correctly handles tokens that occupy multiple grid squares
- **Automatic Flying Detection**: Tokens with flying status/movement are automatically excluded
  - Detects D&D 5e fly speed
  - Detects active effects with "fly", "flying", "hover", "levitate" in label
  - Detects token status effects
- **Manual Exception List**: Still available for edge cases

### Data Management
- **Persistent Storage**: Height data is saved per-scene in Scene Flags
- **Import/Export**: Export height data to JSON files for backup and sharing
- **Clear All**: Reset all height data with a single click
- **Settings Menu Integration**: All data management accessible from module settings

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
- **Map Type**: Grid-based maps (square grids)

## Usage

### Getting Started

1. **Activate the Module**
   - Enable "Map Height Editor" in your world's module settings
   - The Map Height Editor button will appear in the scene controls (GM only)

2. **Enter Edit Mode**
   - Click the **Map Height Editor** button (mountain icon) in the left scene controls
   - The height overlay and brush display window will appear automatically

3. **Adjust Brush Height**
   - Use the **+/0/-** buttons in the brush display window
   - Or use **keyboard shortcuts** (arrow keys, +/-, 0)
   - The current height is shown in the floating window with color coding

4. **Paint Heights**
   - Click on grid squares to set their height
   - Or click and drag to paint multiple squares at once
   - The height overlay updates in real-time

5. **Exit Edit Mode**
   - Click the **×** button in the brush display window
   - Or click any other scene control (tokens, walls, etc.)
   - Edit mode will automatically deactivate

### Data Management

Access data management tools from **Module Settings → Manage Height Data**:
- **Export Data**: Save current scene's height data to JSON file
- **Import Data**: Load height data from JSON file
- **Clear All**: Reset all heights for current scene

## Configuration

### Module Settings

#### Auto Update Token Heights
- **Type**: World Setting (affects all players)
- **Default**: Enabled
- **Description**: Automatically updates token elevations when they move to different height grids

#### Height Overlay Opacity
- **Type**: Client Setting (per-player)
- **Default**: 0.8
- **Range**: 0.0 (transparent) to 1.0 (opaque)
- **Description**: Controls the visibility of the height number overlay

#### Show Brush Display
- **Type**: Client Setting (per-player)
- **Default**: Enabled
- **Description**: Show the floating brush height display when in edit mode

#### Enable Keyboard Shortcuts
- **Type**: Client Setting (per-player)
- **Default**: Enabled
- **Description**: Enable keyboard shortcuts for adjusting brush height (Arrow keys, +/-, 0)

#### Data Management
- **Type**: World Setting (GM only)
- **Description**: Opens dialog for importing, exporting, or clearing height data
