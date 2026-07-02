# Quick Start: Selection Tools 🎯

## What Just Got Added?

Your Posterbox editor now has professional image selection tools, just like Photoshop!

## 5-Minute Quick Start

### Step 1: Open Selection Tools
```
1. Go to "Select" tab in the right toolbar
2. Click "➕ Open Selection Tools"
3. A modal window opens with all tools
```

### Step 2: Choose Your Tool

| Tool | Use For | How |
|------|---------|-----|
| ✨ Magic Wand | Uniform colors | Click once |
| 🖌️ Brush | Freehand | Click and drag |
| ⬜ Rectangle | Straight edges | Click-drag to create |
| ⭕ Circle | Round areas | Click-drag from center |
| 🔗 Lasso | Complex shapes | Click points to form polygon |

### Step 3: Adjust Settings
- **For Magic Wand**: Move "Color Tolerance" slider
  - High = Select more colors
  - Low = Select only similar colors
  
- **For Brush**: Set "Brush Size" (1-50 pixels)

### Step 4: Click to Select
- Tool will show you how many pixels were selected
- Selection mode shows at the top (Replace, Add, Subtract, Intersect)

### Step 5: See Your Selection
- Selection preview appears at bottom of Selection Tools
- "Marching ants" border shows selected area
- Pixel count displayed: "✓ 1,234 pixels selected"

---

## The 3 Most Useful Features

### 🤖 Auto-Detect (One-Click Magic)
```
1. Click "🤖 Auto Detect Areas" button
2. AI automatically finds distinct areas in image
3. All areas combined into one selection
4. Great for complex images!
```

### ↔️ Invert (Select the Opposite)
```
1. Make a selection
2. Click "↔️ Invert"
3. Now everything EXCEPT your selection is selected
4. Perfect for selecting backgrounds!
```

### 🪶 Feather (Soft Edges)
```
1. Make a selection
2. Move "Feather" slider (0-50px)
3. Higher = softer, blurred edges
4. Creates natural-looking selections
```

---

## Apply Effects to Selections ✨

Once you have a selection:

1. **Keep Selection Tools open** or close them (selection stays)
2. Selection appears in the "Select" tab showing pixel count
3. Use effects like Brightness, Darken, Saturate, etc.
4. Effects apply **only to selected area**

---

## Common Tasks

### Make Object Brighter
```
1. Select the object with Brush or Magic Wand
2. Choose Brightness effect (☀️)
3. Move intensity to 70%
4. Click Apply Effect ✓
```

### Darken Background
```
1. Select the object (any tool)
2. Click "↔️ Invert" to flip selection
3. Choose Darken effect (🌙)
4. Set intensity to 60%
5. Click Apply Effect ✓
```

### Create Vintage Look
```
1. Select an area
2. Choose Sepia effect (📸)
3. Set intensity to 80%
4. Click Apply Effect ✓
```

### Convert Part to Black & White
```
1. Select the area you want to convert
2. Choose Grayscale effect (⚫)
3. Set intensity to 100%
4. Click Apply Effect ✓
```

---

## Pro Tips 💡

- **Combine Multiple Selections**: Use "+ Add" mode to select with multiple tools
- **Use Feathering**: Always feather 5-20px for smooth transitions
- **Test Intensity**: Try lower intensity (30-50%) first
- **Selection Modes**: 
  - Replace = Start fresh (default)
  - Add = Combine selections
  - Subtract = Remove area from selection
  - Intersect = Keep only overlapping parts

---

## Troubleshooting in 30 Seconds

| Problem | Solution |
|---------|----------|
| Magic Wand selects too much | Lower the Color Tolerance |
| Magic Wand selects too little | Raise the Color Tolerance |
| Edges look jagged | Use Feather (15px) |
| Effect doesn't show | Try higher intensity |
| Can't see selection | Check "Select" tab for indicator |

---

## What Each Tool Does

### ✨ Magic Wand (Flood Fill)
**Algorithm**: BFS color matching
- Clicks on a color and expands outward
- Stops at different colors
- Great for: Skies, backgrounds, solid areas
- Tip: Adjust tolerance for precision

### 🖌️ Brush (Freehand)
**Algorithm**: Circular brush strokes
- Paint like you're drawing
- Multiple strokes add to selection
- Great for: Detailed shapes, complex outlines
- Tip: Larger brush for speed, smaller for precision

### ⬜ Rectangle (Geometric)
**Algorithm**: Axis-aligned rectangle
- Drag to create selection
- Great for: Straight edges, panels
- Tip: Hold Shift for perfect squares

### ⭕ Circle/Ellipse (Curved)
**Algorithm**: Elliptical math
- Great for: Circular objects, vignettes
- Tip: Drag to make ellipses (oval)
- Hold Shift for perfect circles

### 🔗 Lasso (Polygon)
**Algorithm**: Ray casting fill
- Click points to create outline
- Close loop to fill
- Great for: Irregular shapes
- Tip: Minimum 3 points required

### 🤖 Auto-Detect (Edge Detection)
**Algorithm**: Sobel operator
- Detects edges automatically
- Combines all found areas
- Great for: Complex images with clear edges
- Tip: Finds edges, not colors

---

## Selection Modes Explained

```
Original Selection: A circle

+ REPLACE (⊕): Forget old selection, use new one
  Result: New selection replaces old

+ ADD (+): Include both selections
  Result: Larger selection combining both

- SUBTRACT (-): Remove new selection from old
  Result: Original circle with hole where new was

∩ INTERSECT: Keep only the overlap
  Result: Only where both overlap
```

---

## Effects Available

```
☀️  BRIGHTNESS      → Make brighter (0-100%)
🌙  DARKEN          → Make darker (0-100%)
🌈  SATURATE        → More vivid colors (0-100%)
⚫  GRAYSCALE       → Remove color (0-100%)
📸  SEPIA           → Vintage brown tone (0-100%)
🔄  INVERT          → Reverse colors (0-100%)
❄️   COOL            → Add blue tones (0-100%)
🔥  WARM            → Add orange tones (0-100%)
```

Each effect supports 0-100% intensity adjustment.

---

## File Structure

New files added:
- `src/utils/selectionAlgorithms.js` - Selection algorithms
- `src/components/SelectionTools.jsx` - Selection UI
- `src/components/AdvancedImageEditor.jsx` - Effects UI
- `SELECTION_TOOLS_GUIDE.md` - Full documentation

---

## What's Next?

Try these features:
1. ✅ Open Selection Tools
2. ✅ Use Magic Wand on an image
3. ✅ Add a selection with Brush
4. ✅ Click Invert to flip selection
5. ✅ Apply a Brightness effect
6. ✅ Save your campaign!

---

**Enjoy your new superpowers! 🎨✨**
