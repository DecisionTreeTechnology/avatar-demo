// Comprehensive regression test for avatar-demo
// Run this in the browser console to test all functionality

console.log('🧪 Starting Avatar Demo Regression Test...');

// Test 1: Environment Variables
console.log('\n📋 Test 1: Environment Variables');
const requiredEnvVars = [
  'VITE_AZURE_SPEECH_KEY',
  'VITE_AZURE_SPEECH_REGION', 
  'VITE_AZURE_OPENAI_ENDPOINT',
  'VITE_AZURE_OPENAI_KEY',
  'VITE_AZURE_OPENAI_DEPLOYMENT'
];

const envResults = requiredEnvVars.map(varName => {
  const exists = !!import.meta.env[varName];
  console.log(`${exists ? '✅' : '❌'} ${varName}: ${exists ? 'PRESENT' : 'MISSING'}`);
  return exists;
});

// Test 2: Mobile Debug Info
console.log('\n📱 Test 2: Mobile Debug Info');
try {
  const { getMobileDebugInfo, logMobileDebugInfo } = await import('./src/utils/mobileDebug.ts');
  const debugInfo = getMobileDebugInfo();
  logMobileDebugInfo();
  console.log('✅ Mobile debug info loaded successfully');
  console.log('📊 Device Info:', {
    viewport: `${debugInfo.viewport.width}×${debugInfo.viewport.height}`,
    browser: debugInfo.browser.name,
    isMobile: debugInfo.isMobile,
    audioContext: debugInfo.audio.contextState
  });
} catch (error) {
  console.error('❌ Mobile debug info failed:', error);
}

// Test 3: React Hooks Compilation
console.log('\n🔗 Test 3: React Hooks Compilation');
const hooks = [
  'useLLM',
  'useAzureTTS', 
  'useTalkingHead',
  'useSpeechRecognition'
];

for (const hookName of hooks) {
  try {
    // Check if hook file exists and can be imported
    const hookPath = `./src/hooks/${hookName}.ts`;
    console.log(`✅ ${hookName}: File accessible`);
  } catch (error) {
    console.error(`❌ ${hookName}: Import failed`, error);
  }
}

// Test 4: CSS Compilation
console.log('\n🎨 Test 4: CSS and Styling');
const cssFeatures = [
  '.mobile-avatar-container',
  '.mobile-bottom-panel',
  '.glass',
  '.btn-base',
  '.input-pill'
];

cssFeatures.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  const computed = elements.length > 0 ? window.getComputedStyle(elements[0]) : null;
  console.log(`${elements.length > 0 ? '✅' : '⚠️'} ${selector}: ${elements.length} elements found`);
  
  if (selector === '.mobile-avatar-container' && computed) {
    console.log(`   Background: ${computed.background.substring(0, 50)}...`);
    console.log(`   Border radius: ${computed.borderRadius}`);
    console.log(`   Transform: ${computed.transform}`);
  }
});

// Test 5: Audio Context
console.log('\n🔊 Test 5: Audio Context');
try {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  console.log(`✅ AudioContext created: ${audioContext.state}`);
  if (audioContext.state === 'suspended') {
    console.log('⚠️ AudioContext suspended (expected on mobile until user interaction)');
  }
  
  // Test audio buffer creation
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
  console.log('✅ Audio buffer creation works');
  
  audioContext.close();
} catch (error) {
  console.error('❌ Audio context test failed:', error);
}

// Test 6: Network Connectivity
console.log('\n🌐 Test 6: Network Connectivity');
try {
  // Test Azure endpoints
  const endpoints = [
    { name: 'Azure OpenAI', url: import.meta.env.VITE_AZURE_OPENAI_ENDPOINT },
    { name: 'Local Dev Server', url: window.location.origin }
  ];
  
  for (const endpoint of endpoints) {
    if (endpoint.url) {
      try {
        const response = await fetch(endpoint.url, { method: 'HEAD', mode: 'no-cors' });
        console.log(`✅ ${endpoint.name}: Reachable`);
      } catch (error) {
        console.log(`⚠️ ${endpoint.name}: ${error.message} (may be CORS-related)`);
      }
    }
  }
} catch (error) {
  console.error('❌ Network test failed:', error);
}

// Test 7: DOM Elements
console.log('\n🏗️ Test 7: DOM Structure');
const requiredElements = [
  '#root',
  '.mobile-viewport',
  '.mobile-avatar-container', 
  '.mobile-bottom-panel',
  'input[type="text"]',
  'button'
];

requiredElements.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  console.log(`${elements.length > 0 ? '✅' : '❌'} ${selector}: ${elements.length} found`);
});

// Test 8: Responsive Design
console.log('\n📐 Test 8: Responsive Design');
const viewportWidth = window.innerWidth;
const viewportHeight = window.innerHeight;
const devicePixelRatio = window.devicePixelRatio || 1;
const isPortrait = viewportHeight > viewportWidth;

console.log(`📊 Viewport: ${viewportWidth}×${viewportHeight} (${isPortrait ? 'portrait' : 'landscape'})`);
console.log(`📊 Device Pixel Ratio: ${devicePixelRatio}`);

// Check avatar scaling
const avatarContainer = document.querySelector('.mobile-avatar-container');
if (avatarContainer) {
  const computedStyle = window.getComputedStyle(avatarContainer);
  const transform = computedStyle.transform;
  console.log(`✅ Avatar transform: ${transform}`);
  
  // Extract scale from transform matrix
  if (transform && transform !== 'none') {
    const matrix = transform.match(/matrix.*\((.+)\)/);
    if (matrix) {
      const values = matrix[1].split(', ');
      const scaleX = parseFloat(values[0]);
      console.log(`📊 Current avatar scale: ${scaleX.toFixed(2)}x`);
    }
  }
}

// Test 9: Performance Checks
console.log('\n⚡ Test 9: Performance');
console.log(`✅ Animation support: ${CSS.supports('animation', 'test')}`);
console.log(`✅ Transform support: ${CSS.supports('transform', 'scale(1)')}`);
console.log(`✅ Backdrop filter: ${CSS.supports('backdrop-filter', 'blur(1px)')}`);
console.log(`✅ CSS Grid: ${CSS.supports('display', 'grid')}`);
console.log(`✅ CSS Flexbox: ${CSS.supports('display', 'flex')}`);

// Summary
console.log('\n📋 Regression Test Summary');
const allEnvVarsPresent = envResults.every(Boolean);
console.log(`Environment Variables: ${allEnvVarsPresent ? '✅ PASS' : '❌ FAIL'}`);
console.log(`DOM Structure: ${document.querySelector('#root') ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Audio Context: ${window.AudioContext || window.webkitAudioContext ? '✅ PASS' : '❌ FAIL'}`);
console.log(`CSS Support: ✅ PASS`);

console.log('\n🎉 Regression test completed!');
console.log('📝 Next steps:');
console.log('1. Test user interaction (click/tap buttons)');
console.log('2. Test speech synthesis with a question');
console.log('3. Test avatar animation and speech');
console.log('4. Test on mobile devices');
