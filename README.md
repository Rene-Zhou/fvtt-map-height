# Map Height Editor

A Foundry VTT module for editing map ground heights and automatically managing token elevations based on grid positions.

[中文文档](README_CN.md)

## Installation

### Method 1: Manifest URL
1. In Foundry VTT, go to **Add-on Modules**
2. Click **Install Module**
3. Paste the manifest URL: `https://github.com/Rene-Zhou/fvtt-map-height/releases/latest/download/module.json`
4. Click **Install**

### Method 2: Manual Installation
1. Download the latest release from the [Releases Page](https://github.com/Rene-Zhou/fvtt-map-height/releases)
2. Extract the ZIP file to your Foundry `Data/modules` directory
3. Restart Foundry VTT
4. Enable the module in your world

## System Requirements

- **Foundry VTT**: Version 12.343 or higher
- **Game System**: dnd5e
- **Map Type**: Grid-based maps (square grids)

## Usage

### Getting Started

1. **Activate Module**
   - Enable "Map Height Editor" in your world's module settings
   - The module interface will appear in the sidebar (GM only)

2. **Enable Height Edit Mode**
   - Click the "Height Edit Mode" button to activate editing
   - The height overlay will appear on the canvas

3. **Paint Heights**
   - Adjust brush height via keyboard shortcuts:
      - ↑/↓: ±10
      - ←/→: ±5
      - +/-: ±1
      - 0: Set to 0
   - Click a grid square to set its height
   - Or click and drag to paint multiple squares
   - **Rectangle Fill**: Hold Shift and click two grid corners to fill a rectangular area
     - First Shift+Click selects the starting vertex (highlighted in red)
     - Second Shift+Click fills the entire rectangle
     - Hover over the grid to see the yellow preview area
     - Press ESC to cancel selection

4. **Configure Auto Update**
   - Enable "Auto Update Token Heights" to automatically update token elevation values
   - Units with flying status will not be automatically updated

## Configuration

### Module Settings

#### Auto Update Token Heights
- **Type**: World Setting (affects all players)
- **Default**: Enabled
- **Description**: Automatically updates token elevations when they move to different height grids

#### Height Overlay Opacity
- **Type**: Client Setting (per player)
- **Default**: 0.8
- **Range**: 0.0 (transparent) to 1.0 (opaque)
- **Description**: Controls the visibility of the height number overlay
