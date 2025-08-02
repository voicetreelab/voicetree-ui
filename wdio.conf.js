export const config = {
    //
    // Test runner services
    //
    runner: 'local',
    
    //
    // Specify test files
    //
    specs: [
        './test/specs/**/*.spec.js'
    ],
    
    // Patterns to exclude
    exclude: [],
    
    //
    // Test capabilities
    //
    maxInstances: 1,
    capabilities: [{
        maxInstances: 1,
        browserName: 'obsidian',
        'obsidian:options': {
            // Use our test vault
            vault: '/Users/bobbobby/repos/VoiceTree/markdownTreeVault',
            
            // Plugin configuration
            plugins: {
                // Enable required plugins
                'juggl': true,
                'terminal': true,
                'obsidian-hover-editor': true
            },
            
            // Test timeout
            timeout: 30000,
            
            // Keep Obsidian open for debugging
            headless: false,
            
            // Additional Obsidian options
            obsidianOptions: {
                // Disable safe mode
                safeMode: false,
                
                // Enable developer mode
                developerMode: true
            }
        }
    }],
    
    //
    // Test configuration
    //
    logLevel: 'info',
    bail: 0,
    baseUrl: '',
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    
    //
    // Test framework
    //
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },
    
    //
    // Services
    //
    services: [
        ['obsidian', {
            // Obsidian executable path (auto-detected on macOS)
            // obsidianPath: '/Applications/Obsidian.app',
            
            // Plugin build before tests
            buildPlugin: true,
            
            // Build command
            buildCommand: './build.sh'
        }]
    ],
    
    //
    // Reporters
    //
    reporters: ['spec'],
    
    //
    // Hooks
    //
    onPrepare: function (config, capabilities) {
        console.log('🧪 Preparing Obsidian terminal integration tests...');
    },
    
    before: function (capabilities, specs) {
        console.log('🚀 Starting test session...');
    },
    
    afterTest: function(test, context, { error, result, duration, passed, retries }) {
        if (error) {
            console.log('❌ Test failed:', test.title);
            console.log('Error:', error.message);
        } else {
            console.log('✅ Test passed:', test.title);
        }
    },
    
    after: function (result, capabilities, specs) {
        console.log('🎯 Test session complete');
    }
};