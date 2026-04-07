const fileEl = document.getElementById('file');
const btnUpload = document.getElementById('btnUpload');
const btnExport = document.getElementById('btnExport');
const video = document.getElementById('video');
const subtitleLayer = document.getElementById('subtitle-layer');
const subsList = document.getElementById('subs-list');
const fileNameEl = document.getElementById('file-name');

let segments = [];
let selectedIndex = null;

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
const posX = document.getElementById('posX');
const posY = document.getElementById('posY');
const applyBtn = document.getElementById('apply');
const applyAllBtn = document.getElementById('applyAll');

// live subtitle element (centered by default)
const liveSubtitle = document.createElement('div');
liveSubtitle.id = 'live-subtitle';
liveSubtitle.className = 'live-subtitle';
liveSubtitle.style.display = 'none';
subtitleLayer.appendChild(liveSubtitle);

// Setup live subtitle drag functionality
let dragging = false, offsetX = 0, offsetY = 0;
let currentPlayingIndex = null;

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

btnUpload.onclick = async () => {
  if (!fileEl.files[0]) return alert('Select a video first');
  const fd = new FormData();
  fd.append('video', fileEl.files[0]);
  btnUpload.disabled = true; btnUpload.textContent = 'Uploading...';
  const res = await fetch('/transcribe', { method: 'POST', body: fd });
  btnUpload.disabled = false; btnUpload.textContent = 'Upload & Generate';
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
  segments = segments.map(s => ({ ...s, x: null, y: null, font: 'Arial', color: '#ffffff', bgColor: '#000000', bgOpacity: 60, borderColor: '#ffffff', borderOpacity: 0, bold: false, size: 36 }));
  // Split long subtitles into max 2 lines
  segments = splitLongSubtitles(segments);
  renderSubtitles();
  renderList();
};

function renderSubtitles() {
  // Just ensure live subtitle is in the layer (no individual overlays)
  if (!subtitleLayer.contains(liveSubtitle)) {
    subtitleLayer.appendChild(liveSubtitle);
  }
}

function renderList(){
  subsList.innerHTML = '';
  segments.forEach((s,i)=>{
    const el = document.createElement('div'); el.className='sub-item'; el.textContent = `${formatTime(s.start)} - ${formatTime(s.end)} : ${s.text}`;
    el.onclick = ()=> { selectedIndex = i; selectSubtitle(i); };
    subsList.appendChild(el);
  });
}

