const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

function escapeASS(text) {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\N').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

function hexToASS(hexColor) {
  // Convert #RRGGBB to ASS format &HBBGGRR&
  if (!hexColor) return '&HFFFFFF&';
  const hex = hexColor.replace('#', '');
  const r = hex.substring(0, 2);
  const g = hex.substring(2, 4);
  const b = hex.substring(4, 6);
  return `&H${b}${g}${r}&`;
}

function makeASS(scriptInfo) {
  const { styles = {}, events = [] } = scriptInfo;
  const header = `[Script Info]\nTitle: generated\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`;

  const styleLine = (name, s) => {
    const font = s.font || 'Arial';
    const size = s.size || 36;
    const color = s.color || '&H00FFFFFF';
    const bold = s.bold ? -1 : 0;
    const outline = s.outline || 2;
    const alignment = s.alignment || 2;
    return `Style: ${name},${font},${size},${color},${color},${color},&H00000000,${bold},0,0,0,100,100,0,0,1,${outline},0,${alignment},10,10,10,1`;
  };

  const bodyStyles = [];
  bodyStyles.push(styleLine('Default', styles.default || {}));

  const eventsHeader = `\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const eventsLines = events.map(ev => {
    const start = asTimestamp(ev.start);
    const end = asTimestamp(ev.end);
    const text = ev.text || '';
    
    // Apply per-event styling with override tags
    let styled_text = text;
    const tags = [];
    
    if (ev.color && ev.color !== '&H00FFFFFF') {
      tags.push(`\\c${ev.color}`);
    }
    if (ev.font && ev.font !== 'Arial') {
      tags.push(`\\fn${ev.font}`);
    }
    if (ev.size && ev.size !== 36) {
      tags.push(`\\fs${ev.size}`);
    }
    if (ev.bold) {
      tags.push('\\b1');
    }
    if (ev.x != null && ev.y != null) {
      tags.push(`\\pos(${Math.round(ev.x)},${Math.round(ev.y)})`);
    }
    
    if (tags.length > 0) {
      styled_text = `{${tags.join('')}}${text}`;
    }
    
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${styled_text}`;
  });

  return header + bodyStyles.join('\n') + eventsHeader + eventsLines.join('\n');
}

function asTimestamp(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const cs = Math.floor((s - Math.floor(s)) * 100);
  return `${pad(h)}:${pad(m)}:${pad(sec)}.${pad(cs)}`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

async function burnASS(inputPath, segments, styles, outPath, subtitleType) {
  return new Promise((resolve, reject) => {
    const tmpAss = inputPath + '.ass';
    
    // Generate ASS events based on per-segment subtitle types
    let events = [];
    
    segments.forEach(segment => {
      const segType = segment.subtitleType || 'full';
      
      if (segType === 'word-studio' && segment.words && segment.words.length > 0) {
        // Word Studio: Create individual ASS events for each word
        const duration = segment.end - segment.start;
        const timePerWord = duration / segment.words.length;
        
        segment.words.forEach((word, idx) => {
          const wordStart = segment.start + (idx * timePerWord);
          const wordEnd = segment.start + ((idx + 1) * timePerWord);
          
          events.push({
            start: wordStart,
            end: wordEnd,
            text: escapeASS(word.text),
            x: (segment.x || 640) + (word.x || 0),
            y: (segment.y || 360) + (word.y || 0),
            color: hexToASS(word.color || segment.color || '#ffffff'),
            font: word.font || segment.font || 'Arial',
            size: word.size || segment.size || 36,
            bold: word.bold !== undefined ? word.bold : segment.bold
          });
        });
      } else if (segType === 'word-type') {
        // Word Type: words appear progressively with custom positions and styles
        const words = segment.text.split(' ');
        const duration = segment.end - segment.start;
        const timePerWord = duration / words.length;
        
        // For each word timing slot, show all words from 0 to current
        for (let i = 0; i < words.length; i++) {
          const slotStart = segment.start + (i * timePerWord);
          const slotEnd = segment.start + ((i + 1) * timePerWord);
          
          // Show all words from 0 to i (cumulative display)
          let displayText = '';
          for (let j = 0; j <= i; j++) {
            if (j > 0) displayText += ' ';
            const wordData = segment.words && segment.words[j] ? segment.words[j] : {};
            displayText += words[j];
          }
          
          // Use style of the current word being displayed
          const currentWordData = segment.words && segment.words[i] ? segment.words[i] : {};
          
          events.push({
            start: slotStart,
            end: slotEnd,
            text: escapeASS(displayText),
            x: (segment.x || 640) + (currentWordData.x || 0),
            y: (segment.y || 360) + (currentWordData.y || 0),
            color: hexToASS(currentWordData.color || segment.color || '#ffffff'),
            font: currentWordData.font || segment.font || 'Arial',
            size: currentWordData.size || segment.size || 36,
            bold: currentWordData.bold !== undefined ? currentWordData.bold : segment.bold
          });
        }
      } else if (segType === 'typing-word') {
        // Typing effect: create events for each word appearing one by one
        const words = segment.text.split(' ');
        const duration = segment.end - segment.start;
        const timePerWord = duration / words.length;
        
        words.forEach((word, idx) => {
          const wordStart = segment.start + (idx * timePerWord);
          const wordEnd = segment.start + ((idx + 1) * timePerWord);
          
          events.push({
            start: wordStart,
            end: wordEnd,
            text: escapeASS(word),
            x: segment.x,
            y: segment.y,
            color: hexToASS(segment.color || '#ffffff'),
            font: segment.font || 'Arial',
            size: segment.size || 36,
            bold: segment.bold
          });
        });
      } else {
        // Full Sentence and Numbered Words: show full text
        events.push({
          start: segment.start,
          end: segment.end,
          text: escapeASS(segment.text),
          x: segment.x,
          y: segment.y,
          color: hexToASS(segment.color || '#ffffff'),
          font: segment.font || 'Arial',
          size: segment.size || 36,
          bold: segment.bold
        });
      }
    });
    
    const ass = makeASS({ styles, events });
    
    console.log('=== ASS FILE PREVIEW ===');
    console.log(ass.substring(0, 500));
    console.log(`... (${events.length} events total)`);
    
    fs.writeFileSync(tmpAss, ass, 'utf8');

    ffmpeg(inputPath)
      .videoFilters({ filter: 'ass', options: tmpAss })
      .outputOptions('-c:v libx264', '-crf 23', '-preset veryfast')
      .on('end', () => {
        try { fs.unlinkSync(tmpAss); } catch (e) {}
        resolve(outPath);
      })
      .on('error', err => {
        try { fs.unlinkSync(tmpAss); } catch (e) {}
        reject(err);
      })
      .save(outPath);
  });
}

module.exports = { burnASS };
