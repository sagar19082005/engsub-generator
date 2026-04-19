# Word-by-Word Typing Effect Implementation Guide

## Overview
This guide explains how to implement a professional word-by-word typing effect for your Subtitle Generator website with individual word styling and precise timing control.

## Files Included

1. **word-by-word-typing.js** - Core typing effect class
2. **sample-word-data.json** - Example data structure with proper formatting
3. **word-typing-styles.css** - Complete CSS styling
4. **INTEGRATION_GUIDE.md** - This file

---

## Data Structure

### JSON Format
Each subtitle segment must contain a `words` array where each word object includes timing and styling data:

```json
{
  "start": 0.5,
  "end": 3.5,
  "text": "This is the world's biggest cricket bat.",
  "words": [
    {
      "text": "This",
      "start": 0.5,
      "end": 1.0,
      "customStyle": {
        "color": "#ffffff",
        "font": "Arial",
        "size": 36,
        "fontWeight": "normal",
        "textDecoration": "none",
        "x": 0,
        "y": 0,
        "opacity": 1
      }
    },
    // ... more words
  ]
}
```

### Required Fields for Each Word

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | ✓ | - | The word text |
| `start` | number | ✓ | - | Time when word appears (seconds) |
| `end` | number | ✓ | - | Time when word disappears (seconds) |
| `customStyle` | object | ✓ | {} | Individual styling object |

### customStyle Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `color` | hex color | #ffffff | Text color (e.g., #FF0000) |
| `font` | string | Arial | Font family |
| `size` | number | 36 | Font size in pixels |
| `fontWeight` | string | normal | normal, bold, 100-900 |
| `textDecoration` | string | none | none, underline, overline, line-through |
| `x` | number | 0 | Horizontal offset (pixels) |
| `y` | number | 0 | Vertical offset (pixels) |
| `opacity` | number | 1 | Opacity (0-1) |

---

## Implementation Steps

### Step 1: Include Files in HTML

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="word-typing-styles.css">
</head>
<body>
  <video id="video" controls></video>
  <div id="subtitle-layer"></div>
  
  <script src="word-by-word-typing.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

### Step 2: Initialize in JavaScript

```javascript
// Create typing effect instance
const typingEffect = new WordByWordTypingEffect({
  container: document.getElementById('subtitle-layer'),
  videoElement: document.getElementById('video'),
  onRender: (segment, time) => {
    console.log(`Rendered at ${time}s for segment: ${segment.text}`);
  }
});

// Attach to video for automatic updates
typingEffect.attachToVideo((currentTime) => {
  const segment = segments.find(s => 
    currentTime >= s.start && currentTime <= s.end
  );
  
  if (segment && currentSubtitleType === 'typing-word') {
    typingEffect.render(segment, segment.segmentDefaultStyle, currentTime);
  }
});
```

### Step 3: Update Your Segment Structure

Modify how segments are created to include word timing:

```javascript
function parseSubtitlesWithWordTiming(subtitles) {
  return subtitles.map(segment => {
    const words = segment.text.split(/\s+/);
    const duration = segment.end - segment.start;
    const wordDuration = duration / words.length;
    
    return {
      ...segment,
      words: words.map((word, index) => ({
        text: word,
        start: segment.start + (index * wordDuration),
        end: segment.start + ((index + 1) * wordDuration),
        customStyle: {
          color: '#ffffff',
          font: 'Arial',
          size: 36,
          fontWeight: 'normal',
          textDecoration: 'none',
          x: 0,
          y: 0,
          opacity: 1
        }
      })),
      segmentDefaultStyle: {
        color: '#ffffff',
        font: 'Arial',
        size: 36,
        fontWeight: 'normal',
        bgColor: '#000000',
        bgOpacity: 0.6
      }
    };
  });
}
```

---

## Usage Examples

### Example 1: Basic Usage

```javascript
// Get visible words at current time
const { visibleWords, activeWordIndex } = typingEffect.getVisibleWords(
  segment, 
  video.currentTime
);

console.log('Visible words:', visibleWords);
console.log('Active word index:', activeWordIndex);
```

### Example 2: Update Individual Word Style

```javascript
// Update a specific word's color and size
typingEffect.updateWordStyle(segment, 3, {
  color: '#FFD700',
  size: 44,
  fontWeight: 'bold'
});

// Re-render to see changes
typingEffect.render(segment, segment.segmentDefaultStyle, video.currentTime);
```

### Example 3: Render with Custom Styles

```javascript
// Render with default styles for whole segment
const html = typingEffect.renderHTML(
  segment,
  {
    color: '#ffffff',
    font: 'Arial',
    size: 36,
    fontWeight: 'normal'
  },
  video.currentTime
);

document.getElementById('subtitle-layer').innerHTML = html;
```

### Example 4: Real-time Synchronization

```javascript
video.addEventListener('timeupdate', () => {
  const currentSub = segments.find(s => 
    video.currentTime >= s.start && video.currentTime <= s.end
  );
  
  if (currentSub && currentSubtitleType === 'typing-word') {
    typingEffect.render(
      currentSub, 
      currentSub.segmentDefaultStyle, 
      video.currentTime
    );
  }
});
```

---

## CSS Classes and Styling

### Default Classes

- `.word-typing-container` - Main container
- `.word-span` - Individual word element
- `.word-span[data-active="true"]` - Currently active word
- `.word-span.selected` - User-selected word (for editing)
- `.word-span.emphasis` - Emphasized word style

### Apply Background

```html
<div id="subtitle-layer" class="word-typing-container with-background"></div>
```

### Apply Border

