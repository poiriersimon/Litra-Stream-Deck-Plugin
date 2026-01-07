import { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { LitraController, LitraDeviceType } from "../litra-controller";

/**
 * Action to control any Litra light (Beam or Glow)
 */
@action({ UUID: "com.simon-poirier.litra-stream-deck-plugin.control-litra" })
export class ControlLitra extends SingletonAction<ControlLitraSettings> {
    private statusPollIntervals: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Update the button appearance when it becomes visible
     */
    override async onWillAppear(ev: WillAppearEvent<ControlLitraSettings>): Promise<void> {
        await this.updateButtonAppearance(ev.action, ev.payload.settings);
        
        // Start polling status every minute
        this.startStatusPolling(ev.action, ev.payload.settings);
    }

    /**
     * Clean up when button disappears
     */
    override async onWillDisappear(ev: WillDisappearEvent<ControlLitraSettings>): Promise<void> {
        this.stopStatusPolling(ev.action.id);
    }

    /**
     * Start polling device status every minute
     */
    private startStatusPolling(action: any, settings: ControlLitraSettings): void {
        // Clear any existing interval for this action
        this.stopStatusPolling(action.id);
        
        // Poll every 60 seconds (1 minute)
        const interval = setInterval(async () => {
            console.log(`[ControlLitra] Polling status for action ${action.id}`);
            await this.updateButtonAppearance(action, settings);
        }, 60000);
        
        this.statusPollIntervals.set(action.id, interval);
        console.log(`[ControlLitra] Started status polling for action ${action.id}`);
    }

    /**
     * Stop polling device status
     */
    private stopStatusPolling(actionId: string): void {
        const interval = this.statusPollIntervals.get(actionId);
        if (interval) {
            clearInterval(interval);
            this.statusPollIntervals.delete(actionId);
            console.log(`[ControlLitra] Stopped status polling for action ${actionId}`);
        }
    }

    /**
     * Update button appearance based on settings
     */
    private async updateButtonAppearance(action: any, settings: ControlLitraSettings): Promise<void> {
        const devicePath = settings.devicePath || 'all';
        
        // Check if any devices are connected
        let hasDevices = false;
        let actualDeviceState: boolean | null = null;
        
        if (devicePath === 'all') {
            const allDevices = [
                ...LitraController.getLitraLights(LitraDeviceType.Beam),
                ...LitraController.getLitraLights(LitraDeviceType.Glow)
            ];
            hasDevices = allDevices.length > 0;
            
            // For "all" mode: check ALL devices and only show ON if ALL are on
            if (hasDevices && allDevices.length > 0) {
                let allOn = true;
                for (const device of allDevices) {
                    const deviceState = LitraController.isOn(device);
                    if (deviceState === false) {
                        allOn = false;
                        break;
                    } else if (deviceState === null) {
                        // If we can't query a device, assume it's off
                        allOn = false;
                        break;
                    }
                }
                actualDeviceState = allOn;
                console.log(`[ControlLitra] All devices state check: ${allDevices.length} devices, all on: ${allOn}`);
            }
        } else {
            const beamDevice = LitraController.getDeviceByPath(devicePath, LitraDeviceType.Beam);
            const glowDevice = LitraController.getDeviceByPath(devicePath, LitraDeviceType.Glow);
            const selectedDevice = beamDevice || glowDevice;
            hasDevices = !!selectedDevice;
            
            // Query the actual state of the selected device
            if (selectedDevice) {
                actualDeviceState = LitraController.isOn(selectedDevice);
            }
        }
        
        // If no devices, show red X
        if (!hasDevices) {
            if ('setState' in action) {
                await action.setState(0);
            }
            await action.setTitle("\n❌");
            return;
        }
        
        // Use actual device state if available, otherwise fall back to stored state
        const isOn = actualDeviceState !== null ? actualDeviceState : (settings.isOn ?? false);
        
        // Update stored state if we successfully queried the device
        let needsSettingsSave = false;
        if (actualDeviceState !== null && settings.isOn !== actualDeviceState) {
            console.log(`[ControlLitra] Syncing stored state from ${settings.isOn} to actual device state: ${actualDeviceState}`);
            settings.isOn = actualDeviceState;
            needsSettingsSave = true;
        }
        
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
        
        // Save settings if state changed
        if (needsSettingsSave) {
            await action.setSettings(settings);
            console.log(`[ControlLitra] Settings saved with new state: ${settings.isOn}`);
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
