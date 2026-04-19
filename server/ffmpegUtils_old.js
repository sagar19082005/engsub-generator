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
    const text = escapeASS(ev.text || '');
    // pos override
    const posTag = (ev.x != null && ev.y != null) ? `\\pos(${Math.round(ev.x)},${Math.round(ev.y)})` : '';
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,{${posTag}}${text}`;
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
    
    // Generate events based on subtitle type
    let events = [];
    
    if (subtitleType === 'typing-word') {
      // For typing-word effect: create individual word events with staggered timing
      segments.forEach(s => {
        const words = s.text.split(' ');
        const duration = s.end - s.start;
        const timePerWord = duration / words.length;
        
        let displayedWords = [];
        words.forEach((word, idx) => {
          displayedWords.push(word);
          const wordStartTime = s.start + (idx * timePerWord);
          const wordEndTime = s.end; // Each word stays until segment ends
          
          events.push({
            start: wordStartTime,
            end: wordEndTime,
            text: displayedWords.join(' '), // Show all words up to this point
            x: s.x,
            y: s.y,
            color: s.color,
            font: s.font,
            size: s.size,
            bold: s.bold
          });
        });
      });
    } else if (subtitleType === 'full') {
      // For full sentence: segments are already split on client side
      // Just use them as-is
      events = segments.map(s => {
        let text = s.text;
        
        // If segment has per-word styling, generate ASS text with inline tags
        if (s.words && s.words.length > 0) {
          const hasPerWordStyling = s.words.some(w => 
            w.color !== s.color || 
            w.font !== s.font || 
            w.size !== s.size || 
            w.bold !== s.bold ||
            (w.x !== undefined && w.x !== 0) ||
            (w.y !== undefined && w.y !== 0)
          );
          
          if (hasPerWordStyling) {
            // Generate per-word text with inline styling tags
            text = s.words.map((w, idx) => {
              let tags = '';
              
              // Add color if different from segment default
              if (w.color && w.color !== s.color) {
                tags += `\\c${hexToASS(w.color)}`;
              }
              
              // Add font if different from segment default
              if (w.font && w.font !== s.font) {
                tags += `\\fn${w.font}`;
              }
              
              // Add size if different from segment default
              if (w.size && w.size !== s.size) {
                tags += `\\fs${w.size}`;
              }
              
              // Add bold if different from segment default
              if (w.bold !== undefined && w.bold !== s.bold) {
                tags += w.bold ? '\\b1' : '\\b0';
              }
              
              // Add position if word has custom offset
              if ((w.x !== undefined && w.x !== 0) || (w.y !== undefined && w.y !== 0)) {
                const wordX = (s.x || 640) + (w.x || 0); // Add segment x + word offset
                const wordY = (s.y || 360) + (w.y || 0);
                tags += `\\pos(${Math.round(wordX)},${Math.round(wordY)})`;
              }
              
              const wordText = escapeASS(w.text || '');
              return tags ? `{${tags}}${wordText}` : wordText;
            }).join(' ');
          }
        }
        
        return {
          start: s.start,
          end: s.end,
          text: text,
          x: s.x,
          y: s.y,
          color: s.color,
          font: s.font,
          size: s.size,
          bold: s.bold
        };
      });
    } else {
      // For all other types: segments are already split on client side
      // Just map them to events as-is
      events = segments.map(s => {
        let text = s.text;
        
        // If segment has per-word styling, generate ASS text with inline tags
        if (s.words && s.words.length > 0) {
          const hasPerWordStyling = s.words.some(w => 
            w.color !== s.color || 
            w.font !== s.font || 
            w.size !== s.size || 
            w.bold !== s.bold ||
            (w.x !== undefined && w.x !== 0) ||
            (w.y !== undefined && w.y !== 0)
          );
          
          if (hasPerWordStyling) {
            // Generate per-word text with inline styling tags
            text = s.words.map((w, idx) => {
              let tags = '';
              
              // Add color if different from segment default
              if (w.color && w.color !== s.color) {
                tags += `\\c${hexToASS(w.color)}`;
              }
              
              // Add font if different from segment default
              if (w.font && w.font !== s.font) {
                tags += `\\fn${w.font}`;
              }
              
              // Add size if different from segment default
              if (w.size && w.size !== s.size) {
                tags += `\\fs${w.size}`;
              }
              
              // Add bold if different from segment default
              if (w.bold !== undefined && w.bold !== s.bold) {
                tags += w.bold ? '\\b1' : '\\b0';
              }
              
              // Add position if word has custom offset
              if ((w.x !== undefined && w.x !== 0) || (w.y !== undefined && w.y !== 0)) {
                const wordX = (s.x || 640) + (w.x || 0); // Add segment x + word offset
                const wordY = (s.y || 360) + (w.y || 0);
                tags += `\\pos(${Math.round(wordX)},${Math.round(wordY)})`;
              }
              
              const wordText = escapeASS(w.text || '');
              return tags ? `{${tags}}${wordText}` : wordText;
            }).join(' ');
          }
        }
        
        return {
          start: s.start,
          end: s.end,
          text: text,
          x: s.x,
          y: s.y,
          color: s.color,
          font: s.font,
          size: s.size,
          bold: s.bold
        };
      });
    
    const ass = makeASS({ styles, events });
    
    // Log ASS file content (first 500 chars)
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
