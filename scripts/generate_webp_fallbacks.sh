#!/bin/bash

# Script to generate WebP fallbacks for AVIF images
# This ensures compatibility with older browsers like Samsung TV Chromium 68

set -e

echo "Generating WebP fallbacks for AVIF images..."

# Define directories containing AVIF images
# Allow directories to be specified via command line arguments, or use defaults
if [ "$#" -gt 0 ]; then
    image_dirs=("$@")
else
    image_dirs=(
        "./public/assets/images/branding"
        "./public/assets/images/games/tiles"
        "./public/assets/images/games/heroes"
        "./public/assets/images/ui"
        "./public/assets/images/ui/tags"
    )
fi

# Check if ImageMagick is available
if ! command -v magick &> /dev/null; then
    echo "Error: ImageMagick is not installed. Please install it first:"
    echo "  macOS: brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
    exit 1
fi

# Process each directory
for input_dir in "${image_dirs[@]}"; do
    echo "Processing directory: $input_dir"
    
    # Check if input directory exists
    if [ ! -d "$input_dir" ]; then
        echo "Directory does not exist: $input_dir, skipping..."
        continue
    fi
    
    # Find all AVIF files
    shopt -s nullglob
    avif_files=("$input_dir"/*.avif)
    if [ ${#avif_files[@]} -eq 0 ]; then
        echo "No AVIF files found in $input_dir, skipping..."
        continue
    fi
    
    for avif_file in "${avif_files[@]}"; do
        filename=$(basename -- "$avif_file")
        filename_no_ext="${filename%.*}"
        webp_file="${input_dir}/${filename_no_ext}.webp"
        
        # Skip if WebP already exists
        if [ -f "$webp_file" ]; then
            echo "WebP already exists for $avif_file, skipping..."
            continue
        fi
        
        echo "Converting $avif_file to WebP..."
        
        # Convert AVIF to WebP with good quality
        magick "$avif_file" -quality 85 "$webp_file"
        
        if [ -f "$webp_file" ]; then
            echo "✓ Created $webp_file"
        else
            echo "✗ Failed to create $webp_file"
        fi
    done
    
    echo "Completed processing directory: $input_dir"
    echo ""
done

echo "WebP fallback generation complete!"
echo ""
echo "Summary:"
echo "- AVIF images will be used on modern browsers (Chrome 85+)"
echo "- WebP images will be used as fallbacks on older browsers (Chrome 23+)"
echo "- Your Samsung TV Chromium 68 will now be able to display images!"
