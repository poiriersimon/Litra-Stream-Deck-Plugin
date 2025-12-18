import { action, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { LitraController, LitraDeviceType } from "../litra-controller";

/**
 * Action to increase brightness of Litra lights
 */
@action({ UUID: "com.simon-poirier.litra-stream-deck-plugin.increase-brightness" })
export class IncreaseBrightness extends SingletonAction<BrightnessSettings> {
    private brightnessStates: Map<string, number> = new Map();

    /**
     * Update the button appearance when it becomes visible
     */
    override async onWillAppear(ev: WillAppearEvent<BrightnessSettings>): Promise<void> {
        const deviceType = (ev.payload.settings.deviceType as LitraDeviceType) || LitraDeviceType.All;
        const devices = LitraController.getLitraLights(deviceType);
        
        if (devices.length === 0) {
            await ev.action.setTitle("\n❌");
            return;
        }
        
        const step = ev.payload.settings.step || 10;
        return ev.action.setTitle(`\n+${step}%`);
    }

    override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<BrightnessSettings>): Promise<void> {
        const deviceType = (ev.payload.settings.deviceType as LitraDeviceType) || LitraDeviceType.All;
        const devices = LitraController.getLitraLights(deviceType);
        
        if (devices.length === 0) {
            await ev.action.setTitle("\n❌");
            return;
        }
        
        const step = ev.payload.settings.step || 10;
        return ev.action.setTitle(`\n+${step}%`);
    }

    /**
     * Increase brightness when the button is pressed
     */
    override async onKeyDown(ev: KeyDownEvent<BrightnessSettings>): Promise<void> {
        const { settings } = ev.payload;
        const step = settings.step || 10;
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
                // Get current brightness or start at 50%
                const currentBrightness = this.brightnessStates.get(device.path) || 50;
                const newBrightness = Math.min(100, currentBrightness + step);
                
                if (LitraController.setBrightness(device, newBrightness)) {
                    this.brightnessStates.set(device.path, newBrightness);
                    successCount++;
                }
            }

            if (successCount > 0) {
                await ev.action.showOk();
                console.log(`Increased brightness for ${successCount} device(s) by ${step}%`);
            } else {
                await ev.action.showAlert();
            }
        } catch (error) {
            console.error('Failed to increase brightness:', error);
            await ev.action.showAlert();
        }
    }
}

/**
 * Settings for {@link IncreaseBrightness}.
 */
type BrightnessSettings = {
    step?: number;
    devicePath?: string;
    deviceType?: string;
};
