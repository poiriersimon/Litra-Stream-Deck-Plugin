import * as HID from 'node-hid';

// Litra device IDs
const LITRA_GLOW_VID = 0x046d;
const LITRA_GLOW_PID = 0xc900;
const LITRA_BEAM_VID = 0x046d;
const LITRA_BEAM_PID = 0xc901;
const USAGE_PAGE = 0xff43;

export interface LitraDevice {
    vendorId: number;
    productId: number;
    path: string;
    product?: string;
    manufacturer?: string;
    type?: LitraDeviceType;
}

export interface LitraDeviceOption {
    label: string;
    value: string;
}

export enum LitraDeviceType {
    Glow = 'Glow',
    Beam = 'Beam',
    All = 'All'
}

export class LitraController {
    /**
     * Get all Litra lights connected to the system
     */
    static getLitraLights(deviceType: LitraDeviceType = LitraDeviceType.All): LitraDevice[] {
        try {
            const devices = HID.devices();
            const litraDevices: LitraDevice[] = [];

            console.log(`[LitraController] Scanning ${devices.length} HID devices for Litra lights (type: ${deviceType})...`);

            for (const device of devices) {
                let isMatch = false;
                let deviceTypeFound: LitraDeviceType | undefined;

                // Match by vendor/product ID first
                switch (deviceType) {
                    case LitraDeviceType.Glow:
                        isMatch = device.vendorId === LITRA_GLOW_VID && device.productId === LITRA_GLOW_PID;
                        deviceTypeFound = LitraDeviceType.Glow;
                        break;
                    case LitraDeviceType.Beam:
                        isMatch = device.vendorId === LITRA_BEAM_VID && device.productId === LITRA_BEAM_PID;
                        deviceTypeFound = LitraDeviceType.Beam;
                        break;
                    case LitraDeviceType.All:
                        if (device.vendorId === LITRA_GLOW_VID && device.productId === LITRA_GLOW_PID) {
                            isMatch = true;
                            deviceTypeFound = LitraDeviceType.Glow;
                        } else if (device.vendorId === LITRA_BEAM_VID && device.productId === LITRA_BEAM_PID) {
                            isMatch = true;
                            deviceTypeFound = LitraDeviceType.Beam;
                        }
                        break;
                }

                if (isMatch && device.path) {
                    // Only use the HID interface with usage page 0xFF43 (the control interface)
                    if (device.usagePage === USAGE_PAGE) {
                        console.log(`[LitraController] Found Litra ${deviceTypeFound}: ${device.product || 'Unknown'} (VID: 0x${device.vendorId?.toString(16)}, PID: 0x${device.productId?.toString(16)}, UsagePage: 0x${device.usagePage?.toString(16)}, Path: ${device.path})`);
                        litraDevices.push({
                            vendorId: device.vendorId!,
                            productId: device.productId!,
                            path: device.path,
                            product: device.product,
                            manufacturer: device.manufacturer,
                            type: deviceTypeFound
                        });
                    } else {
                        console.log(`[LitraController] Skipped interface with usage page 0x${device.usagePage?.toString(16)} (need 0x${USAGE_PAGE.toString(16)})`);
                    }
                }
            }

            console.log(`[LitraController] Found ${litraDevices.length} Litra ${deviceType} device(s)`);
            return litraDevices;
        } catch (error) {
            console.error('[LitraController] Error getting Litra lights:', error);
            return [];
        }
    }

    /**
     * Send a command to a Litra device
     */
    private static sendCommand(devicePath: string, command: number[]): boolean {
        try {
            console.log(`[LitraController] Sending command to ${devicePath}: [${command.map(c => '0x' + c.toString(16).padStart(2, '0')).join(', ')}]`);
            const device = new HID.HID(devicePath);
            const result = device.write(command);
            device.close();
            console.log(`[LitraController] Command sent successfully, wrote ${result} bytes`);
            return true;
        } catch (error) {
            console.error(`[LitraController] Failed to send command to device ${devicePath}:`, error);
            return false;
        }
    }

