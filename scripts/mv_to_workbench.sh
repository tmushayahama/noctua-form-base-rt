#!/bin/bash
set -ex

# Configuration
SOURCE_DIR="workbenches/noctua-visual-pathway-editor-beta/public"
TARGET_DIR="../noctua-visual-pathway-editor/workbenches/noctua-visual-pathway-editor-beta/public"

# Log function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Main execution
log_message "Starting deployment..."

# Remove existing public directory if it exists
if [ -d "$TARGET_DIR" ]; then
    rm -rf "$TARGET_DIR"
fi

# Create parent directories if needed
mkdir -p "$(dirname "$TARGET_DIR")"

# Copy dist directory to target
cp -r "$SOURCE_DIR" "$TARGET_DIR"

# Rename index.html to inject.tmpl
mv "$TARGET_DIR/index.html" "$TARGET_DIR/inject.tmpl"

log_message "Deployment completed!"