// Test script to check for Litra lights
const HID = require('node-hid');

console.log('\n========== Litra Light Detection Test ==========\n');

const LITRA_GLOW_VID = 0x046d;
const LITRA_GLOW_PID = 0xc900;
const LITRA_BEAM_VID = 0x046d;
const LITRA_BEAM_PID = 0xc901;

const devices = HID.devices();
console.log(`Total HID devices found: ${devices.length}\n`);

const litraDevices = devices.filter(d => 
    d.vendorId === LITRA_GLOW_VID && 
    (d.productId === LITRA_GLOW_PID || d.productId === LITRA_BEAM_PID)
);

if (litraDevices.length === 0) {
    console.log('❌ NO LITRA LIGHTS DETECTED');
    console.log('\nPlease make sure your Litra Glow or Litra Beam lights are:');
    console.log('  1. Connected via USB');
    console.log('  2. Powered on');
    console.log('  3. Drivers are installed (if required)\n');
    
    console.log('Looking for:');
    console.log(`  - Litra Glow: VID=${LITRA_GLOW_VID.toString(16)}, PID=${LITRA_GLOW_PID.toString(16)}`);
    console.log(`  - Litra Beam: VID=${LITRA_BEAM_VID.toString(16)}, PID=${LITRA_BEAM_PID.toString(16)}\n`);
} else {
    console.log(`✅ Found ${litraDevices.length} Litra light(s):\n`);
    litraDevices.forEach((device, index) => {
        const type = device.productId === LITRA_GLOW_PID ? 'Glow' : 'Beam';
        console.log(`Device ${index + 1}: Litra ${type}`);
        console.log(`  Product: ${device.product || 'Unknown'}`);
        console.log(`  Path: ${device.path}`);
        console.log(`  Usage Page: 0x${device.usagePage?.toString(16) || 'unknown'}`);
        console.log();
    });
}

console.log('================================================\n');
