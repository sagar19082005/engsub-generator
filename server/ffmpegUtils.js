const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

function escapeASS(text) {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\N').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
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

async function burnASS(inputPath, segments, styles, outPath) {
  return new Promise((resolve, reject) => {
    const tmpAss = inputPath + '.ass';
    const events = (segments || []).map(s => ({ start: s.start, end: s.end, text: s.text, x: s.x, y: s.y }));
    const ass = makeASS({ styles, events });
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
