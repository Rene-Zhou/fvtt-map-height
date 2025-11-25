# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - TBD

### Added
- GitHub Actions workflow for automated releases
- CHANGELOG.md for tracking version changes

### Changed
- Updated module.json URLs to point to correct GitHub repository

## [1.0.0] - 2024

### Added
- Initial release of Map Height Editor module
- One-click activation through scene controls
- Canvas brush display with draggable, floating window
- Keyboard shortcuts for height adjustment (Arrow keys, +/-, 0)
- Click and drag height painting on grid squares
- Rectangle fill mode (Shift+click two corners)
- Automatic token elevation updates based on grid position
- Automatic flying detection for D&D 5e (fly speed, active effects, token status)
- PIXI-based canvas overlay with color-coded height visualization
  - Blue (#4FC3F7): Height 0 (water level)
  - Green (#81C784): Positive elevation
  - Red (#E57373): Negative elevation
- Data management (import/export/clear) through settings dialog
- Exception token list to exclude specific tokens from auto-updates
- Viewport culling for performance optimization
- Support for grid padding
- Bilingual support (English and Chinese/中文)
- Persistent per-scene data storage using Scene flags
- Debug mode with helper commands

### Features
- Layer-based edit mode integrated with Foundry's canvas layer system
- Handlebars templates for data management UI
- Comprehensive keyboard shortcuts
- Visual feedback with pulse animations
- Color-coded height display
- Quick adjustment buttons (+1, 0, -1)
- ESC key to cancel rectangle selection
- Yellow preview rectangle during rectangle mode
- Red highlight for first corner selection

### Technical
- Pure ES6 Modules (no build process required)
- Compatible with Foundry VTT v12.343+
- PIXI.js-based rendering engine
- ApplicationV2 framework integration
- Hot reload support for development

[Unreleased]: https://github.com/Rene-Zhou/fvtt-map-height/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/Rene-Zhou/fvtt-map-height/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Rene-Zhou/fvtt-map-height/releases/tag/v1.0.0
