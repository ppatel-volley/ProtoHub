#!/bin/bash

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Define all directories containing images to process
image_dirs=(
    "$PROJECT_ROOT/apps/client/public/assets/images/branding"
    "$PROJECT_ROOT/apps/client/public/assets/images/games/tiles"
    "$PROJECT_ROOT/apps/client/public/assets/images/games/heroes"
    "$PROJECT_ROOT/apps/client/public/assets/images/ui"
    "$PROJECT_ROOT/apps/client/public/assets/images/ui/tags"
    "$PROJECT_ROOT/apps/client/public/assets/images/fhd"
)

# Process each directory
for search_dir in "${image_dirs[@]}"; do
    echo "Cleaning up directory: $search_dir"
    
    # Check if directory exists
    if [ ! -d "$search_dir" ]; then
        echo "Directory does not exist: $search_dir, skipping..."
        continue
    fi
    
    # Loop through all avif files in this directory
    for avif_file in "$search_dir"/*.avif; do
        # Check if file exists (to handle cases where no files match the pattern)
        [ -e "$avif_file" ] || continue
        
        # Get the filename without extension
        filename=$(basename -- "$avif_file")
        filename="${filename%.*}"
        
        # Check and delete corresponding jpg, jpeg, png, webp files
        for ext in jpg jpeg png webp; do
            if [ -f "$search_dir/$filename.$ext" ]; then
                rm "$search_dir/$filename.$ext"
                echo "Deleted $search_dir/$filename.$ext"
            fi
        done
    done
    
    echo "Completed cleanup for directory: $search_dir"
    echo ""
done

echo "Cleanup complete!"
