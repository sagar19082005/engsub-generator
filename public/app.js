const fileEl = document.getElementById('file');
const btnUpload = document.getElementById('btnUpload');
const btnExport = document.getElementById('btnExport');
const video = document.getElementById('video');
const subtitleLayer = document.getElementById('subtitle-layer');
const subsList = document.querySelector('.subs-list-container');
const fileNameEl = document.getElementById('file-name');

let segments = [];
let originalSegments = []; // Store original segments for type switching
let selectedIndex = null;
let isCustomizingWords = false; // FLAG: Track if user is customizing words
let currentCustomizingSegment = null; // Store the segment being customized

const segmentSubtitleType = document.getElementById('segmentSubtitleType');
const centerToggle = document.getElementById('centerToggle');

const editText = document.getElementById('editText');
const fontSelect = document.getElementById('fontSelect');
const color = document.getElementById('color');
const bgColor = document.getElementById('bgColor');
const bgOpacity = document.getElementById('bgOpacity');
const borderColor = document.getElementById('borderColor');
const borderOpacity = document.getElementById('borderOpacity');
const bold = document.getElementById('bold');
const size = document.getElementById('size');
const studioHighlightColor = document.getElementById('studioHighlightColor');
const studioColorGroup = document.getElementById('studioColorGroup');
const posX = document.getElementById('posX');
const posY = document.getElementById('posY');
const applyBtn = document.getElementById('apply');
const applyAllBtn = document.getElementById('applyAll');
const applyTypeBtn = document.getElementById('applyType');

// Slider value displays
const sizeValue = document.getElementById('sizeValue');
const bgOpacityValue = document.getElementById('bgOpacityValue');
const borderOpacityValue = document.getElementById('borderOpacityValue');
const posXValue = document.getElementById('posXValue');
const posYValue = document.getElementById('posYValue');

// live subtitle element (centered by default)
const liveSubtitle = document.createElement('div');
liveSubtitle.id = 'live-subtitle';
liveSubtitle.className = 'live-subtitle';
liveSubtitle.style.display = 'none';
subtitleLayer.appendChild(liveSubtitle);

// Create customization mode status indicator
const customizationStatusIndicator = document.createElement('div');
customizationStatusIndicator.id = 'customization-status';
customizationStatusIndicator.style.cssText = `
  position: fixed;
  top: 10px;
  left: 10px;
  padding: 12px 20px;
  background: #333;
  color: white;
  border-radius: 8px;
  font-weight: bold;
  font-size: 14px;
  z-index: 100000;
  display: none;
  border: 3px solid #FF0000;
  box-shadow: 0 4px 8px rgba(255,0,0,0.3);
`;
customizationStatusIndicator.innerHTML = '🔴 CUSTOMIZATION MODE: ON';
document.body.appendChild(customizationStatusIndicator);

// Function to update customization status indicator
function updateCustomizationStatus() {
  const indicator = document.getElementById('customization-status');
  if (!indicator) return;
  
  if (isCustomizingWords) {
    indicator.style.display = 'block';
    indicator.style.background = '#8B0000';
    indicator.style.borderColor = '#FF0000';
    indicator.innerHTML = '🔴 CUSTOMIZATION MODE: ON<br><small>Click "Done Customizing" button to exit</small>';
    indicator.style.fontSize = '12px';
    indicator.style.lineHeight = '1.4';
  } else {
    indicator.style.display = 'none';
  }
}

// Setup live subtitle drag functionality
let dragging = false, offsetX = 0, offsetY = 0;
let currentPlayingIndex = null;

// Initialize the "Done Customizing" button handler
setupDoneCustomizingButton();


liveSubtitle.addEventListener('mousedown', (ev) => {
  dragging = true;
  offsetX = ev.offsetX;
  offsetY = ev.offsetY;
});

// Click subtitle to select for editing
liveSubtitle.addEventListener('click', (ev) => {
  if (currentPlayingIndex != null && !dragging) {
    selectedIndex = currentPlayingIndex;
    selectSubtitle(currentPlayingIndex);
  }
});

window.addEventListener('mousemove', (ev) => {
  if (!dragging) return;
  const rect = subtitleLayer.getBoundingClientRect();
  const nx = ev.clientX - rect.left - offsetX;
  const ny = ev.clientY - rect.top - offsetY;
  liveSubtitle.style.left = nx + 'px';
  liveSubtitle.style.top = ny + 'px';
  
  // Update segment position and sliders
  if (selectedIndex != null) {
    segments[selectedIndex].x = nx;
    segments[selectedIndex].y = ny;
    posX.value = Math.round((nx / video.clientWidth) * 100);
    posY.value = Math.round((ny / video.clientHeight) * 100);
  }
});

window.addEventListener('mouseup', () => { dragging = false; });

// Update file name when selected
fileEl.addEventListener('change', () => {
  if (fileEl.files[0]) {
    fileNameEl.textContent = fileEl.files[0].name;
  } else {
    fileNameEl.textContent = '';
  }
});

// Update slider value displays
size.addEventListener('input', () => {
  if (sizeValue) sizeValue.textContent = size.value;
});

bgOpacity.addEventListener('input', () => {
  if (bgOpacityValue) bgOpacityValue.textContent = bgOpacity.value;
});

borderOpacity.addEventListener('input', () => {
  if (borderOpacityValue) borderOpacityValue.textContent = borderOpacity.value;
});

posX.addEventListener('input', () => {
  if (posXValue) posXValue.textContent = posX.value;
});

posY.addEventListener('input', () => {
  if (posYValue) posYValue.textContent = posY.value;
});



// Word Studio - Set word positions button
const setPositionBtn = document.getElementById('setPosition');
if (setPositionBtn) {
  setPositionBtn.onclick = () => {
    if (selectedIndex == null) return alert('Select a subtitle first');
    const segment = segments[selectedIndex];
    
    // Get current word positions from the word-span elements
    const wordElements = document.querySelectorAll('.word-span');
    const words = [];
    
    wordElements.forEach((el, idx) => {
      const style = window.getComputedStyle(el);
      const left = parseFloat(style.left) || 0;
      const top = parseFloat(style.top) || 0;
      
      words.push({
        text: el.textContent,
        x: left,
        y: top,
        color: el.style.color || segment.color,
        font: el.style.fontFamily || segment.font,
        size: parseInt(el.style.fontSize) || segment.size,
        bold: el.style.fontWeight === '700' || el.style.fontWeight === 'bold'
      });
    });
    
    // Save to segment
    segment.words = words;
    
    alert(`Saved positions for ${words.length} words in this segment!`);
    renderList();
  };
}

