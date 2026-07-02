# 🎯 Selection Tools - Quick Reference Card

## Access Selection Tools

**Path**: ProEditor → "Select" Tab → "Open Selection Tools" Button

---

## 5 Selection Tools

### ✨ Magic Wand
- **How**: Click once on color
- **Adjust**: Tolerance slider (0-100)
- **Best for**: Solid colors, backgrounds
- **Tip**: High tolerance = more colors

### 🖌️ Brush
- **How**: Click and drag to draw
- **Adjust**: Brush Size slider (1-50px)
- **Best for**: Complex shapes, details
- **Tip**: Multiple strokes add to selection

### ⬜ Rectangle
- **How**: Click and drag to create box
- **Shape**: Straight rectangle
- **Best for**: Geometric areas
- **Tip**: Drag corners from top-left

### ⭕ Circle
- **How**: Click center, drag to radius
- **Shape**: Circle or ellipse
- **Best for**: Round objects
- **Tip**: Drag diagonally for ellipse

### 🔗 Lasso
- **How**: Click points to create polygon
- **Required**: Minimum 3 points
- **Best for**: Irregular shapes
- **Tip**: Close loop to fill

---

## Selection Modes

| Mode | Icon | Effect |
|------|------|--------|
| Replace | ⊕ | New selection (forget old) |
| Add | + | Combine with old |
| Subtract | − | Remove from old |
| Intersect | ∩ | Keep only overlap |

---

## 3 Selection Operations

### ↔️ Invert
Flip selection (select background instead)

### 🪶 Feather
Soften edges (0-50px slider)

### 🗑️ Clear
Remove selection completely

---

## 🤖 One-Click Features

### Auto-Detect Areas
AI finds edges automatically

### Show Test Image
Use demo image if canvas unavailable

---

## 8 Effects to Apply

| Effect | Icon | Range |
|--------|------|-------|
| Brightness | ☀️ | 0-100% |
| Darken | 🌙 | 0-100% |
| Saturate | 🌈 | 0-100% |
| Grayscale | ⚫ | 0-100% |
| Sepia | 📸 | 0-100% |
| Invert | 🔄 | 0-100% |
| Cool | ❄️ | 0-100% |
| Warm | 🔥 | 0-100% |

---

## Step-by-Step Workflow

```
1. Open Selection Tools
   ↓
2. Choose Tool (Magic Wand / Brush / etc.)
   ↓
3. Adjust Settings (Tolerance / Size / etc.)
   ↓
4. Click/Drag to Create Selection
   ↓
5. (Optional) Modify with Invert/Feather/Combine
   ↓
6. Close SelectionTools (selection stays)
   ↓
7. Selection appears in "Select" tab
   ↓
8. Choose Effect and Intensity
   ↓
9. Click "Apply Effect"
   ↓
10. Effect applied to selected area!
```

---

## Common Tasks

### Task: Brighten an Object
```
Brush → Paint object → Close → Brightness 70% → Apply ✓
```

### Task: Darken Background
```
Magic Wand → Click background → Invert → Darken 60% → Apply ✓
```

### Task: Selective Color (Saturate)
```
Lasso → Draw around object → Close → Saturate 100% → Apply ✓
```

### Task: Vignette Effect
```
Circle → Draw in center → Invert → Feather 20px → Darken 50% → Apply ✓
```

### Task: Black & White Conversion
```
Rectangle → Select background → Grayscale 100% → Apply ✓
```

---

## Keyboard Shortcuts

- **Ctrl+Z** = Undo effect
- **Ctrl+Y** = Redo effect
- **Escape** = Close SelectionTools modal

---

## Pro Tips 💡

✨ **Magic Wand Tips**
- Increase tolerance for soft colors
- Decrease for precise selection

🖌️ **Brush Tips**
- Size 5-10px for detail
- Size 20-50px for large areas
- Multiple strokes build selection

📐 **Geometric Tips**
- Hold Shift for perfect square
- Rectangle fastest for straight edges
- Circle best for vignettes

🔗 **Lasso Tips**
- Click around edges
- Minimum 3 points required
- Close to fill area

🪶 **Feather Tips**
- 5-10px for slight softness
- 15-20px for natural blend
- 30px+ for dramatic effect

🤖 **Auto-Detect Tips**
- Works best on high-contrast images
- Combines all found edges
- Great starting point for complex images

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Selection selects too much | Lower Magic Wand tolerance |
| Selection selects too little | Raise Magic Wand tolerance |
| Edges look jagged | Use Feather (10-15px) |
| Effect doesn't show | Verify selection active in Select tab |
| No canvas available | Click "Show Test Image" |
| Can't see selection | Look for pixel count in Select tab |

---

## Selection Indicator

When selection is active, you'll see in "Select" tab:
```
✓ 1,234 pixels selected
Type: brush
```

---

## Effect Intensity Guide

```
0-30%   = Subtle, barely noticeable
30-60%  = Moderate, clear effect
60-100% = Strong, very dramatic
```

---

## Browser Support

✅ **Excellent**: Chrome, Edge, Firefox
⚠️ **Good**: Safari
❌ **None**: Internet Explorer 11

---

## File Locations

- **Algorithms**: `src/utils/selectionAlgorithms.js`
- **UI**: `src/components/SelectionTools.jsx`
- **Effects**: `src/components/AdvancedImageEditor.jsx`
- **Integration**: `src/components/ProEditor.jsx`

---

## Documentation

- **Quick Start**: `SELECTION_QUICK_START.md`
- **Full Guide**: `SELECTION_TOOLS_GUIDE.md`
- **Technical**: `SELECTION_IMPLEMENTATION.md`
- **Features**: `FEATURES_OVERVIEW.md`
- **This Card**: `SELECTION_REFERENCE.md`

---

## Remember

1. ✅ Always verify selection is active
2. ✅ Start with lower intensity first
3. ✅ Use Feather for smooth transitions
4. ✅ Combine tools with + Add mode
5. ✅ Test on test image if unsure

---

## Ready? 

👉 Go to ProEditor → "Select" Tab → "Open Selection Tools"

**Enjoy your new superpowers! 🎨✨**
