// Test brightness calculation
function testBrightness(brightness) {
    const brightnessValue = Math.floor(31 + (brightness / 100 * 368));
    const highByte = (brightnessValue >> 8) & 0xff;
    const lowByte = brightnessValue & 0xff;
    
    console.log(`Brightness ${brightness}%:`);
    console.log(`  Value: ${brightnessValue}`);
    console.log(`  Hex: 0x${brightnessValue.toString(16).toUpperCase()}`);
    console.log(`  Low byte: 0x${lowByte.toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`  High byte: 0x${highByte.toString(16).padStart(2, '0').toUpperCase()}`);
    console.log(`  Command: [0x11, 0xFF, 0x04, 0x4F, 0x${lowByte.toString(16).padStart(2, '0').toUpperCase()}, 0x${highByte.toString(16).padStart(2, '0').toUpperCase()}]`);
    console.log();
}

// Test various brightness values
testBrightness(1);    // Minimum
testBrightness(50);   // Middle
testBrightness(100);  // Maximum

// Now test actual device
const HID = require('node-hid');

console.log('Testing actual device...');
const devices = HID.devices();
const litra = devices.find(d => 
    d.vendorId === 0x046d && 
    d.productId === 0xc901 && 
    d.usagePage === 0xff43
);

if (litra) {
    console.log(`Found Litra Beam: ${litra.path}`);
    
    // Try setting brightness to 50%
    const brightness = 50;
    const brightnessValue = Math.floor(31 + (brightness / 100 * 368));
    const highByte = (brightnessValue >> 8) & 0xff;
    const lowByte = brightnessValue & 0xff;
    const command = [0x11, 0xff, 0x04, 0x4f, lowByte, highByte];
    
    console.log(`Setting brightness to ${brightness}%...`);
    console.log(`Command: [${command.map(c => '0x' + c.toString(16).padStart(2, '0')).join(', ')}]`);
    
    try {
        const device = new HID.HID(litra.path);
        const result = device.write(command);
        device.close();
        console.log(`Wrote ${result} bytes`);
    } catch (error) {
        console.error('Error:', error.message);
    }
} else {
    console.log('No Litra Beam found');
}