btnUpload.onclick = async () => {
  if (!fileEl.files[0]) return alert('Select a video first');
  const fd = new FormData();
  fd.append('video', fileEl.files[0]);
  btnUpload.disabled = true; btnUpload.textContent = 'Generating...';
  const res = await fetch('/transcribe', { method: 'POST', body: fd });
  btnUpload.disabled = false; btnUpload.textContent = 'Generate Subtitles';
  if (!res.ok) {
    const errData = await res.json();
    // If rate limited, offer mock fallback
    if (res.status === 429) {
      const useMock = confirm('OpenAI API rate limited. Use mock subtitles for testing?');
      if (!useMock) return alert('Upload cancelled');
      segments = generateMockSegments(10); // 10 second mock video
    } else {
      return alert('Transcription failed: ' + (errData?.error || 'Unknown error'));
    }
  } else {
    const data = await res.json();
    segments = data.segments;
  }
  const url = URL.createObjectURL(fileEl.files[0]);
  video.src = url;
  segments = segments.map(s => ({ ...s, x: null, y: null, font: 'Arial', color: '#ffffff', bgColor: '#000000', bgOpacity: 60, borderColor: '#ffffff', borderOpacity: 0, bold: false, size: 36, subtitleType: 'full', words: [] }));
  
  // ALWAYS split sentences with more than 5 words (for all subtitle types)
  segments = splitSegmentsForFullSentence(segments);
  
  // Store original segments after splitting
  originalSegments = JSON.parse(JSON.stringify(segments));
  
  renderSubtitles();
  renderList();
};

function renderSubtitles() {
  // Just ensure live subtitle is in the layer (no individual overlays)
  if (!subtitleLayer.contains(liveSubtitle)) {
    subtitleLayer.appendChild(liveSubtitle);
  }
}

// Split segments with more than 5 words into multiple segments with proportional timing
function splitSegmentsForFullSentence(segs) {
  const maxWordsPerLine = 5;
  const result = [];
  
  segs.forEach(s => {
    const words = s.text.split(' ');
    
    // If 5 words or less, keep as is
    if (words.length <= maxWordsPerLine) {
      result.push(s);
      return;
    }
    
    // Split into lines of max 5 words
    let lines = [];
    for (let i = 0; i < words.length; i += maxWordsPerLine) {
      lines.push(words.slice(i, i + maxWordsPerLine).join(' '));
    }
    
    // Create new segments for each line with proportional timing
    const duration = s.end - s.start;
    const timePerLine = duration / lines.length;
    
    lines.forEach((lineText, lineIdx) => {
      const lineStart = s.start + (lineIdx * timePerLine);
      const lineEnd = s.start + ((lineIdx + 1) * timePerLine);
      
      result.push({
        ...s,
        text: lineText,
        start: lineStart,
        end: lineEnd
      });
    });
  });
  
  return result;
}

function formatSubtitleForDisplay(text, type) {
  // Text is already split on client side if needed, just return as is
  return text;
}

// Enter Word Type Customization Mode
function enterWordTypeCustomizationMode(segment) {
  // Pause video
  try {
    video.pause();
  } catch(e) {
    console.error('Error pausing video:', e);
  }
  
  // Flag: in customization mode
  isCustomizingWords = true;
  
  // UPDATE status indicator
  updateCustomizationStatus();
  
  // Store the current customizing segment so done button can access it
  currentCustomizingSegment = segment;
  
  // Hide word buttons and show "Done Customizing" button
  const startBtn = document.getElementById('startCustomizing');
  if (startBtn) startBtn.style.display = 'none';
  
  const doneBtn = document.getElementById('doneCustomizing');
  if (doneBtn) {
    doneBtn.style.display = 'block';
    doneBtn.textContent = '✅ Done Customizing - Play Video';
  }
  
  // Show instruction
  alert('✅ CUSTOMIZATION MODE ACTIVE\n\n- Click word buttons to customize each word\n- Drag words to reposition them\n- Change color, size, font\n- Click SAVE for each word\n\nWhen done: Click "Done Customizing - Play Video" button');
}

// Setup the "Done Customizing" button ONCE during page initialization
function setupDoneCustomizingButton() {
  const doneBtn = document.getElementById('doneCustomizing');
  if (!doneBtn) return;
  
  doneBtn.onclick = () => {
    console.log('🔴 DONE button clicked, exiting customization mode');
    
    // Get the segment being customized
    const segment = currentCustomizingSegment;
    if (!segment) {
      console.error('❌ No segment being customized!');
      // Force exit anyway
      isCustomizingWords = false;
      currentCustomizingSegment = null;
      currentCustomizingWord = { segmentIdx: null, wordIdx: null };
      return;
    }
    
    // EXIT CUSTOMIZATION MODE - CRITICAL!
    isCustomizingWords = false;
    currentCustomizingSegment = null;
    currentCustomizingWord = { segmentIdx: null, wordIdx: null };
    
    // UPDATE status indicator - mode is now OFF
    updateCustomizationStatus();
    
    console.log('✅ Customization mode EXIT - isCustomizingWords =', isCustomizingWords);
    
    // Hide customization UI
    const wordContainer = document.getElementById('word-customization-container');
    if (wordContainer) {
      wordContainer.style.display = 'none';
      wordContainer.innerHTML = '';
    }
    
    // Hide "Done" button
    doneBtn.style.display = 'none';
    
    // Hide SAVE button
    const setBtn = document.getElementById('setCurrentWord');
    if (setBtn) setBtn.style.display = 'none';
    
    // RESTORE SUBTITLE LAYER VISIBILITY
    subtitleLayer.style.display = 'block';
    subtitleLayer.style.visibility = 'visible';
    subtitleLayer.style.pointerEvents = 'none';
    
    // CLEAN UP wordButtonsPanel styling (keep the buttons though!)
    const buttonsPanel = document.getElementById('wordButtonsPanel');
    if (buttonsPanel) {
      buttonsPanel.style.border = '';
      buttonsPanel.style.backgroundColor = '';
      buttonsPanel.style.padding = '';
    }
    
    // Refresh display to show customized words
    updateLiveSubtitle(segment);
    
    // Get the segment index to restore UI
    const segmentIdx = segments.indexOf(segment);
    if (segmentIdx >= 0) {
      // Restore normal UI
      selectSubtitle(segmentIdx);
    }
    
    alert('✅ CUSTOMIZATION COMPLETE!\n\nClick the play button to watch your video with customized subtitles.');
  };
}

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

