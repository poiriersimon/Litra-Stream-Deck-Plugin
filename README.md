# Litra Stream Deck Plugin

A Stream Deck plugin to control Logitech Litra Glow and Litra Beam lights directly from your Stream Deck.

## Features

This plugin has been converted from the PowerShell script (LitraScript.ps1) and provides six actions with extensive customization:

### 1. Control Litra
- Unified control for any Litra light (Beam or Glow)
- Select individual light from dropdown or control all at once
- Configure brightness and temperature settings
- Settings apply when toggling lights on
- **Visual State Feedback**: Key background changes to show on/off state
- **Device Name Display**: Shows selected device name on key (e.g., "Beam #1" or "Glow #1")
- **No Device Indicator**: Displays red ❌ when no devices are connected
- Button displays: Device name with "On"/"Off" state, or "All On"/"All Off"

### 2. Toggle All Lights
- Turns all connected Litra lights (both Glow and Beam) on or off
- Configure brightness and temperature settings
- Settings apply when toggling lights on
- **No Device Indicator**: Displays red ❌ when no devices are connected
- Button displays current state: "All On" or "All Off"

### 3. Increase Brightness
- Incrementally increase brightness of selected lights
- Configure step size (1-50%, default 10%)
- Select device type (All/Glow/Beam) and specific device
- **No Device Indicator**: Displays red ❌ when no devices are connected
- Button displays: "+10%" (or configured step)

### 4. Decrease Brightness
- Incrementally decrease brightness of selected lights
- Configure step size (1-50%, default 10%)
- Select device type (All/Glow/Beam) and specific device
- **No Device Indicator**: Displays red ❌ when no devices are connected
- Button displays: "-10%" (or configured step)

### 5. Increase Temperature
- Incrementally increase color temperature (warmer)
- Configure step size (100-1000K, default 100K)
- Select device type (All/Glow/Beam) and specific device
- Range: 2700K - 6500K
- **No Device Indicator**: Displays red ❌ when no devices are connected
- Button displays: "+100K" (or configured step)

### 6. Decrease Temperature
- Incrementally decrease color temperature (cooler)
- Configure step size (100-1000K, default 100K)
- Select device type (All/Glow/Beam) and specific device
- Range: 2700K - 6500K
- **No Device Indicator**: Displays red ❌ when no devices are connected
- Button displays: "-100K" (or configured step)

## Technical Details

The plugin communicates with Litra lights using the HID (Human Interface Device) protocol through the `node-hid` package, replicating the functionality of the original PowerShell https://gist.github.com/poiriersimon/eaee208ce8ea79f30b4cc7d3a078c3bc script that used `hidapitester.exe`.

### Supported Devices
- **Litra Glow**: VID 046d, PID c900
- **Litra Beam**: VID 046d, PID c901

### Commands Replicated from PowerShell
- `Get-LitraLight` → `LitraController.getLitraLights()`
- `Start-LitraLight` → `LitraController.turnOn()`
- `Stop-LitraLight` → `LitraController.turnOff()`
- `Set-LitraLight` → `LitraController.setBrightness()` and `LitraController.setTemperature()`

## Building the Plugin

```bash
cd litra-stream-deck-plugin
npm install
npm run build
```

## Installing the Plugin

After building, the plugin will be in the `com.simon-poirier.litra-stream-deck-plugin.sdPlugin` folder. You can install it by:

1. Double-clicking the `.sdPlugin` folder
2. Or using: `streamdeck install com.simon-poirier.litra-stream-deck-plugin.sdPlugin`

## Development

To develop with live reload:

```bash
npm run watch
```

This will automatically rebuild and restart the plugin when you make changes.

## Dependencies

- `@elgato/streamdeck`: Stream Deck SDK
- `node-hid`: HID device communication library

## Configuration

Each action has a Property Inspector (settings panel) accessible by long-pressing the action in Stream Deck:

### Control Litra & Toggle All Lights
- **Device**: Select "All" or a specific light from dropdown (Control Litra only)
- **Brightness**: Set brightness level (1-100%)
- **Temperature**: Set color temperature (2700-6500K)
- **Apply on Toggle On**: Enable/disable automatic application of brightness/temperature settings

### Brightness/Temperature Adjustment Actions
- **Device Type**: Choose All Lights, Glow Only, or Beam Only
- **Device**: Select "All" or a specific light within the chosen type
- **Step**: Configure increment/decrement amount

## Notes

- All lights can be controlled independently or all together
- Individual device selection is automatically populated based on connected devices
- **Visual State Feedback**: Control Litra action shows different background images for on/off states
- **Device Name Display**: Selected device name is shown on the key with simplified naming (e.g., "Beam #1" instead of "Litra Beam #1")
- **Connection Status**: All actions display a red ❌ when no devices are connected
- **Top-Aligned Text**: All key text is aligned to the top for better visibility
- Brightness and temperature states are tracked per device for adjustment actions
