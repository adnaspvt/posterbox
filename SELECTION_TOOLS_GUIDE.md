# Advanced Selection & Area Detection Tools Guide

## Overview

Your Posterbox editor now includes professional-grade selection and area detection tools similar to Photoshop. These features allow you to select image areas and apply effects with precision.

## Features Included

### 1. **Selection Tools** 🎯

#### Magic Wand (✨)
- **What it does**: Selects areas of similar colors with one click
- **How to use**: 
  1. Go to the "Select" tab in the toolbar
  2. Click "Open Selection Tools"
  3. Choose "Magic Wand" tool
  4. Adjust "Color Tolerance" (0-100)
  5. Click on the area you want to select
- **Tolerance**: Higher values select more colors, lower values are more precise
- **Best for**: Selecting uniform colored backgrounds, skies, or solid areas

#### Brush Selection (🖌️)
- **What it does**: Freehand drawing to select areas
- **How to use**:
  1. Select "Brush" tool
  2. Adjust brush size (1-50px)
  3. Click and drag to draw selection
  4. Paint multiple strokes to add to selection
- **Brush Size**: Larger sizes cover more area, smaller for precise work
- **Best for**: Complex shapes, fine details, custom selections

#### Rectangle Selection (⬜)
- **What it does**: Selects rectangular areas
- **How to use**:
  1. Choose "Rectangle" tool
  2. Click and drag to create rectangle
  3. Release to complete selection
- **Best for**: Straight-edged objects, borders, panels

#### Circle/Ellipse Selection (⭕)
- **What it does**: Selects circular or elliptical areas
- **How to use**:
  1. Select "Circle" tool
  2. Click center point and drag to define radius
  3. Release to complete selection
- **Tip**: Drag to create ellipses (different width and height)
- **Best for**: Circular objects, vignettes, circular frames

#### Lasso Selection (🔗)
- **What it does**: Free polygon selection by drawing points
- **How to use**:
  1. Choose "Lasso" tool
  2. Click multiple points to create polygon
  3. At least 3 points required
  4. Click again on first point or release to complete
- **Best for**: Irregular shapes, complex outlines

### 2. **Auto-Detection** 🤖

#### Automatic Area Detection
- **What it does**: AI-powered edge detection to find distinct areas automatically
- **How to use**:
  1. Open Selection Tools
  2. Click "🤖 Auto Detect Areas" button
  3. Tool analyzes image and finds edges
  4. Combines all detected areas into one selection
- **How it works**: Uses Sobel edge detection algorithm
- **Best for**: Finding objects with clear edges, multiple distinct elements

### 3. **Selection Modes**

Combine multiple selections with different modes:

| Mode | Icon | Effect |
|------|------|--------|
| **Replace** | ⊕ | Discard old selection, create new one |
| **Add** | + Add | Combine selections together |
| **Subtract** | - Subtract | Remove area from selection |
| **Intersect** | ∩ Intersect | Keep only overlapping area |

### 4. **Selection Operations**

#### Feather Selection
- **What it does**: Softens selection edges
- **Range**: 0-50 pixels
- **Effect**: Creates smooth transitions between selected and non-selected areas
- **Best for**: Vignettes, soft edges, natural-looking selections

#### Invert Selection (↔️)
- **What it does**: Reverses selection (selects everything except current selection)
- **Use case**: Select background instead of object

#### Clear Selection (🗑️)
- **What it does**: Remove current selection
- **Shortcut**: Click "Clear Selection" button

## Effects for Selections 🎨

Once you have a selection active, you can apply effects only to that area:

### Available Effects

| Effect | Icon | What it does |
|--------|------|--------------|
| **Brightness** | ☀️ | Make selected area brighter |
| **Darken** | 🌙 | Make selected area darker |
| **Saturate** | 🌈 | Increase color intensity |
| **Grayscale** | ⚫ | Convert to grayscale |
| **Sepia** | 📸 | Apply vintage sepia tone |
| **Invert** | 🔄 | Invert colors |
| **Cool** | ❄️ | Add cool blue tones |
| **Warm** | 🔥 | Add warm orange tones |

### How to Apply Effects

1. **Make a Selection** using any selection tool
2. **Go to Selection Panel** in the "Select" tab
3. **Choose an Effect** from the effects list
4. **Adjust Intensity** (0-100%)
5. **Click "Apply Effect"**
6. **Effect applies only to selected area**

## Step-by-Step Tutorials

### Tutorial 1: Select and Brighten an Object

```
1. Open "Select" tab → "Open Selection Tools"
2. Choose "Brush" tool
3. Set brush size to 10px
4. Paint over the object you want to brighten
5. Close Selection Tools (or switch tabs)
6. Notice selection is now active in the Select tab
7. Open Advanced Image Editor
8. Choose "☀️ Brightness" effect
9. Set intensity to 70%
10. Click "Apply Effect"
11. Object is now brighter!
```

### Tutorial 2: Auto-Select and Apply Sepia Tone