function selectSubtitle(i){
  const s = segments[i];
  if(!s) return;
  
  // Load the subtitle's OWN styling (no automatic inheritance)
  editText.value = s.text;
  fontSelect.value = s.font || 'Arial';
  color.value = s.color || '#ffffff';
  bgColor.value = s.bgColor ? (typeof s.bgColor === 'string' && s.bgColor.startsWith('rgba') ? '#000000' : s.bgColor) : '#000000';
  bgOpacity.value = s.bgOpacity !== undefined ? s.bgOpacity : 60;
  borderColor.value = s.borderColor || '#ffffff';
  borderOpacity.value = s.borderOpacity !== undefined ? s.borderOpacity : 0;
  bold.checked = !!s.bold;
  size.value = s.size || 36;
  const px = s.x != null ? Math.round((s.x / video.clientWidth)*100) : 50;
  const py = s.y != null ? Math.round((s.y / video.clientHeight)*100) : 50;
  posX.value = px; posY.value = py;
  updateLiveSubtitle(s);
}

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
  s.bold = bold.checked;
  s.size = parseInt(size.value,10);
  const nx = Math.round((posX.value/100)*video.clientWidth);
  const ny = Math.round((posY.value/100)*video.clientHeight);
  s.x = nx; s.y = ny;
  renderList();
  updateLiveSubtitle(s);
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
    s.bold = bold.checked;
    s.size = parseInt(size.value,10);
    const nx = Math.round((posX.value/100)*video.clientWidth);
    const ny = Math.round((posY.value/100)*video.clientHeight);
    s.x = nx; s.y = ny;
  });
  renderList();
  if(selectedIndex != null) updateLiveSubtitle(segments[selectedIndex]);
  alert('Applied to all subtitles!');
};

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
  // Max characters per 2 lines (~50-60 chars per subtitle)
  const maxCharsPerSub = 60;
  const result = [];
  
  segs.forEach(s => {
    const text = s.text || '';
    const duration = s.end - s.start;
    
    // Check if text needs splitting (estimate ~40 chars per line, max 2 lines)
    if (text.length <= 80) {
      result.push(s);
      return;
    }
    
    // Split by words
    const words = text.split(' ');
    let chunks = [];
    let currentChunk = '';
    
    words.forEach(word => {
      if ((currentChunk + ' ' + word).trim().length <= maxCharsPerSub) {
        currentChunk += (currentChunk ? ' ' : '') + word;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = word;
      }
    });
    if (currentChunk) chunks.push(currentChunk);
    
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
  fd.append('segments', JSON.stringify(segments.map(s=>({ start: s.start, end: s.end, text: s.text, x: s.x, y: s.y }))));
  fd.append('styles', JSON.stringify({ default: { font: 'Arial', size: 36, color: '&H00FFFFFF', bold: false } }));
  btnExport.disabled = true; btnExport.textContent = 'Exporting...';
  const res = await fetch('/export', { method: 'POST', body: fd });
  btnExport.disabled = false; btnExport.textContent = 'Export Video (burned)';
  if (!res.ok) return alert('Export failed');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'video-with-subs.mp4';
  a.click();
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function updateLiveSubtitle(s){
  if(!s){ liveSubtitle.textContent = ''; liveSubtitle.style.display = 'none'; return; }
  liveSubtitle.style.display = 'block';
  liveSubtitle.textContent = s.text;
  liveSubtitle.style.color = s.color || '#fff';
  
  // Convert hex color with opacity to rgba for background
  const bgColorHex = s.bgColor || '#000000';
  const bgOpacityPercent = (s.bgOpacity !== undefined ? s.bgOpacity : 60) / 100;
  const bgRgb = hexToRgb(bgColorHex);
  liveSubtitle.style.background = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${bgOpacityPercent})`;
  
  // Convert hex color with opacity to rgba for border
  const borderColorHex = s.borderColor || '#ffffff';
  const borderOpacityPercent = (s.borderOpacity !== undefined ? s.borderOpacity : 0) / 100;
  const borderRgb = hexToRgb(borderColorHex);
  if (borderOpacityPercent > 0) {
    liveSubtitle.style.border = `2px solid rgba(${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}, ${borderOpacityPercent})`;
  } else {
    liveSubtitle.style.border = 'none';
  }
  
  liveSubtitle.style.fontFamily = s.font || 'Arial';
  liveSubtitle.style.fontWeight = s.bold ? '700' : '400';
  liveSubtitle.style.fontSize = (s.size || 36) + 'px';
  
  // Set width to 80% of video width
  const vw = video.clientWidth; const vh = video.clientHeight;
  liveSubtitle.style.width = (vw * 0.8) + 'px';
  
  // Center horizontally and vertically by default, or use custom position if dragged
  const x = s.x != null ? s.x : vw/2;
  const y = s.y != null ? s.y : vh*0.5;
  liveSubtitle.style.left = x + 'px';
  liveSubtitle.style.top = y + 'px';
  liveSubtitle.style.transform = 'translate(-50%, -50%)';
}

video.addEventListener('timeupdate', ()=>{
  if(!segments || segments.length===0) return;
  const t = video.currentTime;
  const cur = segments.find(s=> t>=s.start && t<=s.end);
  const curIdx = segments.indexOf(cur);
  currentPlayingIndex = curIdx >= 0 ? curIdx : null;
  if(cur){
    updateLiveSubtitle(cur);
  } else {
    liveSubtitle.textContent = '';
  }
});

if(centerToggle){
  centerToggle.addEventListener('change', ()=>{
    // if a subtitle is selected or playing, update live position
    const t = video.currentTime;
    const cur = segments.find(s=> t>=s.start && t<=s.end) || (selectedIndex!=null && segments[selectedIndex]);
    updateLiveSubtitle(cur);
  });
}
