# Word Rendering and Display Code Analysis

## Overview
This document contains all code related to rendering and displaying words in the preview/display areas, with focus on potential duplicate rendering issues.

---

## 1. renderDraggableWordPreview() - Lines 690-718

**Location:** [public/app.js](public/app.js#L690-L718)

**Purpose:** Renders words in the wordsPanelOld element for non-word-type modes

```javascript
function renderDraggableWordPreview(segment, selectedWordIdx) {
  const wordsPanel = document.getElementById('wordsPanelOld');
  if (!wordsPanel) return;
  
  // Only show for non-word-type modes
  if (segment.subtitleType === 'word-type') {
    wordsPanel.innerHTML = '';
    return;
  }
  
  wordsPanel.innerHTML = '';
  const words = segment.text.split(' ');
  
  words.forEach((word, idx) => {
    const span = document.createElement('span');
    span.className = 'word-span';
    span.textContent = word;
    span.style.color = segment.color || '#fff';
    span.style.fontFamily = segment.font || 'Arial';
    span.style.fontSize = (segment.size || 36) + 'px';
    span.style.fontWeight = segment.bold ? '700' : '400';
    span.style.marginRight = '8px';
    span.style.marginBottom = '8px';
    span.style.display = 'inline-block';
    span.style.padding = '4px 8px';
    
    wordsPanel.appendChild(span);
  });
}
```

**Called From:**
- [Line 318](public/app.js#L318) - in `selectSubtitle()` function
- [Line 836](public/app.js#L836) - in `applyBtn.onclick` 
- [Line 914](public/app.js#L914) - in `applyTypeBtn.onclick`

---

## 2. renderWordTypeButtons() - Lines 324-420

**Location:** [public/app.js](public/app.js#L324-L420)

**Purpose:** Creates interactive buttons for each word in word-type mode

**Key Features:**
- Clears `wordButtonsPanel` innerHTML first: `buttonsPanel.innerHTML = '';`
- Creates buttons with strong styling (gradient background, hover effects)
- Adds a TEST button first
- Loops through words and appends each as a button

```javascript
function renderWordTypeButtons(segment) {
  const buttonsPanel = document.getElementById('wordButtonsPanel');
  
  if (!buttonsPanel) {
    console.error('❌❌❌ ERROR: wordButtonsPanel NOT FOUND! ❌❌❌');
    return;
  }
  
  let textToUse = segment?.text || '';
  
  if (!textToUse || textToUse.trim().length === 0) {
    console.error('❌❌❌ SEGMENT TEXT IS EMPTY! ❌❌❌');
    buttonsPanel.innerHTML = '<div style="color:red;padding:10px;text-align:center;font-weight:bold;">ERROR: No text in this subtitle!</div>';
    return;
  }
  
  const words = textToUse.split(' ').filter(w => w.length > 0);
  
  // Clear previous content
  buttonsPanel.innerHTML = '';
  
  if (words.length === 0) {
    console.warn('⚠️ No words found!');
    buttonsPanel.innerHTML = '<div style="color:#999;padding:10px;text-align:center;">No words found</div>';
    return;
  }
  
  // ADD TEST BUTTON FIRST TO VERIFY CLICKS WORK
  const testBtn = document.createElement('button');
  testBtn.textContent = '🧪 TEST';
  testBtn.style.cssText = `
    padding: 10px 14px;
    margin: 4px 3px;
    font-size: 14px;
    font-weight: 700;
    border: 3px solid RED;
    border-radius: 8px;
    background: LIME;
    color: black;
    cursor: pointer;
  `;
  testBtn.onclick = () => {
    alert('🧪 TEST BUTTON WORKS!');
  };
  buttonsPanel.appendChild(testBtn);  // Line 369
  
  // Create buttons with strong, obvious styling - DRAGGABLE
  words.forEach((word, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = word;
    btn.id = `word-btn-${idx}`;
    
    // STRONG inline styles
    btn.style.cssText = `
      padding: 10px 14px;
      margin: 4px 3px;
      font-size: 14px;
      font-weight: 700;
      border: 3px solid #667eea;
      border-radius: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-block;
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
    `;
    
    btn.onmouseover = function() {
      this.style.transform = 'scale(1.1)';
      this.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.5)';
    };
    
    btn.onmouseout = function() {
      this.style.transform = 'scale(1)';
      this.style.boxShadow = 'none';
    };
    
    btn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      alert('✅ BUTTON CLICKED! Word: ' + word);
      showWordInVideoCenter(segment, idx, word);
    };
    
    buttonsPanel.appendChild(btn);  // Line 420
  });
}
```

---

## 3. showWordInVideoCenter() - Lines 422-?

**Location:** [public/app.js](public/app.js#L422)

**Purpose:** Renders draggable word customization interface in a separate container

**Key Features:**
- Creates/clears `word-customization-container` div (separate from subtitleLayer)
- Initializes word positions if not already initialized
- **LOOPS through all words** and renders each as a draggable element
- Adds mousedown/mousemove/mouseup listeners for dragging
- Only adds drag handling for the selected word

**POTENTIAL ISSUE:** This function appears to be called recursively when clicking a word:
```javascript
wordEl.onclick = (e) => {
  e.stopPropagation();
  // Refresh to show this word as selected
  showWordInVideoCenter(segment, idx, w);  // Called again!
};
```

This means clicking a word calls `showWordInVideoCenter()` again, which re-renders ALL words.

**Code snippet (key section):**

```javascript
function showWordInVideoCenter(segment, wordIdx, word) {
  // ... initialization ...
  
  // Create a container div for all words (separate from subtitleLayer)
  let wordContainer = document.getElementById('word-customization-container');
  if (!wordContainer) {
    wordContainer = document.createElement('div');
    wordContainer.id = 'word-customization-container';
    wordContainer.style.cssText = `...`;
    subtitleLayer.parentNode.appendChild(wordContainer);
  }
  
  wordContainer.innerHTML = ''; // Clear previous
  wordContainer.style.display = 'block'; // Make visible
  
  // ⚠️ LOOP: Render ALL words as separate draggable elements
  words.forEach((w, idx) => {
    let wData = segment.words && segment.words[idx] ? segment.words[idx] : {...};
    
    const wordEl = document.createElement('div');
    wordEl.className = 'word-customizable';
    wordEl.id = `word-${idx}`;
    // ... styling ...
    
    wordContainer.appendChild(wordEl);  // ADDS WORD TO DOM
    
    // Click to select this word - CALLS showWordInVideoCenter AGAIN!
    wordEl.onclick = (e) => {
      e.stopPropagation();
      showWordInVideoCenter(segment, idx, w);  // ⚠️ RECURSIVE CALL
    };
    
    // ... drag handlers ...
  });
}
```

---

## 4. updateLiveSubtitle() - Lines 1073-1305

**Location:** [public/app.js](public/app.js#L1073)

**Purpose:** Updates the live subtitle display with type-specific rendering

**Multiple rendering paths based on subtitleType:**

### Type: "typing-word" (Lines 1127-1130)
```javascript
if (s.subtitleType === 'typing-word') {
  liveSubtitle.style.display = 'block';
  liveSubtitle.innerHTML = s.text;
}
```

### Type: "word-type" (Lines 1131-1149)
```javascript
else if (s.subtitleType === 'word-type') {
  if (s.words && s.words.length > 0) {
    liveSubtitle.style.display = 'block';
    const words = s.text.split(' ');
    let html = '';
    words.forEach((w, idx) => {
      const wordStyle = s.words && s.words[idx] ? s.words[idx] : {};
      const wordColor = wordStyle.color || s.color || '#fff';
      const wordSize = wordStyle.size || s.size || 36;
      const wordBold = wordStyle.bold !== undefined ? wordStyle.bold : s.bold;
      const wordX = wordStyle.x || 0;
      const wordY = wordStyle.y || 0;
      html += `<span style="display:inline-block;color:${wordColor};font-size:${wordSize}px;font-weight:${wordBold ? '700' : '400'};margin:0 4px;position:relative;left:${wordX}px;top:${wordY}px;">${w}</span>`;
    });
    liveSubtitle.innerHTML = html;
  } else {
    liveSubtitle.style.display = 'none';
    liveSubtitle.innerHTML = '';
  }
}
```

### Type: "word-studio" (Lines 1150-1154)
```javascript
else if (s.subtitleType === 'word-studio') {
  liveSubtitle.style.display = 'block';
  const words = s.text.split(' ');
  liveSubtitle.innerHTML = words.map(w => `<span style="display:inline-block;background:#4CAF50;color:white;padding:4px 8px;border-radius:4px;margin:2px;">${w}</span>`).join('');
}
```

### Type: "full" (default) (Lines 1155-1156)
```javascript
else {
  liveSubtitle.style.display = 'block';
  liveSubtitle.innerHTML = s.text;
}
```

---

## 5. Video timeupdate Event Handler - Lines 1167+

**Location:** [public/app.js](public/app.js#L1167)

**Purpose:** Updates subtitle display as video plays

**Key Issue: Multiple innerHTML assignments for word-type mode**

When video time updates and current segment is "word-type":

```javascript
video.addEventListener('timeupdate', ()=>{
  // IF CUSTOMIZING WORDS: Don't render subtitles
  if (isCustomizingWords) {
    return;
  }
  
  if(!segments || segments.length===0) return;
  const t = video.currentTime;
  const cur = segments.find(s=> t>=s.start && t<=s.end);
  const curIdx = segments.indexOf(cur);
  currentPlayingIndex = curIdx >= 0 ? curIdx : null;
  
  if(cur){
    const type = cur.subtitleType || 'full';
    
    // ... other type handling ...
    
    else if (type === 'word-type') {
      // ⚠️ STRICT RULE: Word Type NEVER shows the full subtitle line
      
      if (!cur.words || cur.words.length === 0) {
        // NO customized words - HIDE COMPLETELY
        liveSubtitle.innerHTML = '';
        liveSubtitle.style.display = 'none';
      } else {
        // HAS customized words - show ONLY those words at their positions
        const vw = video.clientWidth;
        const vh = video.clientHeight;
        const wordTimings = calculateWordTimings(cur);
        let displayHTML = '';
        
        wordTimings.forEach((wt, idx) => {
          if (t >= wt.start) {
            const wordStyle = cur.words && cur.words[idx] ? cur.words[idx] : {};
            const wordColor = wordStyle.color || '#FFFF00';
            const wordSize = wordStyle.size || 36;
            const wordBold = wordStyle.bold !== undefined ? wordStyle.bold : false;
            const wordX = wordStyle.x || 0;
            const wordY = wordStyle.y || 0;
            
            // Position: center (50%) + custom offset
            const posLeft = 50 + wordX;
            const posTop = 50 + wordY;
            
            displayHTML += `<div style="position:absolute;left:${posLeft}%;top:${posTop}%;transform:translate(-50%,-50%);color:${wordColor};font-size:${wordSize}px;font-weight:${wordBold ? '700' : '400'};font-family:${wordStyle.font || 'Arial'};white-space:nowrap;z-index:999;">${wt.text}</div>`;
          }
        });
        
        // Make liveSubtitle relative positioned so child absolute positioning works correctly
        liveSubtitle.style.position = 'absolute';
        liveSubtitle.style.left = '0';
        liveSubtitle.style.top = '0';
        // ... more styling ...
        liveSubtitle.innerHTML = displayHTML;  // ⚠️ RENDERS WORDS TO DOM HERE
      }
    }
    // ... rest of handlers ...
  }
});
```

---

## 6. renderList() - Lines 280-318

**Location:** [public/app.js](public/app.js#L280)

**Purpose:** Renders the subtitle list in the sidebar

```javascript
function renderList(){
  subsList.innerHTML = '';
  subsList.classList.add('active');
  segments.forEach((s,i)=>{
    let displayText = s.text;
    let typeClass = 'type-full';
    const type = s.subtitleType || 'full';
    
    if (type === 'typing-word') {
      displayText = s.text.split(' ').map(w => `<span class="word-highlight">${w}</span>`).join(' ');
      typeClass = 'type-typing';
    } else if (type === 'word-type') {
      displayText = s.text.split(' ').map((w, idx) => `<span class="word-number">${w}</span>`).join(' ');
      typeClass = 'type-numbered';
    } else if (type === 'word-studio') {
      displayText = s.text.split(' ').map(w => `<span class="word-box">${w}</span>`).join('');
      typeClass = 'type-studio';
    } else {
      typeClass = 'type-full';
    }
    
    const el = document.createElement('div'); 
    el.className=`sub-item ${typeClass}`;
    el.innerHTML = `<span class="time">${formatTime(s.start)} - ${formatTime(s.end)}</span> : <span class="text">${displayText}</span>`;
    el.onclick = ()=> { selectedIndex = i; selectSubtitle(i); };
    subsList.appendChild(el);
  });
}
```

---

## Summary: Where Words Are Rendered

| Location | Function | Container | Trigger | Loop? |
|----------|----------|-----------|---------|-------|
| Line 690-718 | `renderDraggableWordPreview()` | `wordsPanelOld` | Called 3 times | Yes - forEach loop |
| Line 324-420 | `renderWordTypeButtons()` | `wordButtonsPanel` | On selectSubtitle, applyTypeBtn | Yes - forEach loop |
| Line 422+ | `showWordInVideoCenter()` | `word-customization-container` | Button click | Yes - forEach loop, recursive |
| Line 1073+ | `updateLiveSubtitle()` | `liveSubtitle` | On selectSubtitle, applyBtn, applyTypeBtn | Yes - forEach loop in updateHTML |
| Line 1167+ | Video `timeupdate` event | `liveSubtitle` | Video playback | Yes - forEach loop for wordTimings |
| Line 280 | `renderList()` | `subsList` | On renderList() calls | Yes - forEach loop |

---

## Potential Issues Found

### 1. **Multiple Rendering in `selectSubtitle()` (Line 318)**
```javascript
// Line 318 in selectSubtitle()
renderDraggableWordPreview(s, -1);
```
This is called after `updateLiveSubtitle()` is already called on Line 297.

### 2. **Recursive Calls in `showWordInVideoCenter()`**
When user clicks a word, it calls itself again - potentially rendering all words multiple times in quick succession.

### 3. **Double rendering in event handlers**
- `applyBtn.onclick` calls both `updateLiveSubtitle()` AND `renderDraggableWordPreview()`
- `applyTypeBtn.onclick` calls both `updateLiveSubtitle()` AND `renderDraggableWordPreview()`

### 4. **Repeated Event Listeners in `showWordInVideoCenter()`**
Lines 566-569 attempt to remove old listeners before adding new ones, but this is complex and might not be catching all cases.