function selectSubtitle(i){
  const s = segments[i];
  if(!s) return;
  
  // Seek video to start of subtitle so user can see it if paused
  if (video.paused && s.start !== undefined) {
     video.currentTime = s.start + 0.1; // Just inside the subtitle
  }
  
  // CRITICAL: ALWAYS EXIT customization mode when switching to any new subtitle
  if (isCustomizingWords) {
    console.log('🚫 Exiting customization mode - switching subtitle');
    isCustomizingWords = false;
    currentCustomizingSegment = null;
    currentCustomizingWord = { segmentIdx: null, wordIdx: null };
    
    // UPDATE status indicator - mode is now OFF
    updateCustomizationStatus();
    
    // Hide customization UI
    const wordContainer = document.getElementById('word-customization-container');
    if (wordContainer) {
      wordContainer.style.display = 'none';
      wordContainer.innerHTML = '';
    }
    
    // RESTORE SUBTITLE LAYER VISIBILITY
    subtitleLayer.style.display = 'block';
    subtitleLayer.style.visibility = 'visible';
    subtitleLayer.style.pointerEvents = 'none';
    
    // Hide customization buttons
    const startBtn = document.getElementById('startCustomizing');
    if (startBtn) startBtn.style.display = 'none';
    const doneBtn = document.getElementById('doneCustomizing');
    if (doneBtn) doneBtn.style.display = 'none';
    const setBtn = document.getElementById('setCurrentWord');
    if (setBtn) setBtn.style.display = 'none';
  }
  
  // Load the subtitle's OWN styling (no automatic inheritance)
  editText.value = s.text;
  segmentSubtitleType.value = s.subtitleType || 'full';
  fontSelect.value = s.font || 'Arial';
  color.value = s.color || '#ffffff';
  bgColor.value = s.bgColor ? (typeof s.bgColor === 'string' && s.bgColor.startsWith('rgba') ? '#000000' : s.bgColor) : '#000000';
  bgOpacity.value = s.bgOpacity !== undefined ? s.bgOpacity : 60;
  borderColor.value = s.borderColor || '#ffffff';
  borderOpacity.value = s.borderOpacity !== undefined ? s.borderOpacity : 0;
  if (studioHighlightColor) studioHighlightColor.value = s.studioHighlightColor || '#2196F3';
  if (studioColorGroup) studioColorGroup.style.display = (s.subtitleType === 'word-studio') ? 'block' : 'none';
  bold.checked = !!s.bold;
  size.value = s.size || 36;
  const px = s.x != null ? Math.round((s.x / video.clientWidth)*100) : 50;
  const py = s.y != null ? Math.round((s.y / video.clientHeight)*100) : 50;
  posX.value = px; posY.value = py;
  if (posXValue) posXValue.textContent = px;
  if (posYValue) posYValue.textContent = py;
  if (sizeValue) sizeValue.textContent = size.value;
  if (bgOpacityValue) bgOpacityValue.textContent = bgOpacity.value;
  if (borderOpacityValue) borderOpacityValue.textContent = borderOpacity.value;
  updateLiveSubtitle(s);
  
  // Handled safely in updateLiveSubtitle now.
  
  // Show "Set Position" button only in word-studio mode
  const setPositionBtn = document.getElementById('setPosition');
  if (setPositionBtn) {
    setPositionBtn.style.display = (s.subtitleType === 'word-studio') ? 'block' : 'none';
  }
  
  // Show "Set Word Positions" button for Word Type mode
  const setWordPositionBtn = document.getElementById('setWordPosition');
  if (setWordPositionBtn) {
    setWordPositionBtn.style.display = (s.subtitleType === 'word-type') ? 'block' : 'none';
  }
  
  // Render word buttons for Word Type mode
  if (s.subtitleType === 'word-type') {
    const buttonsPanel = document.getElementById('wordButtonsPanel');
    if (buttonsPanel) {
      // COMPLETELY reset panel styling
      buttonsPanel.style.display = 'flex';
      buttonsPanel.style.visibility = 'visible';
      buttonsPanel.style.opacity = '1';
      buttonsPanel.style.height = 'auto';
      buttonsPanel.style.minHeight = '50px';
    }
    
    renderWordTypeButtons(s);
    
    console.log('✅ Word-Type mode: Panel shown with', s.text.split(' ').length, 'words');
    
    // Show "Customize All Words" button
    const startBtn = document.getElementById('startCustomizing');
    if (startBtn) {
      startBtn.style.display = 'block';
      startBtn.textContent = '🎨 Customize All Words';
      startBtn.onclick = () => {
        enterWordTypeCustomizationMode(s);
      };
    }
    
    // Hide "Done Customizing" button initially
    const doneBtn = document.getElementById('doneCustomizing');
    if (doneBtn) {
      doneBtn.style.display = 'none';
    }
  } else {
    // Hide customization buttons for other modes - STRICTLY for word-type only
    const startBtn = document.getElementById('startCustomizing');
    if (startBtn) startBtn.style.display = 'none';
    const doneBtn = document.getElementById('doneCustomizing');
    if (doneBtn) doneBtn.style.display = 'none';
    const setBtn = document.getElementById('setCurrentWord');
    if (setBtn) setBtn.style.display = 'none';
    
    // CLEAN UP wordButtonsPanel styling for non-word-type (hide but don't clear!)
    const buttonsPanel = document.getElementById('wordButtonsPanel');
    if (buttonsPanel) {
      buttonsPanel.style.display = 'none';
      buttonsPanel.style.border = '';
      buttonsPanel.style.backgroundColor = '';
      buttonsPanel.style.padding = '';
    }
  }
  
  // Render word preview with interactive word selection
  renderDraggableWordPreview(s, -1);
}

// Render word type buttons for customization
function renderWordTypeButtons(segment) {
  
  const buttonsPanel = document.getElementById('wordButtonsPanel');
  
  if (!buttonsPanel) {
    console.error('❌❌❌ ERROR: wordButtonsPanel NOT FOUND! ❌❌❌');
    return;
  }
  
  
  // MAKE SURE we have text
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
  
  // Create buttons with strong, obvious styling - DRAGGABLE
  words.forEach((word, idx) => {
    
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = word;
    btn.id = `word-btn-${idx}`;
    
    // STRONG inline styles - make it obviously a button
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
    
    // STRONG hover effect
    btn.onmouseover = function() {
      this.style.transform = 'scale(1.1)';
      this.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.5)';
    };
    
    btn.onmouseout = function() {
      this.style.transform = 'scale(1)';
      this.style.boxShadow = 'none';
    };
    
    // CLICK handler for customization
    btn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // SHOW THIS WORD IN CENTER OF VIDEO
      showWordInVideoCenter(segment, idx, word);
    };
    
    buttonsPanel.appendChild(btn);
  });
  
}

// Start customizing a specific word
let currentCustomizingWord = { segmentIdx: null, wordIdx: null };

