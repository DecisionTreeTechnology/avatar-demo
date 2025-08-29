import React, { useState, useEffect } from 'react';

interface SceneBackgroundExampleProps {
  sceneName: 'fertility_clinic' | 'professional' | 'casual' | 'friendly';
  useRealImages?: boolean;
}

/**
 * Example component showing how to integrate background images with the avatar scenes
 * This demonstrates the three approaches mentioned in the IMAGE_GUIDE.md:
 * 1. CSS background-image (recommended)
 * 2. React dynamic loading
 * 3. Hybrid CSS + React approach
 */
export const SceneBackgroundExample: React.FC<SceneBackgroundExampleProps> = ({
  sceneName,
  useRealImages = false
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Method 1: CSS Background-Image (recommended approach)
  // This uses the CSS classes we just added to globals.css
  const getCSSBackgroundClass = () => {
    if (!useRealImages) return '';
    
    const sceneClasses = {
      fertility_clinic: 'scene-fertility-clinic',
      professional: 'scene-professional',
      casual: 'scene-casual',
      friendly: 'scene-friendly'
    };
    
    return `scene-with-background-image ${sceneClasses[sceneName]}`;
  };

  // Method 2: React Dynamic Loading (for more control)
  const getImagePath = () => {
    const scenePaths = {
      fertility_clinic: '/images/scenes/fertility-clinic/background.webp',
      professional: '/images/scenes/office/background.webp',
      casual: '/images/scenes/home/background.webp',
      friendly: '/images/scenes/park/background.webp'
    };
    
    return scenePaths[sceneName];
  };

  // Test if image exists and load it
  useEffect(() => {
    if (!useRealImages) return;

    const img = new Image();
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageError(true);
    img.src = getImagePath();
  }, [sceneName, useRealImages]);

  // Method 3: Hybrid approach - React component with CSS fallback
  const getInlineBackgroundStyle = () => {
    if (!useRealImages || imageError) return {};
    
    return {
      backgroundImage: `url('${getImagePath()}'), var(--${sceneName.replace('_', '-')}-css-fallback)`,
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center, center',
      backgroundRepeat: 'no-repeat, no-repeat',
      backgroundBlendMode: 'overlay, normal'
    };
  };

  return (
    <div className="scene-background-example">
      <h3>Scene Background Integration Example</h3>
      <p>Scene: {sceneName}</p>
      <p>Using real images: {useRealImages ? 'Yes' : 'No (CSS art only)'}</p>
      
      {/* Method 1: Pure CSS approach (recommended) */}
      <div className="method-example">
        <h4>Method 1: CSS Background Classes</h4>
        <div 
          className={`mobile-avatar-container ${getCSSBackgroundClass()}`}
          data-scene={sceneName}
          style={{ height: '200px', margin: '10px 0' }}
        >
          <div style={{ padding: '20px', color: 'white', background: 'rgba(0,0,0,0.5)' }}>
            Avatar would appear here
          </div>
        </div>
      </div>

      {/* Method 2: React dynamic loading */}
      {useRealImages && (
        <div className="method-example">
          <h4>Method 2: React Dynamic Loading</h4>
          <div 
            className="mobile-avatar-container"
            data-scene={sceneName}
            style={{ 
              height: '200px', 
              margin: '10px 0',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {imageLoaded && !imageError && (
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: `url('${getImagePath()}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.7,
                  zIndex: -1
                }}
              />
            )}
            <div style={{ padding: '20px', color: 'white', background: 'rgba(0,0,0,0.5)' }}>
              Avatar would appear here
              <br />
              <small>
                Image loaded: {imageLoaded ? 'Yes' : 'No'} | 
                Error: {imageError ? 'Yes' : 'No'}
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Method 3: Hybrid inline styles */}
      {useRealImages && (
        <div className="method-example">
          <h4>Method 3: Hybrid CSS + React</h4>
          <div 
            className="mobile-avatar-container"
            data-scene={sceneName}
            style={{ 
              height: '200px', 
              margin: '10px 0',
              ...getInlineBackgroundStyle()
            }}
          >
            <div style={{ padding: '20px', color: 'white', background: 'rgba(0,0,0,0.5)' }}>
              Avatar would appear here
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="instructions" style={{ 
        padding: '15px', 
        background: '#f0f9ff', 
        borderRadius: '8px',
        marginTop: '20px',
        fontSize: '14px'
      }}>
        <h4>How to add background images:</h4>
        <ol>
          <li>Place your images in: <code>public/images/scenes/{sceneName}/background.webp</code></li>
          <li>For Method 1 (recommended): Just add the CSS classes to your avatar container</li>
          <li>For Method 2: Use React state management for more control</li>
          <li>For Method 3: Combine inline styles with CSS variables</li>
        </ol>
        <p><strong>File naming:</strong> Use .webp format, 1920x1080 resolution, under 200KB</p>
        <p><strong>Fallback:</strong> CSS art automatically shows if images fail to load</p>
      </div>
    </div>
  );
};

export default SceneBackgroundExample;
