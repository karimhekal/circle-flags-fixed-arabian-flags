const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const INPUT_DIR = './png-flags';
const OUTPUT_DIR = './compressed-flags';
const TARGET_SIZE = 256; // Resize to smaller dimensions for better compression
const USE_PALETTE = true; // Use palette compression for better results
const COMPRESSION_LEVEL = 9; // Maximum PNG compression level

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Created output directory: ${OUTPUT_DIR}`);
}

// Function to compress PNG
async function compressPng(inputPath, outputPath) {
    try {
        const inputStats = fs.statSync(inputPath);
        const inputSize = inputStats.size;
        
        // Read the input image and apply aggressive compression
        let pipeline = sharp(inputPath);
        
        // Resize to smaller dimensions for better compression
        pipeline = pipeline.resize(TARGET_SIZE, TARGET_SIZE, {
            fit: 'cover',
            position: 'center'
        });
        
        // Apply aggressive PNG compression
        if (USE_PALETTE) {
            // Convert to palette mode with reduced colors for maximum compression
            pipeline = pipeline.png({
                palette: true,
                colours: 128, // Limit to 128 colors maximum
                compressionLevel: COMPRESSION_LEVEL,
                adaptiveFiltering: true,
                progressive: false
            });
        } else {
            // Use standard PNG compression with maximum settings
            pipeline = pipeline.png({
                compressionLevel: COMPRESSION_LEVEL,
                adaptiveFiltering: true,
                progressive: false,
                force: true
            });
        }
        
        await pipeline.toFile(outputPath);
        
        const outputStats = fs.statSync(outputPath);
        const outputSize = outputStats.size;
        const compressionRatio = ((1 - outputSize / inputSize) * 100).toFixed(1);
        
        console.log(`✅ Compressed: ${path.basename(inputPath)} (${formatBytes(inputSize)} → ${formatBytes(outputSize)}, ${compressionRatio}% reduction)`);
        return { success: true, inputSize, outputSize };
    } catch (error) {
        console.error(`❌ Error compressing ${path.basename(inputPath)}:`, error.message);
        return { success: false, inputSize: 0, outputSize: 0 };
    }
}

// Function to format bytes to human readable format
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Function to get all PNG files recursively
function getAllPngFiles(dir) {
    const files = [];
    
    function scanDirectory(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Recursively scan subdirectories
                scanDirectory(fullPath);
            } else if (path.extname(item).toLowerCase() === '.png') {
                files.push(fullPath);
            }
        }
    }
    
    scanDirectory(dir);
    return files;
}

// Main compression function
async function compressAllPngs() {
    console.log('🗜️  Starting PNG compression...\n');
    
    // Check if input directory exists
    if (!fs.existsSync(INPUT_DIR)) {
        console.error(`❌ Input directory '${INPUT_DIR}' does not exist. Please run the SVG to PNG conversion first.`);
        return;
    }
    
    // Get all PNG files
    const pngFiles = getAllPngFiles(INPUT_DIR);
    console.log(`Found ${pngFiles.length} PNG files to compress\n`);
    
    if (pngFiles.length === 0) {
        console.log('No PNG files found in the input directory.');
        return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    let totalInputSize = 0;
    let totalOutputSize = 0;
    
    // Compress each PNG file
    for (let i = 0; i < pngFiles.length; i++) {
        const inputPath = pngFiles[i];
        const relativePath = path.relative(INPUT_DIR, inputPath);
        const outputPath = path.join(OUTPUT_DIR, relativePath);
        
        // Create subdirectories if needed
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const result = await compressPng(inputPath, outputPath);
        
        if (result.success) {
            successCount++;
            totalInputSize += result.inputSize;
            totalOutputSize += result.outputSize;
        } else {
            errorCount++;
        }
        
        // Progress indicator
        const progress = ((i + 1) / pngFiles.length * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${progress}% (${i + 1}/${pngFiles.length})`);
    }
    
    const totalCompressionRatio = totalInputSize > 0 ? ((1 - totalOutputSize / totalInputSize) * 100).toFixed(1) : 0;
    
    console.log('\n\n🎉 Compression completed!');
    console.log(`✅ Successfully compressed: ${successCount} files`);
    if (errorCount > 0) {
        console.log(`❌ Failed to compress: ${errorCount} files`);
    }
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log(`📊 Total size reduction: ${formatBytes(totalInputSize)} → ${formatBytes(totalOutputSize)} (${totalCompressionRatio}% reduction)`);
    console.log(`📐 Compressed size: ${TARGET_SIZE}x${TARGET_SIZE} pixels`);
    console.log(`⚙️  Compression settings: Palette mode ${USE_PALETTE ? 'enabled' : 'disabled'}, Level ${COMPRESSION_LEVEL}/9`);
}

// Run the compression
compressAllPngs().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
