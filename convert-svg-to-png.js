const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const INPUT_DIR = './flags';
const OUTPUT_DIR = './png-flags';
const PNG_SIZE = 512; // Output PNG size (width and height)
const PNG_QUALITY = 90; // PNG quality (0-100)

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
}

// Function to convert SVG to PNG
async function convertSvgToPng(inputPath, outputPath) {
    try {
        await sharp(inputPath)
            .resize(PNG_SIZE, PNG_SIZE)
            .png({ quality: PNG_QUALITY })
            .toFile(outputPath);
        
        console.log(`✅ Converted: ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
        return true;
    } catch (error) {
        console.error(`❌ Error converting ${path.basename(inputPath)}:`, error.message);
        return false;
    }
}

// Function to get all SVG files recursively
function getAllSvgFiles(dir) {
    const files = [];
    
    function scanDirectory(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Recursively scan subdirectories
                scanDirectory(fullPath);
            } else if (path.extname(item).toLowerCase() === '.svg') {
                files.push(fullPath);
            }
        }
    }
    
    scanDirectory(dir);
    return files;
}

// Main conversion function
async function convertAllSvgs() {
    console.log('🚀 Starting SVG to PNG conversion...\n');
    
    // Get all SVG files
    const svgFiles = getAllSvgFiles(INPUT_DIR);
    console.log(`Found ${svgFiles.length} SVG files to convert\n`);
    
    if (svgFiles.length === 0) {
        console.log('No SVG files found in the input directory.');
        return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    // Convert each SVG file
    for (let i = 0; i < svgFiles.length; i++) {
        const inputPath = svgFiles[i];
        const relativePath = path.relative(INPUT_DIR, inputPath);
        const outputPath = path.join(OUTPUT_DIR, relativePath.replace('.svg', '.png'));
        
        // Create subdirectories if needed
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const success = await convertSvgToPng(inputPath, outputPath);
        
        if (success) {
            successCount++;
        } else {
            errorCount++;
        }
        
        // Progress indicator
        const progress = ((i + 1) / svgFiles.length * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${progress}% (${i + 1}/${svgFiles.length})`);
    }
    
    console.log('\n\n🎉 Conversion completed!');
    console.log(`✅ Successfully converted: ${successCount} files`);
    if (errorCount > 0) {
        console.log(`❌ Failed to convert: ${errorCount} files`);
    }
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log(`📐 PNG size: ${PNG_SIZE}x${PNG_SIZE} pixels`);
}

// Run the conversion
convertAllSvgs().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
