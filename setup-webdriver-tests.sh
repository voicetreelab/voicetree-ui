#!/bin/bash

echo "🧪 Setting up WebDriver Tests for Juggl Terminal Integration"
echo "=========================================================="

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed."
    exit 1
fi

echo "📦 Installing WebDriver test dependencies..."

# Install WebDriver dependencies with correct versions
npm install --save-dev \
    @wdio/cli@^9.5.0 \
    @wdio/local-runner@^9.5.0 \
    @wdio/mocha-framework@^9.5.0 \
    @wdio/spec-reporter@^9.5.0 \
    wdio-obsidian-service@^1.3.3 \
    mocha@^10.0.0 \
    chai@^4.3.0

if [ $? -ne 0 ]; then
    echo "❌ Failed to install WebDriver dependencies"
    exit 1
fi

echo "✅ WebDriver dependencies installed"

# Make sure test vault exists
TEST_VAULT="/Users/bobbobby/repos/VoiceTree/markdownTreeVault"
if [ ! -d "$TEST_VAULT" ]; then
    echo "❌ Test vault not found at $TEST_VAULT"
    echo "Please ensure the test vault exists"
    exit 1
fi

echo "✅ Test vault found at $TEST_VAULT"

# Make sure Obsidian is available
if [ ! -d "/Applications/Obsidian.app" ]; then
    echo "⚠️  Obsidian app not found at /Applications/Obsidian.app"
    echo "WebDriver tests will attempt to auto-detect Obsidian"
else
    echo "✅ Obsidian found at /Applications/Obsidian.app"
fi

# Build the plugin first
echo "🔨 Building Juggl plugin..."
./build.sh

if [ $? -ne 0 ]; then
    echo "❌ Plugin build failed"
    exit 1
fi

echo "✅ Plugin built successfully"

echo ""
echo "🎯 WebDriver test setup complete!"
echo ""
echo "Available test commands:"
echo "  npm test                    # Run all tests"
echo "  npm run test:terminal       # Run only terminal tests"
echo "  npx wdio run wdio.conf.js   # Run with WebDriver directly"
echo ""
echo "Test features:"
echo "  ✅ Real Obsidian environment testing"
echo "  ✅ Plugin loading verification"
echo "  ✅ Terminal creation testing"
echo "  ✅ Hover editor integration testing"
echo "  ✅ Error handling verification"
echo "  ✅ Automatic cleanup"
echo ""
echo "To run tests:"
echo "  npm test"