import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { LitraController, LitraDeviceType } from "../litra-controller";

/**
 * Action to control any Litra light (Beam or Glow)
 */
@action({ UUID: "com.simon-poirier.litra-stream-deck-plugin.control-litra" })
export class ControlLitra extends SingletonAction<ControlLitraSettings> {
    /**
     * Update the button appearance when it becomes visible
     */
    override async onWillAppear(ev: WillAppearEvent<ControlLitraSettings>): Promise<void> {
        await this.updateButtonAppearance(ev.action, ev.payload.settings);
    }

    /**
     * Update button appearance based on settings
     */
    private async updateButtonAppearance(action: any, settings: ControlLitraSettings): Promise<void> {
        const devicePath = settings.devicePath || 'all';
        
        // Check if any devices are connected
        let hasDevices = false;
        if (devicePath === 'all') {
            const allDevices = [
                ...LitraController.getLitraLights(LitraDeviceType.Beam),
                ...LitraController.getLitraLights(LitraDeviceType.Glow)
            ];
            hasDevices = allDevices.length > 0;
        } else {
            const beamDevice = LitraController.getDeviceByPath(devicePath, LitraDeviceType.Beam);
            const glowDevice = LitraController.getDeviceByPath(devicePath, LitraDeviceType.Glow);
            hasDevices = !!(beamDevice || glowDevice);
        }
        
        // If no devices, show red X
        if (!hasDevices) {
            if ('setState' in action) {
                await action.setState(0);
            }
            await action.setTitle("\n❌");
            return;
        }
        
        const isOn = settings.isOn ?? false;
        
        // Set the state (0 = off, 1 = on) - only works for KeyAction
        if ('setState' in action) {
            await action.setState(isOn ? 1 : 0);
        }
        
        // Set title based on device selection
        if (devicePath === 'all') {
            await action.setTitle(isOn ? "\nAll On" : "\nAll Off");
        } else if (settings.deviceName) {
            // Use stored device name with state
            await action.setTitle(`\n${settings.deviceName}\n${isOn ? 'On' : 'Off'}`);
        } else {
            // Fallback if no device name stored
            await action.setTitle(isOn ? "\nOn" : "\nOff");
        }
    }

    /**
     * Toggle Litra lights when the button is pressed
     */
    override async onKeyDown(ev: KeyDownEvent<ControlLitraSettings>): Promise<void> {
        const { settings } = ev.payload;
        const currentState = settings.isOn ?? false;
        const newState = !currentState;
        const devicePath = settings.devicePath || 'all';

        console.log(`[ControlLitra] Button pressed, current state: ${currentState}, new state: ${newState}, device: ${devicePath}`);

        try {
            let devices: any[] = [];

            // Get devices based on selection
            if (devicePath === 'all') {
                // Get all Beam and Glow lights
                devices = [
                    ...LitraController.getLitraLights(LitraDeviceType.Beam),
                    ...LitraController.getLitraLights(LitraDeviceType.Glow)
                ];
            } else {
                // Try to find specific device in both types
                const beamDevice = LitraController.getDeviceByPath(devicePath, LitraDeviceType.Beam);
                const glowDevice = LitraController.getDeviceByPath(devicePath, LitraDeviceType.Glow);
                const selectedDevice = beamDevice || glowDevice;
                devices = selectedDevice ? [selectedDevice] : [];
            }

            if (devices.length === 0) {
                console.error('[ControlLitra] No Litra lights found');
                await ev.action.showAlert();
                return;
            }

            let count = 0;
            if (newState) {
                // Turn lights on
                for (const device of devices) {
                    if (LitraController.turnOn(device)) {
                        count++;
                        
                        // Apply brightness and temperature if configured
                        if (settings.applyOnToggle !== false) {
                            const brightness = settings.brightness || 100;
                            LitraController.setBrightness(device, brightness);
                            
                            if (settings.temperature) {
                                LitraController.setTemperature(device, settings.temperature);
                            }
                        }
                    }
                }
                
                // Update state and title
                settings.isOn = true;
                await this.updateButtonAppearance(ev.action, settings);
                await ev.action.showOk();
            } else {
                // Turn lights off
                for (const device of devices) {
                    if (LitraController.turnOff(device)) {
                        count++;
                    }
                }
                
                // Update state and title
                settings.isOn = false;
                await this.updateButtonAppearance(ev.action, settings);
                await ev.action.showOk();
            }

            // Update and save the settings
            await ev.action.setSettings(settings);

            // Log the result
            console.log(`Toggled ${count} Litra lights ${newState ? 'on' : 'off'}`);
        } catch (error) {
            console.error('[ControlLitra] Error toggling lights:', error);
            await ev.action.showAlert();
        }
    }
}

/**
 * Settings for {@link ControlLitra}.
 */
type ControlLitraSettings = {
    devicePath?: string;
    deviceName?: string;
    isOn?: boolean;
    brightness?: number;
    temperature?: number;
    applyOnToggle?: boolean;
};
