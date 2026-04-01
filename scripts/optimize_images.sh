#!/bin/bash

# Master script to run the complete image optimization workflow
# This script runs all three image optimization scripts in the correct order

set -e

echo "🚀 Starting complete image optimization workflow..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Step 1: Convert images to AVIF format
echo "📸 Step 1: Converting images to AVIF format..."
bash "$SCRIPT_DIR/compress_to_avif.sh"
echo "✅ AVIF conversion complete!"
echo ""

# Step 2: Update code references to use .avif extensions
echo "🔧 Step 2: Updating code references to .avif extensions..."
bash "$SCRIPT_DIR/replace_image_extensions.sh"
echo "✅ Code references updated!"
echo ""

# Step 3: Clean up original image files
echo "🧹 Step 3: Cleaning up original image files..."
bash "$SCRIPT_DIR/cleanup_original_images.sh"
echo "✅ Cleanup complete!"
echo ""

echo "🎉 Image optimization workflow completed successfully!"
echo ""
echo "Summary:"
echo "- Images converted to AVIF format"
echo "- Code references updated to use .avif extensions"
echo "- Original image files removed"
echo ""
echo "Your assets are now optimized! 🚀"
