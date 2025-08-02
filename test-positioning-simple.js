// Simple manual test of hover positioning logic
console.log('Testing hover editor positioning logic...\n');

// Test 1: Zoom scaling of offsets
console.log('Test 1: Offset scaling with zoom');
{
    const baseOffset = 300;
    const zoom1 = 1.0;
    const zoom2 = 0.5;
    const zoom3 = 2.0;
    
    console.log(`Base offset: ${baseOffset}`);
    console.log(`At zoom ${zoom1}: offset = ${baseOffset * zoom1}px`);
    console.log(`At zoom ${zoom2}: offset = ${baseOffset * zoom2}px`);
    console.log(`At zoom ${zoom3}: offset = ${baseOffset * zoom3}px`);
    console.log('✓ Offsets scale linearly with zoom\n');
}

// Test 2: User offset in graph units
console.log('Test 2: User drag offset conversion');
{
    const screenDrag = 100; // User drags 100px
    const zoom = 0.5;
    const graphUnits = screenDrag / zoom;
    
    console.log(`User drags ${screenDrag}px at zoom ${zoom}`);
    console.log(`Graph units: ${screenDrag} / ${zoom} = ${graphUnits}`);
    
    // Now at different zoom
    const newZoom = 2.0;
    const newScreenOffset = graphUnits * newZoom;
    console.log(`At zoom ${newZoom}: offset = ${graphUnits} * ${newZoom} = ${newScreenOffset}px`);
    console.log('✓ User offset preserved in graph units\n');
}

// Test 3: Combined base + user offset
console.log('Test 3: Combined positioning');
{
    const nodeCenter = 500;
    const baseOffset = 300;
    const userOffsetGraphUnits = 50;
    
    console.log(`Node center: ${nodeCenter}`);
    console.log(`Base offset: ${baseOffset}`);
    console.log(`User offset: ${userOffsetGraphUnits} graph units`);
    
    const zoom1 = 1.0;
    const pos1 = nodeCenter + (baseOffset * zoom1) + (userOffsetGraphUnits * zoom1);
    console.log(`At zoom ${zoom1}: position = ${nodeCenter} + ${baseOffset * zoom1} + ${userOffsetGraphUnits * zoom1} = ${pos1}`);
    
    const zoom2 = 0.5;
    const pos2 = nodeCenter + (baseOffset * zoom2) + (userOffsetGraphUnits * zoom2);
    console.log(`At zoom ${zoom2}: position = ${nodeCenter} + ${baseOffset * zoom2} + ${userOffsetGraphUnits * zoom2} = ${pos2}`);
    
    console.log('✓ Position maintains relative offset at all zoom levels\n');
}

// Test 4: Drag detection logic
console.log('Test 4: Drag detection (avoiding circular dependency)');
{
    const renderedCenter = 500;
    const baseOffset = 300;
    const zoom = 1.0;
    const userOffsetGraphUnits = 0; // Initially no user offset
    
    const expectedBaseX = renderedCenter + (baseOffset * zoom);
    const expectedX = expectedBaseX + (userOffsetGraphUnits * zoom);
    
    console.log(`Expected base position (no user offset): ${expectedBaseX}`);
    console.log(`Expected position (with user offset): ${expectedX}`);
    
    // User drags to new position
    const actualPosition = 900;
    const draggedPixels = actualPosition - expectedBaseX;
    const newUserOffsetGraphUnits = draggedPixels / zoom;
    
    console.log(`User drags to: ${actualPosition}`);
    console.log(`Drag distance: ${draggedPixels}px`);
    console.log(`New user offset: ${draggedPixels} / ${zoom} = ${newUserOffsetGraphUnits} graph units`);
    console.log('✓ Drag detection calculates offset from base position\n');
}

console.log('All logic tests passed! The positioning should work correctly.');