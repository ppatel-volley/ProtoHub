#!/bin/bash

set -e

# Directories to search in for code files
search_dirs=(
    "/Users/yoavhortman/WebstormProjects/hub/apps/client/src"
    "/Users/yoavhortman/WebstormProjects/hub/apps/server/src"
)

# File types to process
file_types=("*.tsx" "*.ts" "*.js" "*.jsx" "*.css")

for search_dir in "${search_dirs[@]}"; do
    echo "Searching in directory: $search_dir"
    
    # Check if directory exists
    if [ ! -d "$search_dir" ]; then
        echo "Directory does not exist: $search_dir, skipping..."
        continue
    fi
    
    for type in "${file_types[@]}"; do
        find "$search_dir" -name "$type" | while read -r file; do
            echo "Processing $file"
            
            # Replace image file extensions with .avif (simple replacement)
            sed -i '' 's/\.png/\.avif/g' "$file"
            sed -i '' 's/\.jpg/\.avif/g' "$file"
            sed -i '' 's/\.jpeg/\.avif/g' "$file"
            sed -i '' 's/\.webp/\.avif/g' "$file"
        done
    done
    
    echo "Completed processing directory: $search_dir"
    echo ""
done

echo "Replacement complete!"
