/**
 * Integration Example for Word-by-Word Typing Effect
 * 
 * This file shows how to integrate the word-by-word typing effect
 * into your existing app.js file. Copy and adapt these code snippets.
 */

// ============================================================================
// STEP 1: Initialize the Typing Effect
// ============================================================================

// At the top of your app.js, after loading word-by-word-typing.js
const typingEffect = new WordByWordTypingEffect({
  container: document.getElementById('subtitle-layer'),
  videoElement: video,
  onRender: (segment, time) => {
    console.log(`Rendered segment at ${time.toFixed(2)}s: "${segment.text}"`);
  }
});

// ============================================================================
// STEP 2: Update Word Upload Function
// ============================================================================

// Modify how segments are processed to include word timing
async function handleFileUpload() {
  // ... existing upload code ...
  
  // After segments are received from transcription API
  segments = segments.map(segment => {
    // Generate automatic word timing based on segment duration
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
        bgOpacity: 60,
        borderColor: '#ffffff',
        borderOpacity: 0
      },
      // Keep existing fields
      x: null,
      y: null,
      bgColor: '#000000',
      bgOpacity: 60,
      borderColor: '#ffffff',
      borderOpacity: 0,
      bold: false
    };
  });

  // Continue with rest of upload process...
}

// ============================================================================
// STEP 3: Update Video Timeupdate Handler
// ============================================================================

// Find the existing video.addEventListener('timeupdate', ...) and replace it
video.addEventListener('timeupdate', () => {
  if (selectedWordIndex !== null) return;
  
  const t = video.currentTime;
  const cur = segments.find(s => t >= s.start && t <= s.end);
  const curIdx = segments.indexOf(cur);
  currentPlayingIndex = curIdx >= 0 ? curIdx : null;
  
  if (cur) {
    let displayContent;
    
    if (currentSubtitleType === 'typing-word') {
      // NEW: Use the WordByWordTypingEffect class
      displayContent = typingEffect.renderHTML(
        cur,
        cur.segmentDefaultStyle,
        t
      );
      liveSubtitle.innerHTML = displayContent;
    } else {
      // Full sentence mode - show all words
      displayContent = typingEffect.renderHTML(
        cur,
        cur.segmentDefaultStyle,
        t
      );
      liveSubtitle.innerHTML = displayContent;
    }
    
    updateLiveSubtitle(cur);
  } else {
    liveSubtitle.textContent = '';
  }
});

// ============================================================================
// STEP 4: Update Word Selection Handler
// ============================================================================

// Replace the existing selectWord function or add this enhanced version
function selectWord(segment, wordIdx) {
  selectedWordIndex = wordIdx;
  const word = segment.words[wordIdx];
  
  // Update editor to show word's current styling
  const style = word.customStyle || {};
  fontSelect.value = style.font || 'Arial';
  color.value = style.color || '#ffffff';
  bold.checked = style.fontWeight === 'bold' || false;
  size.value = style.size || 36;
  
  if (sizeValue) sizeValue.textContent = size.value;
  
  // Show position controls
  if (posX && posY) {
    posX.value = style.x || 0;
    posY.value = style.y || 0;
    if (posXValue) posXValue.textContent = style.x || 0;
    if (posYValue) posYValue.textContent = style.y || 0;
  }
  
  // Highlight selected word in the words panel
  const buttons = wordsPanel.querySelectorAll('.word-button');
  buttons.forEach((btn, idx) => {
    btn.classList.toggle('selected', idx === wordIdx);
  });
  
  console.log(`Selected word: "${word.text}" at index ${wordIdx}`);
  
  // Render preview with all words, highlighting selected one
  renderWordPreviewWithSelection(segment, wordIdx);
  
  setTimeout(() => {
    enableWordDragging(segment, wordIdx);
  }, 10);
}

// ============================================================================
// STEP 5: Update Apply Button Handler
// ============================================================================

// Replace the existing applyBtn.onclick function
applyBtn.onclick = () => {
  if (selectedIndex == null) return alert('Select a subtitle');
  const s = segments[selectedIndex];
  
  if (selectedWordIndex !== null && s.words && s.words[selectedWordIndex]) {
    // NEW: Use updateWordStyle from typing effect
    const newStyle = {
      font: fontSelect.value,
      color: color.value,
      fontWeight: bold.checked ? 'bold' : 'normal',
      size: parseInt(size.value, 10),
      x: parseInt(posX.value, 10) || 0,
      y: parseInt(posY.value, 10) || 0
    };
    
    typingEffect.updateWordStyle(s, selectedWordIndex, newStyle);
    
    console.log(`Applied style to word: ${s.words[selectedWordIndex].text}`, newStyle);
  } else {
    // Update segment-level styling
    s.text = editText.value;
    s.font = fontSelect.value;
    s.color = color.value;
    s.bgColor = bgColor.value;
    s.bgOpacity = parseInt(bgOpacity.value, 10);
    s.borderColor = borderColor.value;
    s.borderOpacity = parseInt(borderOpacity.value, 10);
    s.bold = bold.checked;
    s.size = parseInt(size.value, 10);
    
    const nx = Math.round((posX.value / 100) * video.clientWidth);
    const ny = Math.round((posY.value / 100) * video.clientHeight);
    s.x = nx;
    s.y = ny;
    
    // Regenerate words if text changed
    if (s.text && s.text !== editText.value) {
      const words = s.text.split(/\s+/);
      const duration = s.end - s.start;
      const wordDuration = duration / words.length;
      
      s.words = words.map((word, index) => ({
        text: word,
        start: s.start + (index * wordDuration),
        end: s.start + ((index + 1) * wordDuration),
        customStyle: {
          color: s.color,
          font: s.font,
          size: s.size,
          fontWeight: s.bold ? 'bold' : 'normal',
          textDecoration: 'none',
          x: 0,
          y: 0,
          opacity: 1
        }
      }));
    }
  }
  
  selectedWordIndex = null;
  renderList();
  renderWordsPanel(s);
  updateLiveSubtitle(s, s.text);
};