```html
<div id="subtitle-layer" class="word-typing-container with-border"></div>
```

### Combine Styles

```html
<div id="subtitle-layer" class="word-typing-container with-background with-border"></div>
```

---

## Advanced Features

### 1. Word-Level Positioning

Move individual words to custom positions:

```javascript
typingEffect.updateWordStyle(segment, 2, {
  x: 50,    // 50 pixels to the right
  y: -10,   // 10 pixels up
  opacity: 0.8
});
```

### 2. Dynamic Styling During Playback

Create interactive effects:

```javascript
video.addEventListener('timeupdate', () => {
  const { activeWordIndex } = typingEffect.getVisibleWords(
    currentSegment, 
    video.currentTime
  );
  
  if (activeWordIndex >= 0) {
    // Make active word larger and highlighted
    typingEffect.updateWordStyle(currentSegment, activeWordIndex, {
      size: 44,
      color: '#FFD700'
    });
  }
});
```

### 3. Word Selection for Editing

```javascript
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('word-span')) {
    const wordIndex = parseInt(e.target.getAttribute('data-word-index'));
    const wordText = e.target.textContent;
    
    console.log(`Selected word: "${wordText}" at index ${wordIndex}`);
    
    // Open editing panel
    openWordEditor(currentSegment, wordIndex);
  }
});
```

### 4. Batch Update Multiple Words

```javascript
function updateWordRange(segment, startIdx, endIdx, style) {
  for (let i = startIdx; i <= endIdx; i++) {
    typingEffect.updateWordStyle(segment, i, style);
  }
}

// Example: Make words 2-4 red and bold
updateWordRange(segment, 2, 4, {
  color: '#FF0000',
  fontWeight: 'bold'
});
```

---

## Integration with Your App.js

Replace the existing `getTypingWord()` function:

```javascript
// OLD - Remove this
function getTypingWord(segment, currentTime) {
  // ... old code
}

// NEW - Use the WordByWordTypingEffect class instead
function getTypingWord(segment, currentTime) {
  if (!typingEffect) return '';
  return typingEffect.renderHTML(
    segment,
    segment.segmentDefaultStyle,
    currentTime
  );
}
```

Update the video timeupdate listener:

```javascript
video.addEventListener('timeupdate', () => {
  const t = video.currentTime;
  const cur = segments.find(s => t >= s.start && t <= s.end);
  
  if (cur && currentSubtitleType === 'typing-word') {
    // Use the new typing effect
    const displayContent = typingEffect.renderHTML(
      cur,
      cur.segmentDefaultStyle,
      t
    );
    liveSubtitle.innerHTML = displayContent;
    updateLiveSubtitle(cur);
  }
});
```

---

## Performance Optimization

For large numbers of words or segments:

1. **Throttle Updates**: Don't update on every timeupdate event
```javascript
let lastUpdate = 0;
const throttleMs = 50; // Update max every 50ms

video.addEventListener('timeupdate', () => {
  if (Date.now() - lastUpdate > throttleMs) {
    // Do render
    lastUpdate = Date.now();
  }
});
```

2. **Lazy Render**: Only render visible segments
```javascript
function renderVisibleSegments() {
  const visibleSegs = segments.filter(s => 
    s.end >= video.currentTime - 1 && 
    s.start <= video.currentTime + 1
  );
  
  visibleSegs.forEach(seg => {
    if (video.currentTime >= seg.start && video.currentTime <= seg.end) {
      typingEffect.render(seg, seg.segmentDefaultStyle, video.currentTime);
    }
  });
}
```

3. **Cache Rendered HTML**
```javascript
const renderCache = new Map();

function getCachedRender(segment, time) {
  const key = `${segment.start}-${segment.end}-${Math.floor(time * 10)}`;
  if (!renderCache.has(key)) {
    renderCache.set(key, typingEffect.renderHTML(segment, segment.segmentDefaultStyle, time));
  }
  return renderCache.get(key);
}
```

---

## Troubleshooting

### Words Not Appearing
- Ensure word `start` and `end` times are within segment range
- Check that `videoCurrentTime >= word.start` condition is met

### Styling Not Applied
- Verify `customStyle` object has all required properties
- Check CSS file is loaded (open DevTools → Network tab)

### Animation Jittery
- Reduce animation duration in CSS
- Enable GPU acceleration: `transform: translateZ(0);`

### Performance Issues
- Reduce number of active subtitles
- Implement the throttling solution above
- Use CSS classes instead of inline styles

---

## API Reference

### WordByWordTypingEffect Class

#### Constructor
```javascript
new WordByWordTypingEffect(config)
```

#### Methods

**`getVisibleWords(segment, videoCurrentTime)`**
- Returns: `{ visibleWords: Array, activeWordIndex: number }`

**`updateWordStyle(segment, wordIndex, newStyle)`**
- Updates individual word styling

**`renderHTML(segment, segmentDefaultStyle, videoCurrentTime)`**
- Returns: HTML string of the typing effect

**`render(segment, segmentDefaultStyle, videoCurrentTime)`**
- Renders directly to container element

**`attachToVideo(onUpdate)`**
- Attaches automatic updates to video element

---

## Browser Support

- Chrome/Edge: ✓ (All modern versions)
- Firefox: ✓ (All modern versions)
- Safari: ✓ (iOS 13+, macOS 10.15+)
- IE 11: ✗ (Not supported - uses modern ES6)

---

## License & Credits

This implementation is provided for your Subtitle Generator project. Feel free to customize and extend as needed.

For issues or questions, refer to the inline code comments in `word-by-word-typing.js`.
