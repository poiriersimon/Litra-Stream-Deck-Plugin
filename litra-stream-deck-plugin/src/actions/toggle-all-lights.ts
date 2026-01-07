import { action, KeyDownEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, streamDeck } from "@elgato/streamdeck";
import { LitraController, LitraDeviceType } from "../litra-controller";

/**
 * Action to toggle all Litra lights on/off
 */
@action({ UUID: "com.simon-poirier.litra-stream-deck-plugin.toggle-all" })
export class ToggleAllLights extends SingletonAction<ToggleAllSettings> {
    private statusPollIntervals: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Update the button appearance when it becomes visible
     */
    override async onWillAppear(ev: WillAppearEvent<ToggleAllSettings>): Promise<void> {
        await this.updateButtonAppearance(ev.action, ev.payload.settings);
        
        // Start polling status every minute
        this.startStatusPolling(ev.action, ev.payload.settings);
    }

    /**
     * Clean up when button disappears
     */
    override async onWillDisappear(ev: WillDisappearEvent<ToggleAllSettings>): Promise<void> {
        this.stopStatusPolling(ev.action.id);
    }

    /**
     * Start polling device status every minute
     */
    private startStatusPolling(action: any, settings: ToggleAllSettings): void {
        // Clear any existing interval for this action
        this.stopStatusPolling(action.id);
        
        // Poll every 60 seconds (1 minute)
        const interval = setInterval(async () => {
            console.log(`[ToggleAllLights] Polling status for action ${action.id}`);
            await this.updateButtonAppearance(action, settings);
        }, 60000);
        
        this.statusPollIntervals.set(action.id, interval);
        console.log(`[ToggleAllLights] Started status polling for action ${action.id}`);
    }

    /**
     * Stop polling device status
     */
    private stopStatusPolling(actionId: string): void {
        const interval = this.statusPollIntervals.get(actionId);
        if (interval) {
            clearInterval(interval);
            this.statusPollIntervals.delete(actionId);
            console.log(`[ToggleAllLights] Stopped status polling for action ${actionId}`);
        }
    }

    /**
     * Update button appearance based on actual device states
     */
    private async updateButtonAppearance(action: any, settings: ToggleAllSettings): Promise<void> {
        const devices = [
            ...LitraController.getLitraLights(LitraDeviceType.Beam),
            ...LitraController.getLitraLights(LitraDeviceType.Glow)
        ];
        
        if (devices.length === 0) {
            if ('setState' in action) {
                await action.setState(0);
            }
            await action.setTitle("\n❌");
            return;
        }
        
        // Check ALL devices - only show ON if ALL are on
        let allOn = true;
        let onCount = 0;
        let offCount = 0;
        let errorCount = 0;
        
        streamDeck.logger.info(`[ToggleAllLights] Checking ${devices.length} devices...`);
        
        for (const device of devices) {
            const deviceState = LitraController.isOn(device);
            streamDeck.logger.info(`[ToggleAllLights] Device ${device.path}: state=${deviceState}`);
            console.log(`[ToggleAllLights] Device ${device.path}: state=${deviceState}`);
            
            if (deviceState === true) {
                onCount++;
            } else if (deviceState === false) {
                offCount++;
                allOn = false;
            } else if (deviceState === null) {
                // If we can't query a device, assume it's off
                errorCount++;
                allOn = false;
            }
        }
        
        streamDeck.logger.info(`[ToggleAllLights] State check: ${devices.length} devices, on=${onCount}, off=${offCount}, errors=${errorCount}, allOn=${allOn}`);
        console.log(`[ToggleAllLights] All devices state check: ${devices.length} devices, on=${onCount}, off=${offCount}, errors=${errorCount}, all on: ${allOn}`);
        
        // Update stored state if it changed
        let needsSettingsSave = false;
        if (settings.isOn !== allOn) {
            console.log(`[ToggleAllLights] Syncing stored state from ${settings.isOn} to actual device state: ${allOn}`);
            settings.isOn = allOn;
            needsSettingsSave = true;
        }
        
        // Set the state (0 = off, 1 = on)
        if ('setState' in action) {
            await action.setState(allOn ? 1 : 0);
        }
        
        await action.setTitle(allOn ? "\nAll On" : "\nAll Off");
        
        // Save settings if state changed
        if (needsSettingsSave) {
            await action.setSettings(settings);
            console.log(`[ToggleAllLights] Settings saved with new state: ${settings.isOn}`);
        }
    }

    /**
     * Toggle all Litra lights when the button is pressed
     */
    override async onKeyDown(ev: KeyDownEvent<ToggleAllSettings>): Promise<void> {
        const { settings } = ev.payload;
        const currentState = settings.isOn ?? false;
        const newState = !currentState;

        console.log(`[ToggleAllLights] Button pressed, current state: ${currentState}, new state: ${newState}`);

        try {
            let count: number;
            if (newState) {
                // Turn all lights on
                console.log('[ToggleAllLights] Turning all lights on...');
                count = LitraController.turnOnAll(LitraDeviceType.All);
                
                if (count === 0) {
                    console.error('[ToggleAllLights] No devices found or could not turn on any lights');
                    await ev.action.showAlert();
                    return;
                }
                
                // Apply brightness and temperature if configured
                if (settings.applyOnToggle !== false) {
                    console.log(`[ToggleAllLights] Applying settings: brightness=${settings.brightness}, temperature=${settings.temperature}`);
                    const devices = LitraController.getLitraLights(LitraDeviceType.All);
                    for (const device of devices) {
                        if (settings.brightness) {
                            LitraController.setBrightness(device, settings.brightness);
                        }
                        if (settings.temperature) {
                            LitraController.setTemperature(device, settings.temperature);
                        }
                    }
                }
                
                settings.isOn = true;
                await this.updateButtonAppearance(ev.action, settings);
                await ev.action.showOk();
            } else {
                // Turn all lights off
                console.log('[ToggleAllLights] Turning all lights off...');
                count = LitraController.turnOffAll(LitraDeviceType.All);
                
                if (count === 0) {
                    console.error('[ToggleAllLights] No devices found or could not turn off any lights');
                    await ev.action.showAlert();
                    return;
                }
                
                settings.isOn = false;
                await this.updateButtonAppearance(ev.action, settings);
                await ev.action.showOk();
            }

            // Update the state
            await ev.action.setSettings(settings);

            // Log the result
            console.log(`[ToggleAllLights] Successfully toggled ${count} Litra lights ${newState ? 'on' : 'off'}`);
        } catch (error) {
            console.error('[ToggleAllLights] Failed to toggle Litra lights:', error);
            await ev.action.showAlert();
        }
    }
}

/**
 * Settings for {@link ToggleAllLights}.
 */
type ToggleAllSettings = {
    isOn?: boolean;
    brightness?: number;
    temperature?: number;
    applyOnToggle?: boolean;
};
