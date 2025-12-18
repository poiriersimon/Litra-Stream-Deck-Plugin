import HID from 'node-hid';
import readline from 'readline';

// Litra Beam constants
const VENDOR_ID = 0x046d;
const BEAM_PRODUCT_ID = 0xc901; // Updated based on your device
const USAGE_PAGE = 0xff43;

console.log('Looking for Litra Beam devices...\n');

// Find Litra Beam device
const devices = HID.devices();

// Debug: Show all Logitech devices
console.log('All Logitech devices found:');
const logitechDevices = devices.filter(d => d.vendorId === VENDOR_ID);
logitechDevices.forEach(d => {
    console.log(`  Product ID: 0x${d.productId?.toString(16)}, Usage Page: 0x${d.usagePage?.toString(16)}, Product: ${d.product}`);
});
console.log('');

const litraDevice = devices.find(d => 
    d.vendorId === VENDOR_ID && 
    d.productId === BEAM_PRODUCT_ID && 
    d.usagePage === USAGE_PAGE
);

if (!litraDevice) {
    console.error('No Litra Beam device found with exact match!');
    console.error(`Looking for: Vendor=0x${VENDOR_ID.toString(16)}, Product=0x${BEAM_PRODUCT_ID.toString(16)}, UsagePage=0x${USAGE_PAGE.toString(16)}`);
    
    // Try to find any Litra device
    const anyLitra = devices.find(d => 
        d.vendorId === VENDOR_ID && 
        (d.productId === BEAM_PRODUCT_ID || d.productId === 0xc901) &&
        d.usagePage === USAGE_PAGE
    );
    
    if (anyLitra) {
        console.log('\nFound a Litra device with different specs:');
        console.log(`  Product ID: 0x${anyLitra.productId?.toString(16)}`);
        console.log(`  Usage Page: 0x${anyLitra.usagePage?.toString(16)}`);
        console.log(`  Path: ${anyLitra.path}`);
        console.log('\nWould you like to use this device? (It might be a Litra Glow)');
    }
    
    process.exit(1);
}

console.log('Found Litra Beam:', litraDevice.path);
console.log('Product:', litraDevice.product);
console.log('Manufacturer:', litraDevice.manufacturer);
console.log('\n');

try {
    const device = new HID.HID(litraDevice.path);
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    console.log('='.repeat(60));
    console.log('PLEASE MAKE SURE YOUR LITRA BEAM IS OFF');
    console.log('='.repeat(60));
    console.log('\nPress Enter when the light is OFF...');
    
    rl.once('line', () => {
        console.log('\nCapturing OFF state...\n');
        
        const offState = captureState(device);
        
        console.log('='.repeat(60));
        console.log('NOW TURN YOUR LITRA BEAM ON');
        console.log('(Use the physical button or any other method)');
        console.log('='.repeat(60));
        console.log('\nPress Enter when the light is ON...');
        
        rl.once('line', () => {
            console.log('\nCapturing ON state...\n');
            
            const onState = captureState(device);
            
            console.log('\n' + '='.repeat(60));
            console.log('COMPARISON RESULTS');
            console.log('='.repeat(60) + '\n');
            
            compareStates(offState, onState);
            
            device.close();
            rl.close();
            process.exit(0);
        });
    });
    
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}

function captureState(device) {
    const state = {
        featureReports: [],
        deviceInfo: {}
    };
    
    // Try to read various feature report IDs
    console.log('Attempting to read feature reports...');
    const reportIds = [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x10, 0x11, 0x1c, 0x1d, 0x20, 0x21];
    
    for (const reportId of reportIds) {
        try {
            // Try different buffer sizes
            for (const size of [8, 16, 20, 32, 64]) {
                try {
                    const data = device.getFeatureReport(reportId, size);
                    if (data && data.length > 0) {
                        const nonZero = data.some(b => b !== 0);
                        if (nonZero) {
                            console.log(`  Report ID 0x${reportId.toString(16).padStart(2, '0')} (size ${size}): Found data`);
                            state.featureReports.push({
                                id: reportId,
                                size: size,
                                data: Array.from(data),
                                hex: Buffer.from(data).toString('hex')
                            });
                            break; // Found valid data for this report ID, move to next
                        }
                    }
                } catch (e) {
                    // Size not supported, try next
                }
            }
        } catch (error) {
            // Report ID not available
        }
    }
    
    if (state.featureReports.length === 0) {
        console.log('  No feature reports found\n');
    } else {
        console.log('');
    }
    
    // Try to set a read listener for a short time to see if we get any input reports
    console.log('Listening for input reports (2 seconds)...');
    const inputReports = [];
    
    device.on('data', (data) => {
        inputReports.push({
            data: Array.from(data),
            hex: Buffer.from(data).toString('hex'),
            timestamp: Date.now()
        });
        console.log(`  Received input report: ${Buffer.from(data).toString('hex')}`);
    });
    
    // Wait synchronously (blocking)
    const start = Date.now();
    while (Date.now() - start < 2000) {
        // Busy wait
    }
    
    device.removeAllListeners('data');
    
    if (inputReports.length === 0) {
        console.log('  No input reports received\n');
    } else {
        console.log('');
    }
    
    state.inputReports = inputReports;
    
    return state;
}

