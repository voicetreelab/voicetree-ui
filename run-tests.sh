#!/bin/bash

echo "🧪 Juggl Terminal Integration Test Runner"
echo "========================================"

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "test-terminal-integration.js" ]; then
    echo "❌ test-terminal-integration.js not found. Run from juggl-main directory."
    exit 1
fi

echo "📋 Starting terminal integration tests..."
echo ""

# Run the test
node test-terminal-integration.js

echo ""
echo "🎯 Test run complete!"
echo ""
echo "Next steps:"
echo "1. Check the Obsidian Developer Console (Cmd+Option+I)"
echo "2. Look for '[Juggl Debug]' messages"
echo "3. Test the terminal functionality manually"
echo "4. Copy test-commands.js content into the console for automated testing"