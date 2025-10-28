// Quick Test Script
console.log('Starting test...');

try {
  console.log('1. Loading modules...');
  const express = require('express');
  console.log('  ✅ express loaded');

  const productionTools = require('./production-tools');
  console.log('  ✅ production-tools loaded');

  console.log('\n2. Testing PowerPoint creation...');
  const testParams = {
    title: 'Test Presentation',
    slides: [
      {
        title: 'Slide 1',
        content: ['Point 1', 'Point 2']
      }
    ]
  };

  productionTools.createPowerPoint(testParams)
    .then(result => {
      console.log('  ✅ PowerPoint test successful!');
      console.log('  Result:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('  ❌ PowerPoint test failed:', error.message);
      console.error('  Stack:', error.stack);
      process.exit(1);
    });

} catch (error) {
  console.error('❌ Module loading failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}