function showWordInVideoCenter(segment, wordIdx, word) {
  
  // FIND and SET the segment index in the segments array
  const segmentIdx = segments.indexOf(segment);
  if (segmentIdx === -1) {
    console.error('❌ Segment not found in segments array!');
    return;
  }
  
  // TRACK which word we're customizing
  currentCustomizingWord.segmentIdx = segmentIdx;
  currentCustomizingWord.wordIdx = wordIdx;
  
  // PAUSE VIDEO during customization
  try {
    video.pause();
  } catch(e) {
    console.error('❌ Error pausing video:', e);
  }
  
  // SET FLAG: We are now customizing words
  isCustomizingWords = true;
  
  // Make sure the current customizing segment is tracked
  currentCustomizingSegment = segment;
  
  // HIDE entire subtitle layer COMPLETELY
  subtitleLayer.style.display = 'none';
  subtitleLayer.style.visibility = 'hidden';
  subtitleLayer.style.pointerEvents = 'none';
  liveSubtitle.style.display = 'none';
  liveSubtitle.innerHTML = '';
  
  // HIDE buttons panel during customization
  const buttonsPanel = document.getElementById('wordButtonsPanel');
  if (buttonsPanel) {
    buttonsPanel.style.display = 'none';
  }
  
  // Initialize segment words array if needed
  if (!segment.words) segment.words = [];
  const words = segment.text.split(' ').filter(w => w.length > 0);
  
  // Initialize all words with distributed positions (grid layout)
  words.forEach((w, idx) => {
    if (!segment.words[idx]) {
      // Calculate grid position: 3 words per row
      const wordsPerRow = 3;
      const row = Math.floor(idx / wordsPerRow);
      const col = idx % wordsPerRow;
      
      // Distribute across video: left/center/right and top/middle/bottom
      const xPositions = [-30, 0, 30]; // -30%, 0%, +30% from center
      const yPositions = [-30, 0, 30]; // -30%, 0%, +30% from center
      
      segment.words[idx] = {
        text: w,
        x: xPositions[col],
        y: yPositions[Math.min(row, 2)], // Cap at 3 rows (0, 1, 2)
        color: '#FFFF00',
        font: 'Arial',
        size: 36,
        bold: false
      };
    }
  });
  
  const wordData = segment.words[wordIdx];
  
  // Create a container div for all words (separate from subtitleLayer)
  let wordContainer = document.getElementById('word-customization-container');
  if (!wordContainer) {
    wordContainer = document.createElement('div');
    wordContainer.id = 'word-customization-container';
    wordContainer.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      pointer-events: auto;
      z-index: 99999;
    `;
    // Add to subtitleLayer's parent (not subtitleLayer itself!)
    subtitleLayer.parentNode.appendChild(wordContainer);
  }
  
  wordContainer.innerHTML = ''; // Clear previous
  wordContainer.style.display = 'block'; // Make visible
  
  
  // Render ALL words as separate draggable elements
  words.forEach((w, idx) => {
    let wData = segment.words && segment.words[idx] ? segment.words[idx] : {
      text: w,
      x: 0,
      y: 0,
      color: '#FFFF00',
      size: 36,
      font: 'Arial',
      bold: false
    };
    
    // Make sure it's stored in segment.words
    if (!segment.words) segment.words = [];
    segment.words[idx] = wData;
    
    const wordEl = document.createElement('div');
    wordEl.className = 'word-customizable';
    wordEl.id = `word-${idx}`;
    wordEl.dataset.wordIdx = idx;
    wordEl.textContent = w;
    
    const isSelected = idx === wordIdx;
    const vw = video.clientWidth;
    const vh = video.clientHeight;
    
    wordEl.style.cssText = `
      position: absolute;
      left: ${(50 + wData.x) * vw / 100}px;
      top: ${(50 + wData.y) * vh / 100}px;
      transform: translate(-50%, -50%);
      color: ${wData.color};
      font-size: ${wData.size}px;
      font-weight: ${wData.bold ? 'bold' : 'normal'};
      font-family: ${wData.font};
      padding: 10px 15px;
      background: transparent;
      border: none;
      outline: ${isSelected ? '2px dashed #00FF00' : 'none'};
      border-radius: 8px;
      cursor: grab;
      user-select: none;
      white-space: nowrap;
      z-index: ${isSelected ? 10000 : 1000};
      transition: all 0.2s ease;
    `;
    
    wordContainer.appendChild(wordEl);
    
    // Click to select this word
    wordEl.onclick = (e) => {
      e.stopPropagation();
      // Refresh to show this word as selected
      showWordInVideoCenter(segment, idx, w);
    };
    
    // ONLY add dragging and customization for selected word
    if (isSelected) {
      let isDragging = false;
      let startX = 0, startY = 0;
      let startXPercent = wData.x, startYPercent = wData.y;
      
      // Create unique drag handlers for this word
      const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only left mouse button
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startXPercent = wData.x;
        startYPercent = wData.y;
        wordEl.style.cursor = 'grabbing';
        e.preventDefault();
        e.stopPropagation();
      };
      
      const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const deltaX = (e.clientX - startX) / vw * 100;
        const deltaY = (e.clientY - startY) / vh * 100;
        
        wData.x = startXPercent + deltaX;
        wData.y = startYPercent + deltaY;
        
        wordEl.style.left = (50 + wData.x) * vw / 100 + 'px';
        wordEl.style.top = (50 + wData.y) * vh / 100 + 'px';
      };
      
      const handleMouseUp = () => {
        if (isDragging) {
          isDragging = false;
          wordEl.style.cursor = 'grab';
          // Save position immediately after dragging stops
          wData.x = Math.round((wData.x) * 10) / 10; // Round to 1 decimal
          wData.y = Math.round((wData.y) * 10) / 10;
        }
      };
      
      // Attach handlers to word element and document
      wordEl.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Store handlers for cleanup later
      wordEl._dragHandlers = { handleMouseDown, handleMouseMove, handleMouseUp };
      
      // Update style controls
      if (color) color.value = wData.color;
      if (fontSelect) fontSelect.value = wData.font;
      if (size) size.value = wData.size;
      if (bold) bold.checked = wData.bold;
      if (sizeValue) sizeValue.textContent = wData.size;
      
      // REAL-TIME LIVE PREVIEW for this word
      if (color && color._wordCustomListener) {
        color.removeEventListener('input', color._wordCustomListener);
      }
      if (fontSelect && fontSelect._wordCustomListener) {
        fontSelect.removeEventListener('change', fontSelect._wordCustomListener);
      }
      if (size && size._wordCustomListener) {
        size.removeEventListener('input', size._wordCustomListener);
      }
      if (bold && bold._wordCustomListener) {
        bold.removeEventListener('change', bold._wordCustomListener);
      }
      
      // Color picker - REAL TIME
      if (color) {
        color._wordCustomListener = () => {
          wData.color = color.value;
          wordEl.style.color = color.value;
        };
        color.addEventListener('input', color._wordCustomListener);
      }
      
      // Font select - REAL TIME
      if (fontSelect) {
        fontSelect._wordCustomListener = () => {
          wData.font = fontSelect.value;
          wordEl.style.fontFamily = fontSelect.value;
        };
        fontSelect.addEventListener('change', fontSelect._wordCustomListener);
      }
      
      // Size slider - REAL TIME
      if (size) {
        size._wordCustomListener = () => {
          wData.size = parseInt(size.value);
          wordEl.style.fontSize = size.value + 'px';
          if (sizeValue) sizeValue.textContent = size.value;
        };
        size.addEventListener('input', size._wordCustomListener);
      }
      
      // Bold checkbox - REAL TIME
      if (bold) {
        bold._wordCustomListener = () => {
          wData.bold = bold.checked;
          wordEl.style.fontWeight = bold.checked ? 'bold' : 'normal';
        };
        bold.addEventListener('change', bold._wordCustomListener);
      }
      
      // SHOW SET BUTTON
      const setBtn = document.getElementById('setCurrentWord');
      if (setBtn) {
        setBtn.style.display = 'block';
        setBtn.textContent = '✅ SAVE: "' + w + '"';
        setBtn.onclick = () => {
          alert('✅ Word "' + w + '" SAVED!\nPosition: X:' + wData.x.toFixed(1) + '% Y:' + wData.y.toFixed(1) + '%\nColor: ' + wData.color + ' | Size: ' + wData.size + 'px\n\n👉 Click another WORD BUTTON to customize it, or click "Done Customizing" when finished!');
          
          // DO NOT exit customization mode yet - stay in it to customize more words
          // isCustomizingWords stays TRUE
          
          // Reset customizing word tracker for NEXT word
          currentCustomizingWord = { segmentIdx: null, wordIdx: null };
          
          // Save the word data to the segment FIRST
          if (!segment.words) segment.words = [];
          segment.words[wordIdx] = {
            text: w,
            x: wData.x,
            y: wData.y,
            color: wData.color,
            size: wData.size,
            font: wData.font,
            bold: wData.bold
          };
          
          console.log('✅ Word "' + w + '" saved. Customization mode REMAINS ON for more words.');
          
          // Hide customization container
          wordContainer.style.display = 'none';
          wordContainer.innerHTML = '';
          wordContainer.style.pointerEvents = 'none';
          setBtn.style.display = 'none';
          
          // SHOW subtitle layer again - but make sure it doesn't block controls
          subtitleLayer.style.display = 'block';
          subtitleLayer.style.visibility = 'visible';
          subtitleLayer.style.pointerEvents = 'none';
          
          // SHOW buttons panel again - IMPORTANT for multi-word customization
          const bp = document.getElementById('wordButtonsPanel');
          if (bp) {
            bp.style.display = 'flex';
            // Reset panel styling completely before adding new styles
            bp.style.border = '';
            bp.style.backgroundColor = '';
            bp.style.padding = '';
            // NOW add visual emphasis for next word
            bp.style.border = '3px solid #FFD700';
            bp.style.backgroundColor = 'rgba(255, 215, 0, 0.1)';
            bp.style.padding = '15px';
          }
          
          // Show a clear instruction
          const customizationInfo = document.createElement('div');
          customizationInfo.id = 'customization-next-step';
          customizationInfo.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-weight: bold;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            animation: pulse 1s infinite;
          `;
          customizationInfo.textContent = '👉 Click another word button to customize it!';
          
          // Add pulse animation if not already in stylesheet
          if (!document.getElementById('pulse-animation')) {
            const style = document.createElement('style');
            style.id = 'pulse-animation';
            style.textContent = '@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }';
            document.head.appendChild(style);
          }
          
          // Remove old notification if exists
          const oldNotif = document.getElementById('customization-next-step');
          if (oldNotif) oldNotif.remove();
          
          document.body.appendChild(customizationInfo);
          
          // Remove notification after 5 seconds
          setTimeout(() => {
            if (customizationInfo.parentNode) {
              customizationInfo.remove();
            }
          }, 5000);
          
          // Refresh video to show saved state
          updateLiveSubtitle(segment);
          
          // Re-render buttons to refresh click handlers for next word customization
          renderWordTypeButtons(segment);
          
          // Make sure video is still locked during customization
          console.log('🔒 Customization mode ACTIVE - isCustomizingWords =', isCustomizingWords);
        };
      }
    }
  });
}

