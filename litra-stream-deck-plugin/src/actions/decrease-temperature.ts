import { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { LitraController, LitraDeviceType } from "../litra-controller";

/**
 * Action to decrease temperature of Litra lights
 */
@action({ UUID: "com.simon-poirier.litra-stream-deck-plugin.decrease-temperature" })
export class DecreaseTemperature extends SingletonAction<TemperatureSettings> {
    private temperatureStates: Map<string, number> = new Map();

    /**
     * Update the button appearance when it becomes visible
     */
    override async onWillAppear(ev: WillAppearEvent<TemperatureSettings>): Promise<void> {
        const deviceType = (ev.payload.settings.deviceType as LitraDeviceType) || LitraDeviceType.All;
        const devices = LitraController.getLitraLights(deviceType);
        
        if (devices.length === 0) {
            await ev.action.setTitle("\n❌");
            return;
        }
        
        const step = ev.payload.settings.step || 100;
        return ev.action.setTitle(`\n-${step}K`);
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<TemperatureSettings>): Promise<void> {
        const deviceType = (ev.payload.settings.deviceType as LitraDeviceType) || LitraDeviceType.All;
        const devices = LitraController.getLitraLights(deviceType);
        
        if (devices.length === 0) {
            await ev.action.setTitle("\n❌");
            return;
        }
        
        const step = ev.payload.settings.step || 100;
        return ev.action.setTitle(`\n-${step}K`);
    }

    /**
     * Decrease temperature when the button is pressed
     */
    override async onKeyDown(ev: KeyDownEvent<TemperatureSettings>): Promise<void> {
        const { settings } = ev.payload;
        const step = settings.step || 100;
        const devicePath = settings.devicePath || 'all';
        const deviceType = (settings.deviceType as LitraDeviceType) || LitraDeviceType.All;

        try {
            let devices = LitraController.getLitraLights(deviceType);
            
            if (devicePath !== 'all') {
                const device = LitraController.getDeviceByPath(devicePath, deviceType);
                devices = device ? [device] : [];
            }

            if (devices.length === 0) {
                await ev.action.showAlert();
                return;
            }

            let successCount = 0;
            for (const device of devices) {
                // Get current temperature or start at 4500K
                const currentTemp = this.temperatureStates.get(device.path) || 4500;
                const newTemp = Math.max(2700, currentTemp - step);
                
                if (LitraController.setTemperature(device, newTemp)) {
                    this.temperatureStates.set(device.path, newTemp);
                    successCount++;
                }
            }

            if (successCount > 0) {
                await ev.action.showOk();
                console.log(`Decreased temperature for ${successCount} device(s) by ${step}K`);
            } else {
                await ev.action.showAlert();
            }
        } catch (error) {
            console.error('Failed to decrease temperature:', error);
            await ev.action.showAlert();
        }
    }
}

/**
 * Settings for {@link DecreaseTemperature}.
 */
type TemperatureSettings = {
    step?: number;
    devicePath?: string;
    deviceType?: string;
};
