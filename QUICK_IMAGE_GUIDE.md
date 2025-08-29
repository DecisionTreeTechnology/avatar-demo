# Quick Background Image Integration Guide

## 🚀 Ready to Use Setup

Your avatar demo is now ready for background images! Here's how to add them:

### 1. File Structure (Already Created)
```
public/images/scenes/
├── fertility-clinic/
│   ├── background.webp          # Main background (1920x1080, <200KB)
│   ├── equipment-overlay.webp   # Optional medical equipment overlay
│   └── lighting-overlay.webp    # Optional lighting effects
├── office/
│   └── background.webp
├── home/
│   └── background.webp
└── park/
│   └── background.webp
```

### 2. Three Integration Methods

#### Method 1: CSS Classes (Recommended) ✅
The easiest approach - CSS automatically handles everything:

```typescript
// In your avatar container component, simply add:
<div 
  className="mobile-avatar-container scene-with-background-image scene-fertility-clinic"
  data-scene="fertility_clinic"
>
  {/* Your avatar content */}
</div>
```

**Benefits:**
- Automatic fallback to CSS art if image fails
- Optimized performance
- No JavaScript required

#### Method 2: React Dynamic Loading
For more control over loading states:

```typescript
const [imageLoaded, setImageLoaded] = useState(false);

useEffect(() => {
  const img = new Image();
  img.onload = () => setImageLoaded(true);
  img.src = '/images/scenes/fertility-clinic/background.webp';
}, []);

// Then conditionally render background
```

#### Method 3: Hybrid Approach
Combine React control with CSS fallbacks:

```typescript
const backgroundStyle = {
  backgroundImage: `url('/images/scenes/fertility-clinic/background.webp'), var(--fertility-css-fallback)`,
  backgroundSize: 'cover, cover',
  backgroundBlendMode: 'overlay, normal'
};
```

### 3. Current Implementation Status

✅ **Already Working:**
- CSS art backgrounds for all 4 scenes
- Automatic scene switching based on personality
- Enhanced visual realism with CSS effects
- Directory structure for images
- CSS classes for image integration

🔄 **To Add Images:**
1. Source/create background images (see IMAGE_GUIDE.md for specs)
2. Save as WebP format in the proper directories
3. Images will automatically layer over CSS art
4. CSS art provides fallback if images fail

### 4. Testing Your Implementation

Use the example component:
```typescript
import SceneBackgroundExample from './components/SceneBackgroundExample';

// Test with CSS art only
<SceneBackgroundExample sceneName="fertility_clinic" useRealImages={false} />

// Test with real images (when you add them)
<SceneBackgroundExample sceneName="fertility_clinic" useRealImages={true} />
```

### 5. Image Specifications

- **Format:** WebP (with JPEG fallback)
- **Resolution:** 1920x1080 (16:9 aspect ratio)
- **File size:** <200KB for fast loading
- **Optimization:** Use tools like Squoosh.app or ImageOptim

### 6. Next Steps

1. **Source Images:** Find or create fertility clinic, office, home, and park backgrounds
2. **Optimize:** Convert to WebP and compress to <200KB
3. **Test:** Use the SceneBackgroundExample component to validate
4. **Deploy:** Images will automatically integrate with existing avatar system

### 7. Recommended Image Sources

- **Free:** Unsplash, Pexels, Pixabay (check licensing)
- **Stock:** Shutterstock, Getty Images (for commercial use)
- **AI Generated:** Midjourney, DALL-E, Stable Diffusion
- **Custom Photography:** Hire photographer for unique clinic shots

### 8. Performance Notes

- Images load asynchronously
- CSS art shows immediately as fallback
- WebP format provides 25-35% smaller file sizes
- Lazy loading prevents impact on initial page load

## 🎯 Current Status: Ready for Images!

Your app now has:
- ✅ Complete CSS art implementation
- ✅ Image integration infrastructure
- ✅ Automatic fallback system
- ✅ Performance optimizations
- ✅ All 4 personality scenes enhanced

Just add the images when ready, and they'll automatically integrate!
