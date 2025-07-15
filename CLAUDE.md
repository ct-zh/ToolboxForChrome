# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Guidelines
**IMPORTANT**: Before starting any work, read the `GEMINI.md` file for specific development rules and guidelines that must be followed during conversations.

## Project Overview
DevToolkit is a Chrome extension that provides various developer tools including timestamp conversion, QR code generation, URL encoding/decoding, and API testing functionality.

## Project Structure
- `manifest.json`: Chrome extension manifest (v3)
- `popup/`: Main popup interface
  - `popup.html`: Main entry point with navigation buttons
  - `popup.js`: Navigation logic and page loading
- Individual tool pages at root level:
  - `timestamp.html/js`: Timestamp conversion tool
  - `qrcode.html/js`: QR code generation tool
  - `urlEncoderDecoder.html/js`: URL encoding/decoding tool
  - `apiTester.html/js`: API testing tool (opens in new tab)
- `navbar.html/js`: Shared navigation component with home button
- `js/qrcode.min.js`: Third-party QR code library
- `icons/`: Extension icons (16px, 48px, 128px)

## Development Commands
This project uses vanilla JavaScript with no build system. Based on README.md, the following npm commands are referenced but no package.json exists:

```bash
# Install dependencies (if package.json exists)
npm install

# Development mode (not currently implemented)
npm run dev

# Build production version (not currently implemented)
npm run build
```

## Architecture
The extension uses a modular architecture:

1. **Main Popup**: `popup/popup.html` serves as the main interface with navigation buttons
2. **iframe Navigation**: Each tool loads in an iframe within the popup for isolation
3. **Shared Navigation**: `navbar.html` provides consistent navigation across tools
4. **Message Passing**: Uses `window.postMessage` for communication between parent and iframe
5. **State Persistence**: Uses `chrome.storage.local` to remember last opened page
6. **Tab Creation**: API Tester opens in a new tab via `chrome.tabs.create()`

## Key Features
- Timestamp conversion (completed)
- QR code generation (completed)
- URL encoding/decoding (completed)
- API testing with dynamic key-value pairs (completed)
- Planned: JSON formatting, Base64 conversion, SQL formatting, and more

## Chrome Extension Permissions
- `clipboardWrite`: For copying results to clipboard
- `clipboardRead`: For reading clipboard content
- `storage`: For persisting user preferences and state

## Installation
Load as unpacked extension in Chrome Developer Mode from the project root directory.