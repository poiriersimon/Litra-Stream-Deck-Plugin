import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { LitraController, LitraDeviceType } from "../litra-controller";

/**
 * Action to toggle all Litra lights on/off
 */
@action({ UUID: "com.simon-poirier.litra-stream-deck-plugin.toggle-all" })
export class ToggleAllLights extends SingletonAction<ToggleAllSettings> {
    /**
     * Update the button appearance when it becomes visible
     */
    override async onWillAppear(ev: WillAppearEvent<ToggleAllSettings>): Promise<void> {
        const devices = [
            ...LitraController.getLitraLights(LitraDeviceType.Beam),
            ...LitraController.getLitraLights(LitraDeviceType.Glow)
        ];
        
        if (devices.length === 0) {
            await ev.action.setTitle("\n❌");
            return;
        }
        
        const isOn = ev.payload.settings.isOn ?? false;
        return ev.action.setTitle(isOn ? "\nAll On" : "\nAll Off");
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
                
                await ev.action.setTitle("\nAll On");
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
                
                await ev.action.setTitle("\nAll Off");
                await ev.action.showOk();
            }

            // Update the state
            settings.isOn = newState;
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