function compareStates(offState, onState) {
    console.log('OFF STATE:');
    console.log('-'.repeat(60));
    if (offState.featureReports.length > 0) {
        offState.featureReports.forEach(report => {
            console.log(`Report ID 0x${report.id.toString(16).padStart(2, '0')}:`);
            console.log(`  Hex: ${report.hex}`);
            console.log(`  Dec: [${report.data.join(', ')}]`);
        });
    } else {
        console.log('No feature reports');
    }
    
    if (offState.inputReports.length > 0) {
        console.log('\nInput reports:');
        offState.inputReports.forEach((report, idx) => {
            console.log(`  [${idx}] ${report.hex}`);
        });
    }
    
    console.log('\n');
    console.log('ON STATE:');
    console.log('-'.repeat(60));
    if (onState.featureReports.length > 0) {
        onState.featureReports.forEach(report => {
            console.log(`Report ID 0x${report.id.toString(16).padStart(2, '0')}:`);
            console.log(`  Hex: ${report.hex}`);
            console.log(`  Dec: [${report.data.join(', ')}]`);
        });
    } else {
        console.log('No feature reports');
    }
    
    if (onState.inputReports.length > 0) {
        console.log('\nInput reports:');
        onState.inputReports.forEach((report, idx) => {
            console.log(`  [${idx}] ${report.hex}`);
        });
    }
    
    console.log('\n');
    console.log('DIFFERENCES:');
    console.log('-'.repeat(60));
    
    // Compare feature reports
    const offReportIds = new Set(offState.featureReports.map(r => r.id));
    const onReportIds = new Set(onState.featureReports.map(r => r.id));
    
    const allReportIds = new Set([...offReportIds, ...onReportIds]);
    
    let foundDifferences = false;
    
    for (const reportId of allReportIds) {
        const offReport = offState.featureReports.find(r => r.id === reportId);
        const onReport = onState.featureReports.find(r => r.id === reportId);
        
        if (!offReport) {
            console.log(`Report ID 0x${reportId.toString(16).padStart(2, '0')}: Only present in ON state`);
            foundDifferences = true;
        } else if (!onReport) {
            console.log(`Report ID 0x${reportId.toString(16).padStart(2, '0')}: Only present in OFF state`);
            foundDifferences = true;
        } else if (offReport.hex !== onReport.hex) {
            console.log(`Report ID 0x${reportId.toString(16).padStart(2, '0')}: DIFFERENT`);
            console.log(`  OFF: ${offReport.hex}`);
            console.log(`  ON:  ${onReport.hex}`);
            
            // Show byte-by-byte differences
            const diffs = [];
            for (let i = 0; i < Math.max(offReport.data.length, onReport.data.length); i++) {
                const offByte = offReport.data[i] || 0;
                const onByte = onReport.data[i] || 0;
                if (offByte !== onByte) {
                    diffs.push(`Byte ${i}: ${offByte} -> ${onByte}`);
                }
            }
            if (diffs.length > 0) {
                console.log('  Changes:', diffs.join(', '));
            }
            foundDifferences = true;
        }
    }
    
    if (!foundDifferences) {
        console.log('No differences found in feature reports.');
    }
    
    console.log('\n');
    console.log('CONCLUSION:');
    console.log('-'.repeat(60));
    
    if (foundDifferences) {
        console.log('✓ Detected differences between OFF and ON states!');
        console.log('  This means we may be able to read the current state.');
    } else {
        console.log('✗ No differences detected between OFF and ON states.');
        console.log('  The device may not expose its current state via HID.');
        console.log('  We will need to track state changes in the plugin.');
    }
}
