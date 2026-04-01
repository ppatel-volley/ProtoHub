#!/bin/bash

# How to run this script:
# 1. Open a terminal
# 2. Install the required tools:
#    sudo apt-get install libavif-bin imagemagick
# 3. Navigate to the scripts folder:
#    cd /Users/yoavhortman/WebstormProjects/hub/scripts
# 4. Run the script:
#    bash compress_to_avif.sh

set -e

# Define all directories containing images to process
image_dirs=(
    "./apps/client/public/assets/images/branding"
    "./apps/client/public/assets/images/games/tiles"
    "./apps/client/public/assets/images/games/heroes"
    "./apps/client/public/assets/images/ui"
    "./apps/client/public/assets/images/ui/tags"
)

max_width=1080
max_height=1920

# Process each directory
for input_dir in "${image_dirs[@]}"; do
    echo "Processing directory: $input_dir"
    
    # Check if input directory exists
    if [ ! -d "$input_dir" ]; then
        echo "Directory does not exist: $input_dir, skipping..."
        continue
    fi
    
    # Check if directory has any image files (excluding animated webp)
    shopt -s nullglob
    images=("$input_dir"/*.{jpg,jpeg,png})
    if [ ${#images[@]} -eq 0 ]; then
        echo "No image files found in $input_dir, skipping..."
        continue
    fi
    
    # Note: WebP files are excluded as they may be animations and cause issues
    
    mkdir -p "$input_dir"
    
    for img in "${images[@]}"; do
        filename=$(basename -- "$img")
        filename="${filename%.*}"
        
        echo "Processing $img"
        
        dimensions=$(identify -format "%wx%h" "$img")
        width=$(echo $dimensions | cut -d'x' -f1)
        height=$(echo $dimensions | cut -d'x' -f2)
        
        if [ $width -gt $max_width ] || [ $height -gt $max_height ]; then
            echo "Resizing and converting $img"
            # Use ImageMagick to resize first, then convert to AVIF
            # Get original file extension to preserve format
            orig_ext="${img##*.}"
            temp_resized="${input_dir}/${filename}_resized.${orig_ext}"
            magick "$img" -resize "${max_width}x${max_height}>" "$temp_resized"
            avifenc -s 6 -q 51 -a end-usage=q -a cq-level=18 -a tune=ssim "$temp_resized" "${input_dir}/${filename}.avif"
            rm "$temp_resized"
        else
            echo "Converting $img without resizing"
            avifenc -s 6 -q 51 -a end-usage=q -a cq-level=18 -a tune=ssim "$img" "${input_dir}/${filename}.avif"
        fi
        
        echo "Converted $img to ${input_dir}/${filename}.avif"
    done
    
    echo "Completed processing directory: $input_dir"
    echo ""
done

echo "Conversion complete!"