```
1. Go to "Select" → "Open Selection Tools"
2. Click "🤖 Auto Detect Areas"
3. Wait for detection to complete
4. You'll see selection preview
5. Close the tool
6. Selection is now active
7. Open Advanced Image Editor
8. Choose "📸 Sepia" effect
9. Set intensity to 80%
10. Click "Apply Effect"
11. Selected areas now have vintage sepia tone!
```

### Tutorial 3: Darken Background with Inverse Selection

```
1. Select the "Rectangle" tool
2. Draw rectangle around the main object
3. Click "↔️ Invert" button to select everything EXCEPT the object
4. Now the background is selected
5. Open Advanced Image Editor
6. Choose "🌙 Darken" effect
7. Set intensity to 60%
8. Click "Apply Effect"
9. Background is darkened, object stays bright!
```

## Technical Details

### Algorithms Used

#### Magic Wand (Flood Fill)
- Uses BFS (Breadth-First Search) for pixel traversal
- Compares color distance using Euclidean formula
- Efficient for large uniform areas

#### Edge Detection (Auto Detect)
- Sobel edge detection operator
- 3x3 kernel convolution
- Detects intensity gradients
- Finds contiguous regions

#### Brush Selection
- Creates circular brush at each point
- Interpolates between points for smooth lines
- Removes duplicates with Set data structure

#### Lasso Selection
- Polygon rasterization using ray casting
- Scanline algorithm for filling
- Accurate for complex shapes

### Performance

- **Selection Storage**: Pixels stored as 2D coordinates
- **Memory**: ~8 bytes per selected pixel
- **Large Selections**: Up to 1 million pixels (typically)
- **Effect Application**: Processes pixels in parallel for speed

## Best Practices

### ✅ DO

- **Use Magic Wand** for uniform colored areas
- **Use Brush** for detailed, complex selections
- **Use Rectangle/Circle** for geometric objects
- **Feather edges** (5-20px) for natural transitions
- **Add selections** (+ mode) to combine multiple tools
- **Test on copies** before applying permanent effects

### ❌ DON'T

- **Don't use high tolerance** on Magic Wand for precise selections
- **Don't forget to feather** when you want soft edges
- **Don't apply 100% intensity** without testing first
- **Don't use small brush size** for large areas (slow)
- **Don't close tools** without noting your selection

## Troubleshooting

### Selection Won't Select the Right Area

**Problem**: Magic Wand selects too much or too little
**Solution**: Adjust Color Tolerance
- Increase tolerance if it's selecting too little
- Decrease tolerance if it's selecting too much

### Brush Selection is Jagged

**Problem**: Selection lines look rough
**Solution**: 
- Use larger brush size for smoother lines
- Apply feathering (10-15px) to soften edges

### Auto-Detect Not Finding Areas

**Problem**: Automatic detection finds no areas
**Solution**:
- Image may have soft edges instead of hard edges
- Try using manual selection tools instead
- Increase contrast in image first if possible

### Effect Isn't Visible

**Problem**: Applied effect doesn't show
**Solution**:
- Check that selection is active (see indicator in Select tab)
- Try higher intensity value
- Ensure effect was applied (watch for toast notification)

## Advanced Techniques

### Technique 1: Selective Color Adjustment
1. Select object with Brush tool
2. Apply Saturate effect (80% intensity)
3. Creates vibrant version with neutral background

### Technique 2: Vignette Effect
1. Use Circle tool to select center
2. Invert selection (↔️) to select edges
3. Feather edges (20px)
4. Apply Darken effect (50%)
5. Creates professional vignette

### Technique 3: Selective Grayscale
1. Select background with Magic Wand
2. Apply Grayscale effect (100%)
3. Main object stays colored, background is B&W

### Technique 4: Dodge and Burn
1. Use Brush to select area
2. Apply Brightness for "dodge" effect
3. Or apply Darken for "burn" effect
4. Adjust intensity for subtle/dramatic effect

## Keyboard Shortcuts

- **Ctrl+Z**: Undo last effect
- **Ctrl+Y**: Redo effect
- **Escape**: Close selection tools

## Storage & Compatibility

Selections are stored as:
```javascript
{
  pixels: [[x1, y1], [x2, y2], ...],
  type: 'brush|rectangle|lasso|etc',
  ... (additional properties)
}
```

Selections are **not** automatically saved. To keep them:
1. Take a screenshot before publishing
2. Or apply effects before saving campaign

## File Locations

- **Algorithms**: `src/utils/selectionAlgorithms.js`
- **Selection UI**: `src/components/SelectionTools.jsx`
- **Effects UI**: `src/components/AdvancedImageEditor.jsx`
- **Editor Integration**: `src/components/ProEditor.jsx` (Select tab)

## Future Enhancements

Planned features:
- [ ] Gaussian blur for selections
- [ ] Liquify tool
- [ ] Content-aware fill
- [ ] AI-powered object detection
- [ ] Selection history/undo within tools
- [ ] Save/load selections
- [ ] Batch apply effects to multiple selections

## Support

For issues or feature requests, check:
1. Troubleshooting section above
2. Console errors (F12)
3. Toast notifications for error messages

---

**Version**: 1.0
**Last Updated**: 2026-05-15
**Compatibility**: All modern browsers (Chrome, Firefox, Safari, Edge)
