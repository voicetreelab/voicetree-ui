#!/bin/bash

# Deploy Juggl plugin to Obsidian vault
# Usage: ./deploy.sh

VAULT_PATH="/Users/bobbobby/repos/VoiceTreePoc/markdownTreeVault/.obsidian/plugins/juggl"
VAULT_PATH_2="/Users/bobbobby/repos/VoiceTreePoc/backend/benchmarker/output/.obsidian/plugins/juggl"
# Check if npm run dev is running
if ! pgrep -f "rollup.*-w" > /dev/null; then
    echo "⚠️  Warning: 'npm run dev' doesn't seem to be running!"
    echo "Make sure to run 'npm run dev' in another terminal first."
    echo ""
fi

# Check if files exist
if [ ! -f "main.js" ]; then
    echo "❌ Error: main.js not found. Make sure you're in the juggl-main directory."
    exit 1
fi

# Create plugin directory if it doesn't exist
mkdir -p "$VAULT_PATH"

# Copy files
echo "📦 Copying files to vault... $VAULT_PATH"
cp main.js manifest.json styles.css "$VAULT_PATH/"

# Create plugin directory if it doesn't exist
mkdir -p "$VAULT_PATH_2"

# Copy files
echo "📦 Copying files to vault... $VAULT_PATH_2"
cp main.js manifest.json styles.css "$VAULT_PATH_2/"

if [ $? -eq 0 ]; then
    echo "✅ Files deployed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Go to Obsidian Settings → Community plugins"
    echo "2. Toggle Juggl OFF then ON"
    echo "3. Check console for: 'Loading Juggl - FIXED VERSION v1.5.2'"
else
    echo "❌ Error copying files!"
    exit 1
fi