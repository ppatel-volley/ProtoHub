#!/bin/bash

set -e

echo "Video Compression Script"
echo "======================="

# Video directories to process
video_dirs=(
    "/Users/yoavhortman/WebstormProjects/hub/apps/client/public/assets/videos"
)

# Function to compress a single video
compress_video() {
    local input_file="$1"
    local output_file="$2"
    
    echo "Compressing: $input_file"
    echo "Output: $output_file"
    
    # Get video duration for progress tracking
    duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$input_file")
    echo "Duration: ${duration}s"
    
    # High-quality compression with H.264
    # Using two-pass encoding for optimal quality/size ratio
    ffmpeg -i "$input_file" \
        -c:v libx264 \
        -preset medium \
        -crf 23 \
        -profile:v high \
        -level:v 4.1 \
        -pix_fmt yuv420p \
        -c:a aac \
        -b:a 128k \
        -ac 2 \
        -ar 44100 \
        -movflags +faststart \
        -y \
        "$output_file"
    
    # Get file sizes for comparison
    original_size=$(stat -f%z "$input_file")
    compressed_size=$(stat -f%z "$output_file")
    
    # Calculate compression ratio
    reduction=$(( (original_size - compressed_size) * 100 / original_size ))
    
    echo "Original size: $(numfmt --to=iec-i --suffix=B $original_size)"
    echo "Compressed size: $(numfmt --to=iec-i --suffix=B $compressed_size)"
    echo "Size reduction: ${reduction}%"
    echo ""
}

# Process each video directory
for video_dir in "${video_dirs[@]}"; do
    echo "Processing directory: $video_dir"
    
    if [ ! -d "$video_dir" ]; then
        echo "Directory does not exist: $video_dir, skipping..."
        continue
    fi
    
    # Find all video files
    shopt -s nullglob
    videos=("$video_dir"/*.{mp4,avi,mov,mkv,webm})
    
    if [ ${#videos[@]} -eq 0 ]; then
        echo "No video files found in $video_dir, skipping..."
        continue
    fi
    
    for video in "${videos[@]}"; do
        filename=$(basename -- "$video")
        filename_no_ext="${filename%.*}"
        
        # Skip if already compressed (has _compressed suffix)
        if [[ "$filename_no_ext" == *"_compressed" ]]; then
            echo "Skipping already compressed file: $filename"
            continue
        fi
        
        output_file="${video_dir}/${filename_no_ext}_compressed.mp4"
        
        # Skip if compressed version already exists
        if [ -f "$output_file" ]; then
            echo "Compressed version already exists: $output_file"
            continue
        fi
        
        compress_video "$video" "$output_file"
    done
    
    echo "Completed processing directory: $video_dir"
    echo ""
done

echo "Video compression complete!"
echo ""
echo "To replace original files with compressed versions, run:"
echo "bash scripts/replace_original_videos.sh"
