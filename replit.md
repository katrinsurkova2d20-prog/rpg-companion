# Fallout Character Sheet App

## Overview
This is a React Native Expo application that serves as a character sheet companion for Fallout RPG. The app provides a comprehensive interface for managing character stats, equipment, inventory, and perks in a Fallout-themed UI.

## Project Architecture
- **Framework**: React Native with Expo SDK 53.0.0
- **UI Library**: React Native Paper, React Navigation
- **Platform**: Cross-platform (Web, iOS, Android)
- **Language**: JavaScript with Russian localization
- **Assets**: JSON data files for equipment, perks, origins, and random loot

## Key Features
- Character creation and management
- Equipment and weapon tracking
- Inventory management
- Perks and traits system
- Multiple character origins (Vault Dweller, Brotherhood, NCR, etc.)
- Random loot generation
- Russian language interface

## Project Structure
```
├── components/
│   ├── screens/           # Main application screens
│   │   ├── CharacterScreen/
│   │   ├── InventoryScreen/
│   │   ├── PerksAndTraitsScreen/
│   │   └── WeaponsAndArmorScreen/
│   └── CharacterContext.js
├── assets/               # Images and data files
│   ├── Equipment/        # Weapons, armor, items JSON data
│   ├── origins/          # Character origin images
│   ├── Perks/           # Perks data
│   └── RandomLoot/      # Loot tables
├── App.js               # Main app component
├── index.js             # Entry point
└── package.json         # Dependencies
```

## Recent Changes (December 12, 2025)
- Successfully imported from GitHub
- Installed all required dependencies including expo-asset, react-dom, react-native-web
- Configured for Replit environment
- Set up Expo web server on port 5000
- Configured deployment for production (autoscale)
- Application is fully functional and tested

## Development Setup
- **Port**: 5000 (web development server)
- **Workflow**: Expo Web Server
- **Command**: `npx expo start --web --port 5000`
- **Environment**: Replit NixOS with Node.js 20

## Dependencies
- expo: ~53.0.22
- react: 19.0.0
- react-native: 0.79.6
- react-native-paper: 4.9.2
- @react-navigation/native & material-top-tabs
- expo-asset, react-dom, react-native-web (for web support)

## Deployment Configuration
- **Target**: Autoscale (for stateless web application)
- **Production Command**: `npx expo start --web --port 5000 --no-dev --host 0.0.0.0`
- **Build**: Not required (Expo handles bundling)

## User Preferences
- Russian language interface
- Fallout-themed dark UI with yellow accents
- Tab-based navigation (Character, Equipment, Inventory, Perks)
- Mobile-first design that works on web

## Notes
- Application successfully loads and displays character management interface
- All navigation tabs functional
- Asset loading working correctly
- Minor warnings in console (shadow props deprecation) but no critical errors