import streamDeck from "@elgato/streamdeck";

import { ControlLitra } from "./actions/control-litra";
import { ToggleAllLights } from "./actions/toggle-all-lights";
import { IncreaseBrightness } from "./actions/increase-brightness";
import { DecreaseBrightness } from "./actions/decrease-brightness";
import { IncreaseTemperature } from "./actions/increase-temperature";
import { DecreaseTemperature } from "./actions/decrease-temperature";
import { LitraController, LitraDeviceType } from "./litra-controller";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("trace");

// Register Litra light control actions
streamDeck.actions.registerAction(new ControlLitra());
streamDeck.actions.registerAction(new ToggleAllLights());
streamDeck.actions.registerAction(new IncreaseBrightness());
streamDeck.actions.registerAction(new DecreaseBrightness());
streamDeck.actions.registerAction(new IncreaseTemperature());
streamDeck.actions.registerAction(new DecreaseTemperature());

// Handle messages from the property inspector
streamDeck.ui.onSendToPlugin(async (ev) => {
    console.log('[Plugin] Received from PI:', ev.payload, 'from action:', ev.action);
    const { payload } = ev;
    
    if (payload && typeof payload === 'object' && 'event' in payload) {
        if (payload.event === 'getDevices') {
            console.log('[Plugin] Getting device list, type:', payload.deviceType);
            try {
                const deviceType = payload.deviceType === 'Glow' ? LitraDeviceType.Glow : LitraDeviceType.Beam;
                const devices = LitraController.getDeviceOptions(deviceType);
                console.log('[Plugin] Found devices:', devices, 'sending to:', ev.action);
                
                await streamDeck.ui.sendToPropertyInspector({
                    event: 'deviceList',
                    devices: devices
                } as any);
            } catch (error) {
                console.error('[Plugin] Failed to get device list:', error);
                await streamDeck.ui.sendToPropertyInspector({
                    event: 'deviceList',
                    devices: []
                } as any);
            }
        }
    }
});

// Finally, connect to the Stream Deck.
streamDeck.connect();
