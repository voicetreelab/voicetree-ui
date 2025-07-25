# Terminal Environment Setup for Juggl

When you open a terminal from a Juggl graph node, the plugin attempts to set environment variables to identify the source markdown file. Here are several ways to ensure these variables are available:

## Method 1: Automatic Setup (Recommended)

The plugin creates an environment file at `.obsidian/.terminal_env` in your vault with the source file information. The terminal will attempt to source this automatically.

To ensure this always works, add one of these to your shell RC file:

### For Bash (~/.bashrc)
```bash
# Juggl Terminal Integration - Check current directory
if [ -f ".obsidian/.terminal_env" ]; then
    source ".obsidian/.terminal_env"
fi

# Also check parent directories (useful if terminal starts in subdirectory)
check_dir="$PWD"
while [ "$check_dir" != "/" ]; do
    if [ -f "$check_dir/.obsidian/.terminal_env" ]; then
        source "$check_dir/.obsidian/.terminal_env"
        break
    fi
    check_dir=$(dirname "$check_dir")
done
```

### For Zsh (~/.zshrc)
```zsh
# Juggl Terminal Integration
if [ -f ".obsidian/.terminal_env" ]; then
    source ".obsidian/.terminal_env"
fi
```

## Method 2: Manual Sourcing

After opening a terminal from Juggl, manually run:
```bash
source .obsidian/.terminal_env
```

## Available Environment Variables

- `OBSIDIAN_SOURCE_NOTE` - Full path to the source markdown file
- `OBSIDIAN_SOURCE_BASENAME` - Filename with extension (e.g., "my-note.md")
- `OBSIDIAN_SOURCE_NAME` - Filename without extension (e.g., "my-note")
- `OBSIDIAN_SOURCE_DIR` - Directory containing the source file

## Debugging

1. Check if the env file was created:
   ```bash
   ls -la .obsidian/.terminal_env
   cat .obsidian/.terminal_env
   ```

2. After sourcing, verify variables:
   ```bash
   echo $OBSIDIAN_SOURCE_NOTE
   printenv | grep OBSIDIAN
   ```

## Terminal Plugin Settings

Make sure your Terminal plugin is configured to start in the vault's root directory, not a custom directory, for the automatic sourcing to work.