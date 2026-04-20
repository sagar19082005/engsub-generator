const fs = require('fs');
let b = fs.readFileSync('public/app.js', 'utf8');

const regex = /const vw = video\.clientWidth \|\| 640;[\s\S]*?fd\.append\('segments', JSON\.stringify\(exportSegments\)\);/;

const replacement = \const cWidth = video.clientWidth || 640;
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

    let exportSegments = segments.map(s => {
      let sAssX = null, sAssY = null;
      if (s.x != null) {
        const percentX = (s.x - offsetX) / renderedWidth;
        sAssX = Math.round(percentX * 1280);
      }
      if (s.y != null) {
        const percentY = (s.y - offsetY) / renderedHeight;
        sAssY = Math.round(percentY * 720);
      }

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
        size: s.size,
        bold: s.bold,
        words: (s.words || []).map(w => {
          let wAssX = null, wAssY = null;
          if (w.x != null) {
            const absPxX = (50 + w.x) * cWidth / 100;
            const pctX = (absPxX - offsetX) / renderedWidth;
            wAssX = Math.round(pctX * 1280);
          }
          if (w.y != null) {
            const absPxY = (50 + w.y) * cHeight / 100;
            const pctY = (absPxY - offsetY) / renderedHeight;
            wAssY = Math.round(pctY * 720);
          }
          return {
            ...w,
            assX: wAssX,
            assY: wAssY
          };
        })
      };
    });

    fd.append('segments', JSON.stringify(exportSegments));\;

b = b.replace(regex, replacement);
fs.writeFileSync('public/app.js', b);
console.log('Replaced by Node Regex');
