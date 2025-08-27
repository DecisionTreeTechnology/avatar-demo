/**
 * Test script to verify encryption/decryption functionality
 * Run this in the browser console to test
 */

// Test the decryption utility
async function testDecryption() {
  const { decryptString, getDecryptedEnvVar } = await import('./utils/encryption.js');
  
  console.log('Testing decryption...');
  
  // Test decrypting the Azure Speech Key
  const encryptedKey = 'InRXTVQ0SipHUkYhN0EiM3AyVEUuWFVZWSFMKkVUMVVHTzYjUCZXKClwJzdvLDJZQkpVQikwMCl3dyEnICInOCdVdDcpcVZxICAgICAiLiZRKEgw';
  
  try {
    const decrypted = await decryptString(encryptedKey);
    console.log('Decrypted key:', decrypted.substring(0, 20) + '...');
    
    // Test getting environment variables
    const envKey = await getDecryptedEnvVar('VITE_AZURE_SPEECH_KEY');
    console.log('Environment key:', envKey?.substring(0, 20) + '...');
    
    const endpoint = await getDecryptedEnvVar('VITE_AZURE_OPENAI_ENDPOINT');
    console.log('Environment endpoint:', endpoint);
    
  } catch (error) {
    console.error('Decryption test failed:', error);
  }
}

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).testDecryption = testDecryption;
  console.log('Run testDecryption() to test the encryption system');
}

export { testDecryption };