    /**
     * Turn on a Litra light
     */
    static turnOn(device: LitraDevice): boolean {
        const command = [0x11, 0xff, 0x04, 0x1d, 0x01];
        return this.sendCommand(device.path, command);
    }

    /**
     * Turn off a Litra light
     */
    static turnOff(device: LitraDevice): boolean {
        const command = [0x11, 0xff, 0x04, 0x1d, 0x00];
        return this.sendCommand(device.path, command);
    }

    /**
     * Set brightness of a Litra light
     * @param device The Litra device
     * @param brightness Brightness percentage (1-100)
     */
    static setBrightness(device: LitraDevice, brightness: number): boolean {
        if (brightness < 1 || brightness > 100) {
            console.error('Brightness must be between 1 and 100');
            return false;
        }

        // Convert brightness percentage to device value (matching PowerShell calculation)
        const brightnessValue = Math.floor(31 + (brightness / 100 * 368));
        const highByte = (brightnessValue >> 8) & 0xff;
        const lowByte = brightnessValue & 0xff;

        // Note: PowerShell Format-Hex returns big-endian, so high byte comes first
        const command = [0x11, 0xff, 0x04, 0x4f, highByte, lowByte];
        return this.sendCommand(device.path, command);
    }

    /**
     * Set color temperature of a Litra light
     * @param device The Litra device
     * @param temperature Temperature in Kelvin (2700-6500)
     */
    static setTemperature(device: LitraDevice, temperature: number): boolean {
        if (temperature < 2700 || temperature > 6500) {
            console.error('Temperature must be between 2700 and 6500');
            return false;
        }

        const highByte = (temperature >> 8) & 0xff;
        const lowByte = temperature & 0xff;

        // Note: PowerShell Format-Hex returns big-endian, so high byte comes first
        const command = [0x11, 0xff, 0x04, 0x9d, highByte, lowByte];
        return this.sendCommand(device.path, command);
    }

    /**
     * Turn on all lights of a specific type
     */
    static turnOnAll(deviceType: LitraDeviceType = LitraDeviceType.All): number {
        const devices = this.getLitraLights(deviceType);
        let successCount = 0;

        for (const device of devices) {
            if (this.turnOn(device)) {
                successCount++;
            }
        }

        return successCount;
    }

    /**
     * Turn off all lights of a specific type
     */
    static turnOffAll(deviceType: LitraDeviceType = LitraDeviceType.All): number {
        const devices = this.getLitraLights(deviceType);
        let successCount = 0;

        for (const device of devices) {
            if (this.turnOff(device)) {
                successCount++;
            }
        }

        return successCount;
    }

    /**
     * Check if it's daytime (8 AM to 5 PM) - used for Glow light logic
     */
    static isDaytime(): boolean {
        const hour = new Date().getHours();
        return hour >= 8 && hour < 17;
    }

    /**
     * Get a list of devices formatted for dropdown selection
     */
    static getDeviceOptions(deviceType: LitraDeviceType = LitraDeviceType.All): LitraDeviceOption[] {
        const devices = this.getLitraLights(deviceType);
        const options: LitraDeviceOption[] = [];

        // Add "All" option
        if (devices.length > 1) {
            options.push({
                label: `All ${deviceType} Lights (${devices.length})`,
                value: 'all'
            });
        }

        // Add individual device options
        devices.forEach((device, index) => {
            const typeName = device.type || 'Light';
            const label = `${typeName} #${index + 1}`;
            options.push({
                label: label,
                value: device.path
            });
        });

        return options;
    }

    /**
     * Get a device by path
     */
    static getDeviceByPath(path: string, deviceType: LitraDeviceType = LitraDeviceType.All): LitraDevice | undefined {
        const devices = this.getLitraLights(deviceType);
        return devices.find(device => device.path === path);
    }
}
