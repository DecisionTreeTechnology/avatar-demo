# Background Images Guide

## 📁 File Structure

```
public/
  images/
    scenes/
      fertility-clinic/
        ├── background.webp          # Main room background (1920x1080)
        ├── background-fallback.jpg  # JPG fallback
        ├── equipment-overlay.webp   # Medical equipment overlay
        ├── lighting-overlay.webp    # Soft lighting effects
        └── texture-overlay.webp     # Subtle textures
      
      office/
        ├── background.webp          # Corporate office background
        ├── background-fallback.jpg  # JPG fallback
        ├── windows-overlay.webp     # Window blinds/cityscape
        ├── tech-overlay.webp        # Computer screens/tech
        └── furniture-overlay.webp   # Desk/chairs
      
      home/
        ├── background.webp          # Living room background
        ├── background-fallback.jpg  # JPG fallback
        ├── furniture-overlay.webp   # Cozy furniture
        ├── lighting-overlay.webp    # Warm lighting
        └── decor-overlay.webp       # Books/plants/decor
      
      park/
        ├── background.webp          # Park/garden background
        ├── background-fallback.jpg  # JPG fallback
        ├── trees-overlay.webp       # Tree canopy overlay
        ├── sky-overlay.webp         # Sky/clouds
        └── nature-overlay.webp      # Flowers/grass details
```

## 🎨 Image Specifications

### Technical Requirements:
- **Format**: WebP primary, JPG fallback
- **Resolution**: 1920x1080 for backgrounds, 800x600 for overlays
- **Compression**: High quality but optimized (< 200KB each)
- **Color Profile**: sRGB
- **Aspect Ratio**: 16:9 for backgrounds

### Scene-Specific Requirements:

#### 🏥 Fertility Clinic
- **Style**: Clean, modern medical facility
- **Colors**: Soft whites, light blues, warm accents
- **Elements**: Examination room, comfortable seating, natural light
- **Mood**: Professional yet warm and comforting

#### 🏢 Office
- **Style**: Modern corporate boardroom/office
- **Colors**: Professional grays, blues, clean whites
- **Elements**: Conference table, city view, tech equipment
- **Mood**: Professional, efficient, trustworthy

#### 🏠 Home
- **Style**: Cozy living room
- **Colors**: Warm oranges, browns, cream tones
- **Elements**: Comfortable furniture, books, warm lighting
- **Mood**: Relaxed, intimate, welcoming

#### 🌳 Park
- **Style**: Peaceful outdoor setting
- **Colors**: Natural greens, sky blues, earth tones
- **Elements**: Trees, grass, bench, natural lighting
- **Mood**: Fresh, peaceful, energizing

## 🔧 Implementation Methods

### Method 1: CSS Background Images (Recommended)
```css
/* In globals.css */
.mobile-avatar-container[data-scene="fertility_clinic"] {
  background-image: 
    url('/images/scenes/fertility-clinic/lighting-overlay.webp'),
    url('/images/scenes/fertility-clinic/equipment-overlay.webp'),
    url('/images/scenes/fertility-clinic/background.webp');
  background-size: cover, contain, cover;
  background-position: center, right top, center;
  background-repeat: no-repeat;
}
```

### Method 2: Dynamic Loading via React
```typescript
// In personality system
const sceneImages = {
  fertility_clinic: {
    background: '/images/scenes/fertility-clinic/background.webp',
    overlay: '/images/scenes/fertility-clinic/equipment-overlay.webp'
  }
};
```

### Method 3: Hybrid CSS + Images
Combine existing CSS art with real images for best performance.

## 📥 How to Add Images

### Step 1: Prepare Images
1. Resize to specified dimensions
2. Optimize for web (use tools like TinyPNG)
3. Convert to WebP format
4. Keep JPG fallbacks

### Step 2: Place in Folders
Copy images to the appropriate scene folders in `public/images/scenes/`

### Step 3: Update CSS
Add background-image properties to existing scene styles

### Step 4: Test Performance
Ensure images load quickly and don't impact avatar rendering

## 🚀 Quick Start Example

Save this as a test image in `public/images/scenes/fertility-clinic/test.jpg`:
```css
.mobile-avatar-container[data-scene="fertility_clinic"] {
  background-image: 
    url('/images/scenes/fertility-clinic/test.jpg'),
    /* existing gradients... */;
  background-blend-mode: overlay;
  background-size: cover, /* existing sizes... */;
}
```

## 🎯 Best Practices

1. **Layer Order**: Images first, then CSS gradients/patterns
2. **Blend Modes**: Use `overlay`, `soft-light`, or `multiply` for integration
3. **Fallbacks**: Always include CSS-only fallbacks
4. **Performance**: Lazy load non-critical overlays
5. **Accessibility**: Maintain contrast ratios
6. **Responsive**: Test on mobile devices

## 🔍 Finding Images

### Stock Photo Sources:
- **Unsplash**: Free high-quality photos
- **Pexels**: Free stock photos
- **Shutterstock**: Premium stock photos
- **Getty Images**: Professional stock photos

### Search Terms:
- **Fertility Clinic**: "medical consultation room", "fertility clinic interior", "modern healthcare facility"
- **Office**: "corporate boardroom", "modern office interior", "business meeting room"
- **Home**: "cozy living room", "warm home interior", "comfortable furniture"
- **Park**: "peaceful park", "garden setting", "natural outdoor space"

### AI Generation:
- **Midjourney**: High-quality AI-generated images
- **DALL-E**: AI image generation
- **Stable Diffusion**: Open-source AI images

## ⚡ Performance Optimization

### Image Optimization:
```bash
# Convert to WebP
cwebp input.jpg -q 80 -o output.webp

# Resize images
convert input.jpg -resize 1920x1080 output.jpg
```

### Lazy Loading:
```css
.scene-image {
  background-image: none; /* Load after page ready */
}

.scene-image.loaded {
  background-image: url('/images/scene.webp');
}
```

Would you like me to implement any of these methods or help you set up a specific image integration approach?