// Hide customization container when NOT customizing
function hideWordCustomization() {
  const wordContainer = document.getElementById('word-customization-container');
  if (wordContainer) {
    wordContainer.style.display = 'none';
    wordContainer.innerHTML = '';
  }
  
  // Show buttons panel again
  const buttonsPanel = document.getElementById('wordButtonsPanel');
  if (buttonsPanel) {
    buttonsPanel.style.display = 'flex';
  }
}


// Render draggable word preview - for typing mode and other modes
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

// Enable dragging for individual word spans
function enableWordDragging(wordSpan, segment, wordIdx) {
  let draggingWord = false;
  let offsetX = 0, offsetY = 0;
  
  wordSpan.style.cursor = 'grabbing';
  
  wordSpan.addEventListener('mousedown', (ev) => {
    draggingWord = true;
    const rect = wordSpan.getBoundingClientRect();
    offsetX = ev.clientX - rect.left;
    offsetY = ev.clientY - rect.top;
  });
  
  const handleMouseMove = (ev) => {
    if (!draggingWord) return;
    
    const currentLeft = parseInt(wordSpan.style.left) || 0;
    const currentTop = parseInt(wordSpan.style.top) || 0;
    const deltaX = ev.movementX;
    const deltaY = ev.movementY;
    
    const newX = currentLeft + deltaX;
    const newY = currentTop + deltaY;
    
    wordSpan.style.left = newX + 'px';
    wordSpan.style.top = newY + 'px';
    
    // Update data attribute
    const styleData = JSON.parse(wordSpan.getAttribute('data-style') || '{}');
    styleData.x = newX;
    styleData.y = newY;
    wordSpan.setAttribute('data-style', JSON.stringify(styleData));
    
    // Update live subtitle preview if word-type mode
    if (segment.subtitleType === 'word-type') {
      updateLiveSubtitle(segment);
    }
  };
  
  const handleMouseUp = () => {
    draggingWord = false;
    wordSpan.style.cursor = 'grab';
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
  
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

// Add live style preview updates
// Add live style preview updates
function getPreviewSegment(s) {
  return {
    ...s,
    text: editText.value,
    font: fontSelect.value,
    color: color.value,
    bgColor: bgColor.value,
    bgOpacity: parseInt(bgOpacity.value, 10),
    borderColor: borderColor.value,
    borderOpacity: parseInt(borderOpacity.value, 10),
    studioHighlightColor: studioHighlightColor ? studioHighlightColor.value : '#2196F3',
    bold: bold.checked,
    size: parseInt(size.value, 10),
    x: Math.round((posX.value / 100) * video.clientWidth),
    y: Math.round((posY.value / 100) * video.clientHeight)
  };
}

function addLiveStylePreview() {
  const updateWordPreview = () => {
    if (selectedIndex === null) return;
    const s = segments[selectedIndex];
    
    // Generate a temporary segment with current form values
    const previewS = getPreviewSegment(s);
    
    // Update live subtitle preview with the merged object
    updateLiveSubtitle(previewS);
  };

  // Add listeners to all style controls
  color.addEventListener('input', updateWordPreview);
  bgColor.addEventListener('input', updateWordPreview);
  bgOpacity.addEventListener('input', updateWordPreview);
  borderColor.addEventListener('input', updateWordPreview);
  borderOpacity.addEventListener('input', updateWordPreview);
  fontSelect.addEventListener('change', updateWordPreview);
  size.addEventListener('input', updateWordPreview);
  bold.addEventListener('change', updateWordPreview);
  posX.addEventListener('input', updateWordPreview);
  posY.addEventListener('input', updateWordPreview);
  editText.addEventListener('input', updateWordPreview);
  if (studioHighlightColor) studioHighlightColor.addEventListener('input', updateWordPreview);
}

// Initialize live style preview updates
addLiveStylePreview();

applyBtn.onclick = ()=>{
  if(selectedIndex==null) return alert('Select a subtitle');
  const s = segments[selectedIndex];
  
  s.text = editText.value;
  s.font = fontSelect.value;
  s.color = color.value;
  s.bgColor = bgColor.value;
  s.bgOpacity = parseInt(bgOpacity.value, 10);
  s.borderColor = borderColor.value;
  s.borderOpacity = parseInt(borderOpacity.value, 10);
  if (studioHighlightColor) s.studioHighlightColor = studioHighlightColor.value;
  s.bold = bold.checked;
  s.size = parseInt(size.value,10);
  const nx = Math.round((posX.value/100)*video.clientWidth);
  const ny = Math.round((posY.value/100)*video.clientHeight);
  s.x = nx; s.y = ny;

  // Re-render list and live preview
  renderList();
  updateLiveSubtitle(s);

  // If word type mode, re-render the buttons
  if (s.subtitleType === 'word-type') {
    renderWordTypeButtons(s);
  }

  alert('Styles applied to this subtitle!');
};

applyAllBtn.onclick = ()=>{
  if(segments.length === 0) return alert('No subtitles to update');
  // Apply current editor values to ALL subtitles
  segments.forEach(s => {
    s.font = fontSelect.value;
    s.color = color.value;
    s.bgColor = bgColor.value;
    s.bgOpacity = parseInt(bgOpacity.value, 10);
    s.borderColor = borderColor.value;
    s.borderOpacity = parseInt(borderOpacity.value, 10);
    if (studioHighlightColor) s.studioHighlightColor = studioHighlightColor.value;
    s.bold = bold.checked;
    s.size = parseInt(size.value,10);
    const nx = Math.round((posX.value/100)*video.clientWidth);
    const ny = Math.round((posY.value/100)*video.clientHeight);
    s.x = nx; s.y = ny;
  });
  renderList();
  if(selectedIndex != null) updateLiveSubtitle(segments[selectedIndex]);
  alert(`Applied to all ${segments.length} subtitles!`);
};

applyTypeBtn.onclick = ()=>{
  if(selectedIndex==null) {
    return alert('Select a subtitle first');
  }
  
  const s = segments[selectedIndex];
  const newType = segmentSubtitleType.value;
  
  // CRITICAL: If switching away from word-type, EXIT customization mode
  if (newType !== 'word-type' && isCustomizingWords) {
    console.log('🚫 Exiting customization mode - changed to non-word-type: ' + newType);
    isCustomizingWords = false;
    currentCustomizingSegment = null;
    currentCustomizingWord = { segmentIdx: null, wordIdx: null };
    
    // UPDATE status indicator - mode is now OFF
    updateCustomizationStatus();
    
    // Hide customization UI
    const wordContainer = document.getElementById('word-customization-container');
    if (wordContainer) {
      wordContainer.style.display = 'none';
      wordContainer.innerHTML = '';
    }
  }

  // Clear previous word customizations when switching types so effects never overlap!
  if (s.subtitleType !== newType) {
    s.words = [];
  }
  
  s.subtitleType = newType;

  // INITIALIZE words array for word-type - START EMPTY!
  // Words will be created as user customizes each one
  if (newType === 'word-type' && !s.words) {
    s.words = [];
  }
  
  renderList();
  updateLiveSubtitle(s);
  
  // ⚠️ STRICT ENFORCEMENT: If Word Type, HIDE SUBTITLE until words are customized
  if (newType === 'word-type') {
    if (!s.words || s.words.length === 0) {
      liveSubtitle.style.display = 'none';
      liveSubtitle.innerHTML = '';
      liveSubtitle.style.visibility = 'hidden';
    }
  }
  
  
  // Render word buttons for Word Type mode
  if (newType === 'word-type') {
    renderWordTypeButtons(s);
  } else {
    const buttonsPanel = document.getElementById('wordButtonsPanel');
    if (buttonsPanel) buttonsPanel.innerHTML = '';
  }
  
  // Re-render word preview for the new type
  renderDraggableWordPreview(s, -1);
};

segmentSubtitleType.addEventListener('change', () => {
  if (selectedIndex != null) {
    applyTypeBtn.click();
  }
});


// Set current word customization
const setCurrentWordBtn = document.getElementById('setCurrentWord');
if (setCurrentWordBtn) {
  setCurrentWordBtn.onclick = ()=>{
    if (currentCustomizingWord.segmentIdx === null) return alert('Select a word first');
    
    const s = segments[currentCustomizingWord.segmentIdx];
    const wordIdx = currentCustomizingWord.wordIdx;
    const words = s.text.split(' ').filter(w => w.length > 0);
    
    // Initialize words array if needed
    if (!s.words) s.words = [];
    
    // The word should already be saved from the dragging/styling operations
    // But ensure all properties are set correctly from current control values
    if (s.words[wordIdx]) {
      s.words[wordIdx].color = color.value || '#FFFF00';
      s.words[wordIdx].size = parseInt(size.value) || 36;
      s.words[wordIdx].font = fontSelect.value || 'Arial';
      s.words[wordIdx].bold = bold.checked;
      // x and y should already be set from dragging
    } else {
      // Shouldn't happen, but create it just in case
      s.words[wordIdx] = {
        text: s.text.split(' ')[wordIdx],
        x: 0,
        y: 0,
        color: color.value || '#FFFF00',
        size: parseInt(size.value) || 36,
        font: fontSelect.value || 'Arial',
        bold: bold.checked
      };
    }
    
    // Check if ALL words are now customized
    const allCustomized = words.length === s.words.length && s.words.every(w => w !== undefined);
    
    if (allCustomized) {
      alert(`✓ Word "${s.words[wordIdx].text}" SAVED!\n\n✅ All words are now customized!\nReady to play video.`);
    } else {
      const customizedCount = s.words.filter(w => w !== undefined).length;
      alert(`✓ Word "${s.words[wordIdx].text}" SAVED!\n\n${customizedCount}/${words.length} words customized.\nCustomize the remaining ${words.length - customizedCount} word(s).`);
    }
    
    // Re-render buttons (update highlight)
    renderWordTypeButtons(s);
  };
}

// Set Word Positions for Word Type mode (legacy button - can be removed)
const setWordPositionBtn = document.getElementById('setWordPosition');
if (setWordPositionBtn) {
  setWordPositionBtn.onclick = ()=>{
    if(selectedIndex==null) return alert('Select a subtitle first');
    alert('✓ Word customizations already saved!');
  };
}

function formatTime(sec){
  const s = Math.floor(sec%60).toString().padStart(2,'0');
  const m = Math.floor((sec/60)%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

function generateMockSegments(duration){
  const segs = [];
  const segLen = Math.max(2, Math.min(5, Math.floor(duration / 6)));
  for (let t = 0; t < duration; t += segLen) {
    const start = t;
    const end = Math.min(duration, t + segLen);
    segs.push({ start, end, text: `(mock) speech from ${start}s to ${end}s` });
  }
  return segs;
}

function splitLongSubtitles(segs) {
  // Max 5 words per line for full sentence type
  const maxWordsPerLine = 5;
  const result = [];
  
  segs.forEach(s => {
    const text = s.text || '';
    const duration = s.end - s.start;
    const words = text.split(' ');
    
    // If 5 words or less, keep as is
    if (words.length <= maxWordsPerLine) {
      result.push(s);
      return;
    }
    
    // Split into chunks of max 5 words each
    let chunks = [];
    for (let i = 0; i < words.length; i += maxWordsPerLine) {
      chunks.push(words.slice(i, i + maxWordsPerLine).join(' '));
    }
    
    // Split time based on word count ratio
    let timeUsed = s.start;
    chunks.forEach((text, idx) => {
      const wordCount = text.split(' ').length;
      const totalWords = words.length;
      const chunkDuration = (wordCount / totalWords) * duration;
      
      result.push({
        ...s,
        text: text,
        start: timeUsed,
        end: timeUsed + chunkDuration
      });
      timeUsed += chunkDuration;
    });
  });
  
  return result;
}

btnExport.onclick = async ()=>{
  if (!fileEl.files[0]) return alert('Select a video first');
  const fd = new FormData();
  fd.append('video', fileEl.files[0]);
  
  // For Word Studio mode, send individual word data
  const cWidth = video.clientWidth || 640;
  const cHeight = video.clientHeight || 360;
  const vWidth = video.videoWidth || 1280;
  const vHeight = video.videoHeight || 720;
  
  // Compute rendered video area inside the container (object-fit: contain)
  const videoRatio = vWidth / vHeight;
  const containerRatio = cWidth / cHeight;
  
  let renderedWidth, renderedHeight, offsetX, offsetY;
  if (videoRatio > containerRatio) {
    renderedWidth = cWidth;
    renderedHeight = cWidth / videoRatio;
    offsetX = 0;
    offsetY = (cHeight - renderedHeight) / 2;
  } else {
    renderedHeight = cHeight;
    renderedWidth = cHeight * videoRatio;
    offsetX = (cWidth - renderedWidth) / 2;
    offsetY = 0;
  }

  // CRITICAL: Calculate font size scaling factor
  // ASS resolution is 1280x720, but rendered video may be smaller (e.g., 640x360)
  // We need to scale font sizes from viewport pixels to ASS resolution
  const fontScaleFactor = vWidth / renderedWidth;

  let exportSegments = segments.map(s => {
    let sAssX = null, sAssY = null;
    if (s.x != null) {
      const percentX = (s.x - offsetX) / renderedWidth;
      sAssX = Math.round(percentX * vWidth);
    }
    if (s.y != null) {
      const percentY = (s.y - offsetY) / renderedHeight;
      sAssY = Math.round(percentY * vHeight);
    }

    // Scale font size from viewport to ASS resolution
    const scaledSize = Math.round((s.size || 36) * fontScaleFactor);

    return {
      start: s.start,
      end: s.end,
      text: s.text,
      subtitleType: s.subtitleType,
      x: s.x,
      y: s.y,
      assX: sAssX,
      assY: sAssY,
      color: s.color,
      bgColor: s.bgColor,
      bgOpacity: s.bgOpacity,
      borderColor: s.borderColor,
      borderOpacity: s.borderOpacity,
      studioHighlightColor: s.studioHighlightColor,
      font: s.font,
      size: scaledSize,
      bold: s.bold,
      words: (s.words || []).map(w => {
        let wAssX = null, wAssY = null;
        if (w.x != null) {
          const absPxX = (50 + w.x) * cWidth / 100;
          const pctX = (absPxX - offsetX) / renderedWidth;
          wAssX = Math.round(pctX * vWidth);
        }
        if (w.y != null) {
          const absPxY = (50 + w.y) * cHeight / 100;
          const pctY = (absPxY - offsetY) / renderedHeight;
          wAssY = Math.round(pctY * vHeight);
        }
        
        // Scale word font size too
        const wordScaledSize = Math.round((w.size || 36) * fontScaleFactor);
        
        return {
          ...w,
          assX: wAssX,
          assY: wAssY,
          size: wordScaledSize
        };
      })
    };
  });

  fd.append('segments', JSON.stringify(exportSegments));
  fd.append('vWidth', vWidth);
  fd.append('vHeight', vHeight);
  // Removed subtitleType since it's now handled contextually per-segment

  btnExport.textContent = 'Exporting...';
  
  try {
    const res = await fetch('/export', { method: 'POST', body: fd });
    btnExport.disabled = false; 
    btnExport.textContent = 'Export Video';
    
    if (!res.ok) {
      const err = await res.json();
      return alert('Export failed: ' + (err?.error || 'Unknown error'));
    }
    
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `video-with-subs.mp4`;
    a.click();
    
    alert('✓ Video exported successfully!');
  } catch (err) {
    btnExport.disabled = false;
    btnExport.textContent = 'Export Video';
    alert('Export error: ' + err.message);
  }
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Calculate word timing for a segment based on segment duration
function calculateWordTimings(segment) {
  const words = segment.text.split(' ');
  const duration = segment.end - segment.start;
  const timePerWord = duration / words.length;
  
  return words.map((word, idx) => ({
    text: word,
    start: segment.start + (idx * timePerWord),
    end: segment.start + ((idx + 1) * timePerWord),
    wordIndex: idx,
    totalWords: words.length
  }));
}

function updateLiveSubtitle(s, currentTime = null){
  if(!s){ 
    liveSubtitle.innerHTML = ''; 
    liveSubtitle.style.display = 'none'; 
    return; 
  }
  
  // Use video time if not provided, for real-time preview of animations
  const t = currentTime !== null ? currentTime : video.currentTime;
  
  // COMPLETE CSS RESET - clear ALL properties to prevent cross-type contamination
  liveSubtitle.style.position = 'absolute';
  liveSubtitle.style.left = '0';
  liveSubtitle.style.top = '0';
  liveSubtitle.style.width = '100%';
  liveSubtitle.style.height = '100%';
  liveSubtitle.style.transform = 'none';
  liveSubtitle.style.display = 'block';
  liveSubtitle.style.visibility = 'visible';
  liveSubtitle.style.opacity = '1';
  liveSubtitle.style.background = 'none';
  liveSubtitle.style.border = 'none';
  liveSubtitle.style.padding = '0';
  liveSubtitle.style.margin = '0';
  liveSubtitle.style.pointerEvents = 'auto'; // allow dragging clicks
  liveSubtitle.style.overflow = 'visible';
  liveSubtitle.style.textAlign = 'initial';
  liveSubtitle.style.alignItems = 'initial';
  liveSubtitle.style.justifyContent = 'initial';
  liveSubtitle.style.flexWrap = 'initial';
  liveSubtitle.style.gap = 'initial';
  
  const vw = video.clientWidth;
  const vh = video.clientHeight;
  const type = s.subtitleType || 'full';

  // Only allow clicks (like dragging) if it's not a full-screen absolute position mode.
  liveSubtitle.style.pointerEvents = (type === 'word-type') ? 'none' : 'auto';

  // Base styling for standard modes
  const font = s.font || 'Arial';
  const size = (s.size || 36) + 'px';
  const color = s.color || '#fff';
  const fontWeight = s.bold ? '700' : '400';
  
  const bgColorHex = s.bgColor || '#000000';
  const bgOpacityPercent = (s.bgOpacity !== undefined ? s.bgOpacity : 60) / 100;
  const bgRgb = hexToRgb(bgColorHex);
  const background = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${bgOpacityPercent})`;
  
  const borderColorHex = s.borderColor || '#ffffff';
  const borderOpacityPercent = (s.borderOpacity !== undefined ? s.borderOpacity : 0) / 100;
  const borderRgb = hexToRgb(borderColorHex);
  const border = borderOpacityPercent > 0 ? `2px solid rgba(${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}, ${borderOpacityPercent})` : 'none';
  
  const x = s.x != null ? s.x : vw/2;
  const y = s.y != null ? s.y : vh*0.5;

  // Type-specific rendering
  if (type === 'typing-word') {
    // Typing effect: words appear progressively based on time
    const wordTimings = calculateWordTimings(s);
    let displayHTML = '';
    
    // For editing comfort, if paused, just show all words.
    const shouldShowAll = video.paused;
    
    wordTimings.forEach((wt) => {
      // Show word if time is past start time, OR if video is paused (editing mode)
      const shouldShow = t >= wt.start || shouldShowAll;
      
      if (shouldShow) {
        displayHTML += `<span style="display:inline-block;margin:0 4px;color:${color};font-weight:${fontWeight};">${wt.text}</span>`;
      }
    });
    
    liveSubtitle.innerHTML = displayHTML;
    
    // Apply container styling
    liveSubtitle.style.width = 'max-content';
      liveSubtitle.style.maxWidth = (vw * 0.8) + 'px';
      liveSubtitle.style.height = 'auto';
      liveSubtitle.style.left = x + 'px';
    liveSubtitle.style.top = y + 'px';
    liveSubtitle.style.transform = 'translate(-50%, -50%)';
    liveSubtitle.style.background = background;
    liveSubtitle.style.border = border;
    liveSubtitle.style.fontFamily = font;
    liveSubtitle.style.fontSize = size;
    liveSubtitle.style.textAlign = 'center';
    liveSubtitle.style.padding = '10px 15px';
    liveSubtitle.style.borderRadius = '8px';
    liveSubtitle.style.display = 'block';
    
  } 
  else if (type === 'word-type') {
    // Word Type Mode
    if (!s.words || s.words.length === 0) {
      // User explicitly wants Word Type to NOT show the default sentence!
      liveSubtitle.innerHTML = '';
      liveSubtitle.style.display = 'none';
    } else {
      const wordTimings = calculateWordTimings(s);
      let displayHTML = '';
      
      const shouldShowAll = video.paused;
      
      wordTimings.forEach((wt, idx) => {
        // ONLY show if this word has been customized
        const isCustomized = s.words && s.words[idx];
        const shouldShow = t >= wt.start || shouldShowAll;
        
        if (isCustomized && shouldShow) {
          const wordStyle = s.words[idx];
          const wordColor = wordStyle.color || '#FFFF00';
          const wordSize = wordStyle.size || 36;
          const wordBold = wordStyle.bold !== undefined ? wordStyle.bold : false;
          const wordFont = wordStyle.font || 'Arial';
          const wordX = wordStyle.x || 0;
          const wordY = wordStyle.y || 0;
          
          const posLeft = 50 + wordX;
          const posTop = 50 + wordY;
          
          displayHTML += `<div style="position:absolute;left:${posLeft}%;top:${posTop}%;transform:translate(-50%,-50%);color:${wordColor};font-size:${wordSize}px;font-weight:${wordBold ? '700' : '400'};font-family:${wordFont};white-space:nowrap;z-index:999;">${wt.text}</div>`;
        }
      });
      
      if (displayHTML === '') {
        liveSubtitle.innerHTML = '';
        liveSubtitle.style.display = 'none';
      } else {
        liveSubtitle.innerHTML = displayHTML;
        liveSubtitle.style.display = 'block';
      }
    }
  }
  else if (type === 'word-studio') {
    // Word Studio: individual words, current one highlighted based on time
    const wordTimings = calculateWordTimings(s);
    const activeHighlightColor = s.studioHighlightColor || '#2196F3';
    
    // Fallback logic for visibility
    const isOutsideBounds = video.paused && (t < s.start || t > s.end);
    
    liveSubtitle.innerHTML = wordTimings.map((wt) => {
      // Active if within timing, or if we are outside bounds just highlight first word
      let isActive = t >= wt.start && t < wt.end;
      if (isOutsideBounds && wt.wordIndex === 0) isActive = true;
      // If paused but within bounds, highlight the correct word based on time
      
      const spanBg = isActive ? activeHighlightColor : background;
      return `<span style="display:inline-block;background:${spanBg};color:${color};padding:4px 8px;border-radius:4px;margin:2px;transition:all 0.2s;">${wt.text}</span>`;
    }).join('');
    
    // Apply container styling
    liveSubtitle.style.width = 'max-content';
      liveSubtitle.style.maxWidth = (vw * 0.8) + 'px';
      liveSubtitle.style.height = 'auto';
      liveSubtitle.style.left = x + 'px';
    liveSubtitle.style.top = y + 'px';
    liveSubtitle.style.transform = 'translate(-50%, -50%)';
    liveSubtitle.style.border = border;
    liveSubtitle.style.fontFamily = font;
    liveSubtitle.style.fontSize = size;
    liveSubtitle.style.fontWeight = fontWeight;
    liveSubtitle.style.textAlign = 'center';
    liveSubtitle.style.padding = '10px 15px';
    liveSubtitle.style.borderRadius = '8px';
    liveSubtitle.style.display = 'block';
  }
  else {
    // Full sentence (default)
    liveSubtitle.innerHTML = s.text;
    
    // Apply container styling
    liveSubtitle.style.width = 'max-content';
      liveSubtitle.style.maxWidth = (vw * 0.8) + 'px';
      liveSubtitle.style.height = 'auto';
      liveSubtitle.style.left = x + 'px';
    liveSubtitle.style.top = y + 'px';
    liveSubtitle.style.transform = 'translate(-50%, -50%)';
    liveSubtitle.style.background = background;
    liveSubtitle.style.border = border;
    liveSubtitle.style.color = color;
    liveSubtitle.style.fontFamily = font;
    liveSubtitle.style.fontSize = size;
    liveSubtitle.style.fontWeight = fontWeight;
    liveSubtitle.style.textAlign = 'center';
    liveSubtitle.style.padding = '10px 15px';
    liveSubtitle.style.borderRadius = '8px';
    liveSubtitle.style.display = 'block';
  }
}

// Prevent video play during customization mode
video.addEventListener('click', (e) => {
  if (isCustomizingWords) {
    e.preventDefault();
    e.stopPropagation();
    console.log('⏸️ VIDEO LOCKED - in customization mode');
    return false;
  }
});

video.addEventListener('timeupdate', ()=>{
  // IF CUSTOMIZING WORDS: Don't render subtitles, only show customization
  if (isCustomizingWords) {
    return;
  }
  
  if(!segments || segments.length===0) {
    liveSubtitle.innerHTML = '';
    liveSubtitle.style.display = 'none';
    return;
  }
  
  const t = video.currentTime;
  const cur = segments.find(s=> t>=s.start && t<=s.end);
  const curIdx = segments.indexOf(cur);
  currentPlayingIndex = curIdx >= 0 ? curIdx : null;
  
  if (cur) {
    // If it's the currently selected segment, use the live preview values
    if (curIdx === selectedIndex) {
       updateLiveSubtitle(getPreviewSegment(cur), t);
    } else {
       updateLiveSubtitle(cur, t);
    }
  } else {
    liveSubtitle.innerHTML = '';
    liveSubtitle.style.display = 'none';
  }
});

if(centerToggle){
  centerToggle.addEventListener('change', ()=>{
    // if a subtitle is selected or playing, update live position
    const t = video.currentTime;
    const cur = segments.find(s=> t>=s.start && t<=s.end) || (selectedIndex!=null && segments[selectedIndex]);
    if (cur) {
      updateLiveSubtitle(cur, t);
    }
  });
}
