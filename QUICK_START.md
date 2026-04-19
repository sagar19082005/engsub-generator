# Word-by-Word Typing Effect - Quick Start Guide

## Files Overview

| File | Purpose | Language |
|------|---------|----------|
| `word-by-word-typing.js` | Core typing effect class | Vanilla JS |
| `WordByWordTyping.jsx` | React component version | React |
| `word-typing-styles.css` | All CSS styling | CSS |
| `sample-word-data.json` | Example data structure | JSON |
| `WORD_BY_WORD_IMPLEMENTATION.md` | Detailed guide | Markdown |

---

## Quick Start (Vanilla JavaScript)

### 1. Add to HTML
```html
<link rel="stylesheet" href="word-typing-styles.css">
<div id="subtitle-layer" class="word-typing-container"></div>
<script src="word-by-word-typing.js"></script>
```

### 2. Initialize & Use
```javascript
// Create instance
const typing = new WordByWordTypingEffect({
  container: document.getElementById('subtitle-layer'),
  videoElement: video
});

// Get visible words at current time
const { visibleWords, activeWordIndex } = typing.getVisibleWords(
  segment, 
  video.currentTime
);

// Update a word's style
typing.updateWordStyle(segment, 1, {
  color: '#FF0000',
  size: 44
});

// Render
typing.render(segment, defaultStyle, video.currentTime);
```

---

## Quick Start (React)

### 1. Import Component
```jsx
import WordByWordTyping, { useWordByWordEffect } from './WordByWordTyping';
```

### 2. Basic Usage
```jsx
function SubtitleRenderer() {
  const [segment] = useState(subtitleData);
  const [currentTime, setCurrentTime] = useState(0);

  return (
    <WordByWordTyping
      segment={segment}
      videoCurrentTime={currentTime}
      segmentDefaultStyle={{
        color: '#ffffff',
        font: 'Arial',
        size: 36
      }}
      enableInteraction={true}
      onWordClick={(wordIndex) => console.log(`Word ${wordIndex} clicked`)}
    />
  );
}
```

### 3. With Hook
```jsx
function AdvancedSubtitleEditor() {
  const { segment, updateWordStyle, getVisibleWords } = useWordByWordEffect(initialSegment);
  
  const handleStyleChange = (wordIndex, newStyle) => {
    updateWordStyle(wordIndex, newStyle);
  };

  return (
    <div>
      <WordByWordTyping segment={segment} videoCurrentTime={currentTime} />
      <button onClick={() => handleStyleChange(0, { color: '#FF0000' })}>
        Make First Word Red
      </button>
    </div>
  );
}
```

---

## Data Structure Template

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
    }
  ],
  "segmentDefaultStyle": {
    "color": "#ffffff",
    "font": "Arial",
    "size": 36,
    "fontWeight": "normal",
    "bgColor": "#000000",
    "bgOpacity": 0.6
  }
}
```

---

## Common Tasks

### Task 1: Make Word Bold and Colored
**Vanilla JS:**
```javascript
typing.updateWordStyle(segment, 3, {
  fontWeight: 'bold',
  color: '#FFD700'
});
typing.render(segment, defaultStyle, currentTime);
```

**React:**
```jsx
updateWordStyle(3, {
  fontWeight: 'bold',
  color: '#FFD700'
});
```

### Task 2: Move Word to Custom Position
**Vanilla JS:**
```javascript
typing.updateWordStyle(segment, 2, {
  x: 50,    // 50px right
  y: -10    // 10px up
});
```

**React:**
```jsx
updateWordStyle(2, { x: 50, y: -10 });
```

### Task 3: Apply Hover Effect
**CSS:**
```css
.word-span:hover {
  transform: translateY(-2px);
  filter: brightness(1.2);
}
```

### Task 4: Get All Visible Words
**Vanilla JS:**
```javascript
const visible = typing.getVisibleWords(segment, video.currentTime);
console.log(visible.visibleWords);
```

**React:**
```jsx
const visible = getVisibleWords(currentTime);
```

---

## Styling Quick Reference

### Add Background
```html
<div class="word-typing-container with-background"></div>
```

### Add Border
```html
<div class="word-typing-container with-border"></div>
```

### Both
```html
<div class="word-typing-container with-background with-border"></div>
```

### Custom Classes
```css
.word-span.emphasis { font-weight: bold; }
.word-span.highlight { background: yellow; }
.word-span.underlined { text-decoration: underline; }
```

---

## Performance Tips

1. **Throttle Updates** - Don't render every millisecond
```javascript
let lastRender = 0;
video.addEventListener('timeupdate', () => {
  if (Date.now() - lastRender > 50) {
    typing.render(segment, style, video.currentTime);
    lastRender = Date.now();
  }
});
```

2. **Lazy Render** - Only render visible segments
```javascript
const visibleSegment = segments.find(s => 
  s.start <= video.currentTime && s.end >= video.currentTime
);
if (visibleSegment) {
  typing.render(visibleSegment, style, video.currentTime);
}
```

3. **React Memoization**
```jsx
const MemoizedTyping = React.memo(WordByWordTyping, (prev, next) => 
  prev.videoCurrentTime === next.videoCurrentTime
);
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Words not showing | Check word.start ≤ currentTime ≤ word.end |
| Styling not applied | Verify CSS file is loaded, check customStyle format |
| Animation jittery | Reduce update frequency, enable GPU acceleration |
| Performance lag | Implement throttling, use lazy rendering |

---

## Browser Support

✓ Chrome/Edge 88+  
✓ Firefox 85+  
✓ Safari 14+  
✓ Mobile browsers (iOS 13+, Android 9+)  
✗ IE 11

---

## Next Steps

1. **Review** `WORD_BY_WORD_IMPLEMENTATION.md` for detailed guide
2. **Load** `sample-word-data.json` to see example structure
3. **Customize** `word-typing-styles.css` for your design
4. **Choose** between vanilla JS or React component
5. **Integrate** into your app following the guides above

---

## Support

For detailed documentation, see:
- **Vanilla JS**: Inline comments in `word-by-word-typing.js`
- **React**: JSDoc comments in `WordByWordTyping.jsx`
- **Full Guide**: `WORD_BY_WORD_IMPLEMENTATION.md`
