#!/bin/bash

# Function to process a directory
process_directory() {
    local dir=$1
    echo "Processing directory: $dir"

    # Create subdirectories if they don't exist
    mkdir -p "$dir/thumbnails"
    mkdir -p "$dir/full"

    # Loop through all jpg images in the directory
    # We use -maxdepth 1 to avoid processing images already in subfolders
    for img in "$dir"/*.jpg; do
        if [ -f "$img" ]; then
            filename=$(basename "$img")
            filename_no_ext="${filename%.*}"
            
            echo "  Processing $filename..."

            # 1. Generate Thumbnail (JPG) - 400px width, 85% quality
            magick "$img" -resize 400x -quality 85 "$dir/thumbnails/$filename"

            # 2. Generate Thumbnail (WEBP) - 400px width, 80% quality
            magick "$img" -resize 400x -quality 80 -define webp:lossless=false "$dir/thumbnails/$filename_no_ext.webp"

            # 3. Generate Optimized Full Size (WEBP) - Max 1920px width, 85% quality
            magick "$img" -resize '1920x>' -quality 85 -define webp:lossless=false "$dir/full/$filename_no_ext.webp"
            
            # 4. Copy original to full/ as optimized JPG (optional, resizing if huge)
            magick "$img" -resize '1920x>' -quality 85 "$dir/full/$filename"
        fi
    done
}

# Check if magick is installed
if ! command -v magick &> /dev/null; then
    echo "Error: ImageMagick (magick) is not installed."
    exit 1
fi

# Process both directories
process_directory "Chery"
process_directory "DFSK"

echo "Optimization complete!"