// ============================================================================
// STEP 6: New Helper Functions
// ============================================================================

/**
 * Render word preview with selection highlighting
 */
function renderWordPreviewWithSelection(segment, selectedWordIdx) {
  if (!segment.words || segment.words.length === 0) {
    updateLiveSubtitle(segment, segment.text);
    return;
  }

  const html = segment.words.map((word, idx) => {
    const style = word.customStyle || {};
    const isSelected = idx === selectedWordIdx;
    
    let inlineStyle = `
      color: ${style.color || '#ffffff'};
      font-family: ${style.font || 'Arial'};
      font-size: ${style.size || 36}px;
      font-weight: ${style.fontWeight || 'normal'};
      display: inline-block;
      margin: 4px;
      padding: 2px 6px;
      white-space: nowrap;
      transition: all 0.3s ease;
      cursor: pointer;
      ${isSelected ? `
        background: rgba(100, 150, 255, 0.3);
        border: 2px solid #6496FF;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(100, 150, 255, 0.5);
      ` : ''}
    `;
    
    if ((style.x || 0) !== 0 || (style.y || 0) !== 0) {
      inlineStyle += `
        position: relative;
        left: ${style.x || 0}px;
        top: ${style.y || 0}px;
      `;
    }
    
    return `<span class="word-span ${isSelected ? 'selected' : ''}" data-word-idx="${idx}" style="${inlineStyle}">${word.text}</span>`;
  }).join(' ');

  liveSubtitle.innerHTML = html;
  liveSubtitle.style.display = 'flex';
  liveSubtitle.style.flexWrap = 'wrap';
  liveSubtitle.style.alignItems = 'center';
  liveSubtitle.style.justifyContent = 'center';
  updateLiveSubtitle(segment);
}

/**
 * Export subtitles with word timing data
 */
function exportSubtitlesWithWordTiming(format = 'json') {
  const exportData = {
    segments: segments.map(s => ({
      start: s.start,
      end: s.end,
      text: s.text,
      words: s.words || [],
      styling: {
        color: s.color,
        font: s.font,
        size: s.size,
        bgColor: s.bgColor,
        bgOpacity: s.bgOpacity,
        borderColor: s.borderColor,
        borderOpacity: s.borderOpacity
      }
    }))
  };

  if (format === 'json') {
    const dataStr = JSON.stringify(exportData, null, 2);
    downloadFile(dataStr, 'subtitles.json', 'application/json');
  }
}

/**
 * Helper function to download file
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// STEP 7: Add to HTML
// ============================================================================

// Make sure these are in your index.html:
// <link rel="stylesheet" href="word-typing-styles.css">
// <script src="word-by-word-typing.js"></script>

// ============================================================================
// OPTIONAL: Advanced Features
// ============================================================================

/**
 * Auto-sync word timing with transcription AI
 */
function processTranscriptionWithTiming(transcriptionResponse) {
  return transcriptionResponse.segments.map(seg => ({
    ...seg,
    words: (seg.words || seg.text.split(/\s+/)).map(w => {
      // If transcription API provides word timing, use it
      if (w.start && w.end) {
        return {
          text: w.word || w.text,
          start: w.start,
          end: w.end,
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
        };
      }
      
      // Otherwise, distribute evenly
      const duration = seg.end - seg.start;
      const words = seg.text.split(/\s+/);
      const wordDuration = duration / words.length;
      const index = words.indexOf(typeof w === 'string' ? w : w.text);
      
      return {
        text: typeof w === 'string' ? w : w.text,
        start: seg.start + (index * wordDuration),
        end: seg.start + ((index + 1) * wordDuration),
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
      };
    })
  }));
}

/**
 * Batch update styling for word range
 */
function updateWordRange(segmentIndex, startIdx, endIdx, style) {
  const segment = segments[segmentIndex];
  if (!segment || !segment.words) return;
  
  for (let i = startIdx; i <= endIdx && i < segment.words.length; i++) {
    typingEffect.updateWordStyle(segment, i, style);
  }
  
  // Re-render
  if (currentPlayingIndex === segmentIndex) {
    updateLiveSubtitle(segment, segment.text);
  }
}

/**
 * Import word timing from external SRT/VTT with word data
 */
function importSubtitlesWithWordTiming(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    return data.segments.map(seg => ({
      start: seg.start,
      end: seg.end,
      text: seg.text,
      words: seg.words || [],
      segmentDefaultStyle: seg.styling || {
        color: '#ffffff',
        font: 'Arial',
        size: 36
      }
    }));
  } catch (e) {
    console.error('Failed to parse subtitle data:', e);
    return [];
  }
}

// ============================================================================
// DEBUGGING
// ============================================================================

/**
 * Log segment structure for debugging
 */
function debugSegmentStructure() {
  if (selectedIndex !== null) {
    const seg = segments[selectedIndex];
    console.log('Selected Segment:', seg);
    console.log('Words:', seg.words);
    console.log('Default Style:', seg.segmentDefaultStyle);
  }
}

// ============================================================================
// END OF INTEGRATION EXAMPLES
// ============================================================================
