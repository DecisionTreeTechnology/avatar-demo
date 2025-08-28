// Test utilities for mocking avatar functionality
export const mockAvatarForTesting = () => {
  // Mock the talking head functionality for faster tests
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    // Only apply mocks in test environment
    const originalCreateElement = document.createElement.bind(document);
    
    // Override canvas creation to prevent WebGL initialization in tests
    document.createElement = function(tagName: string) {
      if (tagName.toLowerCase() === 'canvas') {
        const canvas = originalCreateElement('canvas') as HTMLCanvasElement;
        // Mock the WebGL context
        const mockGL = {
          getExtension: () => null,
          getSupportedExtensions: () => [],
          getParameter: () => 'Mock WebGL',
          createShader: () => ({}),
          createProgram: () => ({}),
          attachShader: () => {},
          linkProgram: () => {},
          useProgram: () => {},
          // Add other WebGL methods as needed
        };
        
        canvas.getContext = (contextType: string) => {
          if (contextType === 'webgl' || contextType === 'webgl2') {
            return mockGL as any;
          }
          return originalCreateElement('canvas').getContext(contextType);
        };
        
        return canvas;
      }
      return originalCreateElement(tagName);
    };
  }
};

export const enableTestMode = () => {
  if (typeof window !== 'undefined') {
    // Set a flag to indicate we're in test mode
    (window as any).__AVATAR_TEST_MODE__ = true;
  }
};

export const isTestMode = () => {
  return typeof window !== 'undefined' && (window as any).__AVATAR_TEST_MODE__;
};
