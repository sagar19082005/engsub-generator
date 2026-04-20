const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

function escapeASS(text) {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\N').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

function hexToASS(hexColor) {
  // Convert #RRGGBB to ASS format &HBBGGRR&
  if (!hexColor) return '&HFFFFFF&';
  const hex = hexColor.replace('#', '').toUpperCase();
  if (hex.length !== 6) return '&HFFFFFF&';
  const r = hex.substring(0, 2);
  const g = hex.substring(2, 4);
  const b = hex.substring(4, 6);
  return `&H${b}${g}${r}&`;
}

function hexToRGB(hexColor) {
  if (!hexColor) return { r: 255, g: 255, b: 255 };
  const hex = hexColor.replace('#', '').toUpperCase();
  if (hex.length !== 6) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

function makeASS(scriptInfo) {
  const { styles = {}, events = [], vWidth = 1280, vHeight = 720 } = scriptInfo;
  const header = `[Script Info]\nTitle: generated\nScriptType: v4.00+\nPlayResX: ${vWidth}\nPlayResY: ${vHeight}\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`;

  const styleLine = (name, s) => {
    const font = s.font || 'Arial';
    const size = s.size || 36;
    const primaryColor = hexToASS(s.color || '#ffffff');
    const secondaryColor = hexToASS(s.color || '#ffffff');
    const bold = s.bold ? -1 : 0;
    
    // By default, assume no outline and no background
    let borderStyle = 1; // 1 = outline, 3 = opaque box
    let outlineSize = 0;
    
    // Convert background to ASS color
    const bgRGB = hexToRGB(s.bgColor || '#000000');
    const bgOpacity = (s.bgOpacity !== undefined ? s.bgOpacity : 60) / 100;
    const boxAlpha = Math.round((1 - bgOpacity) * 255); 
    const boxColor = `&H${boxAlpha.toString(16).padStart(2, '0')}${bgRGB.b.toString(16).padStart(2, '0').toUpperCase()}${bgRGB.g.toString(16).padStart(2, '0').toUpperCase()}${bgRGB.r.toString(16).padStart(2, '0').toUpperCase()}&`;

    let outlineColor = `&H00FFFFFF`;
    let backColor = `&HFF000000`; // Transparent drop shadow

    if (bgOpacity > 0) {
      borderStyle = 3; // Opaque box mode
      outlineColor = boxColor; // In BorderStyle 3, OutlineColour IS the box color
      outlineSize = 2; // Box padding size
    } else {
      // Outline mode
      borderStyle = 1;
      const borderOpc = (s.borderOpacity !== undefined ? s.borderOpacity : 0) / 100;
      if (borderOpc > 0) {
         outlineSize = 3;
         outlineColor = hexToASS(s.borderColor || '#ffffff');
      }
    }

    const alignment = s.alignment || 5; // 5 is Middle-Center
    return `Style: ${name},${font},${size},${primaryColor},${secondaryColor},${outlineColor},${backColor},${bold},0,0,0,100,100,0,0,${borderStyle},${outlineSize},0,${alignment},10,10,10,1`;
  };

  const bodyStyles = [];
  bodyStyles.push(styleLine('Default', styles.default || {}));

  const eventsHeader = `\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const eventsLines = events.map(ev => {
    const start = asTimestamp(ev.start);
    const end = asTimestamp(ev.end);
    const text = ev.text || '';
    
    const tags = [];
    
    if (ev.color && ev.color !== '&HFFFFFF&') {
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
    
    // Apply background color override if different from style
    if (ev.bgColor && ev.bgColor !== '&H00000000') {
      tags.push(`\\3c${ev.bgColor}`); // Override back color for outline color. wait! in BorderStyle=3, \3c changes the background BOX color!
    }
    
    // Apply position with center alignment
    if (ev.x != null && ev.y != null) {
      tags.push(`\\an5\\pos(${Math.round(ev.x)},${Math.round(ev.y)})`);
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

async function burnASS(inputPath, segments, styles, outPath, subtitleType, vWidth = 1280, vHeight = 720) {
  return new Promise((resolve, reject) => {
    const tmpAss = inputPath + '.ass';
    
    // Generate ASS events based on per-segment subtitle types
    let events = [];
    
    segments.forEach(segment => {
      const segType = segment.subtitleType || 'full';

      if (segType === 'word-type' && segment.words && segment.words.length > 0) {
        const duration = segment.end - segment.start;
        const timePerWord = duration / segment.words.length;

        segment.words.forEach((word, idx) => {
          const wordStart = segment.start + (idx * timePerWord);
          const wordEnd = segment.end;

          events.push({
            start: wordStart,
            end: wordEnd,
            text: escapeASS(word.text),
            x: word.assX != null ? word.assX : (segment.assX != null ? segment.assX : 640),
            y: word.assY != null ? word.assY : (segment.assY != null ? segment.assY : 360),
            color: hexToASS(word.color || segment.color || '#ffffff'),
            bgColor: hexToASS(word.bgColor || segment.bgColor || '#000000'),
            font: word.font || segment.font || 'Arial',
            size: word.size || segment.size || 36,
            bold: word.bold !== undefined ? word.bold : segment.bold
          });
        });
      } else if (segType === 'word-studio') {
        const words = segment.text.split(' ');
        const duration = segment.end - segment.start;
        const timePerWord = duration / words.length;

        for (let i = 0; i < words.length; i++) {
          const slotStart = segment.start + (i * timePerWord);
          const slotEnd = segment.start + ((i + 1) * timePerWord);

          const baseColor = segment.color || '#ffffff';
          const highlightColor = segment.studioHighlightColor || '#2196F3';
          
          let displayText = '';
          for (let j = 0; j < words.length; j++) {
            if (j > 0) displayText += ' ';
            let wordText = words[j];
            if (j === i) {
               const hc = '#'+(highlightColor.replace('#', '').match(/.{2}/g).reverse().join(''));
               const bc = '#'+(baseColor.replace('#', '').match(/.{2}/g).reverse().join(''));
               displayText += '{\\c&H' + hc.substring(1) + '&}' + escapeASS(wordText) + '{\\c&H' + bc.substring(1) + '&}';
            } else {
               displayText += escapeASS(wordText);
            }
          }

          events.push({
            start: slotStart,
            end: slotEnd,
            text: displayText,
            x: segment.assX != null ? segment.assX : 640,
            y: segment.assY != null ? segment.assY : 360,
            color: hexToASS(baseColor),
            bgColor: hexToASS(segment.bgColor || '#000000'),
            font: segment.font || 'Arial',
            size: segment.size || 36,
            bold: segment.bold
          });
        }
      } else if (segType === 'typing-word') {
        const words = segment.text.split(' ');
        const duration = segment.end - segment.start;
        const timePerWord = duration / words.length;

        for (let i = 0; i < words.length; i++) {
          const slotStart = segment.start + (i * timePerWord);
          const slotEnd = segment.start + ((i + 1) * timePerWord);

          let displayText = '';
          for (let j = 0; j <= i; j++) {
            if (j > 0) displayText += ' ';
            displayText += words[j];
          }

          events.push({
            start: slotStart,
            end: slotEnd,
            text: escapeASS(displayText),
            x: segment.assX != null ? segment.assX : 640,
            y: segment.assY != null ? segment.assY : 360,
            color: hexToASS(segment.color || '#ffffff'),
            bgColor: hexToASS(segment.bgColor || '#000000'),
            font: segment.font || 'Arial',
            size: segment.size || 36,
            bold: segment.bold
          });
        }
      } else {
        events.push({
          start: segment.start,
          end: segment.end,
          text: escapeASS(segment.text),
          x: segment.assX != null ? segment.assX : 640,
          y: segment.assY != null ? segment.assY : 360,
          color: hexToASS(segment.color || '#ffffff'),
          bgColor: hexToASS(segment.bgColor || '#000000'),
          font: segment.font || 'Arial',
          size: segment.size || 36,
          bold: segment.bold
        });
      }
    });

    const ass = makeASS({ styles, events, vWidth, vHeight });
    
    console.log('=== ASS FILE PREVIEW ===');
    console.log(ass.substring(0, 500));
    console.log(`... (${events.length} events total)`);
    
    fs.writeFileSync(tmpAss, ass, 'utf8');

    // Use relative path for ASS filter to prevent ffmpeg colon splitting issues on Windows
    const relativeTmpAss = path.relative(process.cwd(), tmpAss).replace(/\\/g, '/');

    ffmpeg(inputPath)
      .videoFilters({ filter: 'ass', options: relativeTmpAss })
      .outputOptions(['-c:v', 'libx264', '-crf', '23', '-preset', 'veryfast'])
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
