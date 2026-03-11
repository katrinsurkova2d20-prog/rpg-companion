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

## Recent Changes (March 11, 2026)
- **Fixed Critical Bug**: Corrected skills counting system - extra skills from origins/traits no longer incorrectly increase main selectable skills limit (stays at 3)
- **Implemented Intensive Training Perk System**: Complete temporary attribute allocation system with validation
- **Fixed PerkSelectModal**: Resolved duplicate selections and missing confirmation button
- **Major Refactor**: Separated main skills (max 3) from extra skills using new extraTaggedSkills state
- **Added Character Name Input**: New field at top of Character Screen for naming personage with save button
- **Auto-Save Logic**: Once name is saved, all other fields become active; until name is saved, all other options remain disabled/greyed out
- BASE_TAGGED_SKILLS constant properly exported and used throughout application

## Development Setup
- **Port**: 5000 (web development server)
- **Workflow**: Expo Web Server
- **Command**: `npx expo start --web --port 5000`
- **Environment**: Replit NixOS with Node.js 20

## Dependencies (Current Working Configuration)
- expo: ~53.0.22 
- react: 19.0.0
- react-native: 0.79.6 (minor version mismatch warning with SDK 53)
- react-native-paper: 4.9.2
- @react-navigation/native & material-top-tabs (using wildcard versions)
- expo-asset, expo-font, react-dom, react-native-web

## Production Setup
- **Build Scripts**: Added `npm run build` (expo export --platform web) and `npm run serve`
- **Static Serving**: Uses serve package for production-ready static file serving
- **Deployment**: Can be configured for static web hosting

## Completed Features (March 11, 2026 Session)
- ✅ Character naming system with validation (requires at least 1 character)
- ✅ Skills counting bug fixed - proper separation of main (3) vs extra skills
- ✅ Intensive Training perk temporary attribute allocation
- ✅ Form state gating - name must be saved before other fields accessible
- ✅ PerkSelectModal improvements

## Planned Features (Future)
- Character save/load system (saving to components/chars directory)
- Character manager startup screen with grid layout
- Character thumbnails display on startup screen
- Real-time character file updates

## Known Issues & Future Improvements
- Minor React text node warning (doesn't affect functionality)
- Navigation packages use wildcard versions (should be pinned for production)
- Consider updating to exact Expo SDK 53 dependency versions
- Shadow props deprecation warnings (cosmetic)

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