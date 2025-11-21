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
  - Blue: Height 0 (water level)
  - Green: Positive elevation
  - Red: Negative elevation

### Automatic Token Elevation
- **Auto-Update**: Tokens automatically update their elevation when moving to different height grids
- **Multi-Grid Support**: Correctly handles tokens that occupy multiple grid squares
- **Exception List**: Manage flying units and other tokens that should ignore automatic height updates

### Data Management
- **Persistent Storage**: Height data is saved per-scene in Scene Flags
- **Import/Export**: Export height data to JSON files for backup and sharing
- **Clear All**: Reset all height data with a single click

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
