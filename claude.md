1. Keep npm run dev actively running in a terminal
   - This watches for file changes and automatically rebuilds main.js
   - The -w flag in the script means "watch mode"
2. After making code changes, wait for the build to complete
   - You'll see build output in the terminal where npm run dev is running
3. Copy the built files to your vault:
   cp main.js manifest.json styles.css /Users/bobbobby/repos/VoiceTreePoc/markdownTreeVault/.obsidian/plugins/juggl/
4. Reload the plugin in Obsidian:
   - Go to Settings → Community plugins
   - Toggle Juggl OFF then ON
   - OR completely restart Obsidian (Cmd+Q on Mac)
