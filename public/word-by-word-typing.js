/**
 * Word-by-Word Typing Effect Module
 * Handles progressive word reveal with individual styling support
 * Compatible with Vanilla JavaScript and existing subtitle system
 */

class WordByWordTypingEffect {
  /**
   * Initialize the typing effect
   * @param {Object} config - Configuration object
   * @param {HTMLElement} config.container - Container element for subtitles
   * @param {HTMLVideoElement} config.videoElement - Video element for time sync
   * @param {Function} config.onRender - Callback when rendering updates
   */
  constructor(config = {}) {
    this.container = config.container;
    this.videoElement = config.videoElement;
    this.onRender = config.onRender || (() => {});
    this.currentSegment = null;
    this.currentTime = 0;
    this.animatedWords = new Map(); // Track which words have been animated
  }

  /**
   * Calculate which words should be visible at a given time
   * @param {Object} segment - Subtitle segment with words array
   * @param {number} videoCurrentTime - Current video time in seconds
   * @returns {Object} - { visibleWords, activeWordIndex }
   */
  getVisibleWords(segment, videoCurrentTime) {
    if (!segment || !segment.words || segment.words.length === 0) {
      return { visibleWords: [], activeWordIndex: -1, wordIndices: [] };
    }

    // Show only words that have already started appearing (progressive reveal)
    // Once a word starts, it stays visible until segment ends
    const visibleWords = [];
    const wordIndices = [];
    
    segment.words.forEach((word, idx) => {
      if (videoCurrentTime >= word.start && videoCurrentTime <= word.end) {
        visibleWords.push(word);
        wordIndices.push(idx);
      }
    });

    // Find the most recently revealed word (the "active" one)
    let activeWordIndex = -1;
    for (let i = segment.words.length - 1; i >= 0; i--) {
      if (videoCurrentTime >= segment.words[i].start) {
        activeWordIndex = i;
        break;
      }
    }

    return { visibleWords, activeWordIndex, wordIndices };
  }

  /**
   * Update word styling - individual style for specific word
   * @param {Object} segment - Subtitle segment
   * @param {number} wordIndex - Index of word to update
   * @param {Object} newStyle - Style object { color, font, size, fontWeight, etc }
   */
  updateWordStyle(segment, wordIndex, newStyle) {
    if (!segment.words || !segment.words[wordIndex]) {
      console.warn(`Word index ${wordIndex} not found in segment`);
      return;
    }

    const word = segment.words[wordIndex];
    
    // Merge new styles with existing ones, preserving timing
    if (newStyle.color) word.customStyle.color = newStyle.color;
    if (newStyle.font) word.customStyle.font = newStyle.font;
    if (newStyle.size) word.customStyle.size = newStyle.size;
    if (newStyle.fontWeight) word.customStyle.fontWeight = newStyle.fontWeight;
    if (newStyle.textDecoration) word.customStyle.textDecoration = newStyle.textDecoration;
    if (newStyle.hasOwnProperty('x')) word.customStyle.x = newStyle.x;
    if (newStyle.hasOwnProperty('y')) word.customStyle.y = newStyle.y;
    if (newStyle.hasOwnProperty('opacity')) word.customStyle.opacity = newStyle.opacity;

    console.log(`Updated word "${word.text}" at index ${wordIndex}:`, newStyle);
  }

  /**
   * Render the typing effect with HTML
   * @param {Object} segment - Subtitle segment
   * @param {Object} segmentDefaultStyle - Default styles for the segment
   * @param {number} videoCurrentTime - Current video time
   * @returns {string} - HTML string for the typing effect
   */
  renderHTML(segment, segmentDefaultStyle = {}, videoCurrentTime) {
    const { visibleWords, activeWordIndex, wordIndices } = this.getVisibleWords(segment, videoCurrentTime);

    if (visibleWords.length === 0) {
      // Clear animation tracking when segment ends
      return '';
    }

    // Create unique key for this segment to track animations
    const segmentKey = `${segment.start}-${segment.end}`;
    if (!this.animatedWords.has(segmentKey)) {
      this.animatedWords.set(segmentKey, new Set());
    }
    const animatedSet = this.animatedWords.get(segmentKey);
    
    // Clean up old segments to prevent memory leak
    if (this.animatedWords.size > 50) {
      const firstKey = this.animatedWords.keys().next().value;
      this.animatedWords.delete(firstKey);
    }

    return visibleWords.map((word, index) => {
      const wordIndexInSegment = wordIndices[index];
      const wordKey = `${wordIndexInSegment}`;
      
      // Check if this word has already been animated
      const hasAnimated = animatedSet.has(wordKey);
      
      // Mark this word as animated on first appearance
      if (!hasAnimated) {
        animatedSet.add(wordKey);
      }
      
      const wordStyle = word.customStyle || {};
      const color = wordStyle.color || segmentDefaultStyle.color || '#ffffff';
      const font = wordStyle.font || segmentDefaultStyle.font || 'Arial';
      const size = wordStyle.size || segmentDefaultStyle.size || 36;
      const fontWeight = wordStyle.fontWeight || segmentDefaultStyle.fontWeight || 'normal';
      const textDecoration = wordStyle.textDecoration || segmentDefaultStyle.textDecoration || 'none';
      const x = wordStyle.x !== undefined ? wordStyle.x : 0;
      const y = wordStyle.y !== undefined ? wordStyle.y : 0;

      // Build inline style - smooth appearance, no re-animation
      let inlineStyle = `color: ${color}; font-family: ${font}; font-size: ${size}px; font-weight: ${fontWeight}; text-decoration: ${textDecoration}; display: inline-block; white-space: nowrap; margin: 2px 4px; line-height: 1.4;`;

      // Highlight the most recently revealed word with visible styling
      if (wordIndexInSegment === activeWordIndex) {
        inlineStyle += ` background: rgba(100, 150, 255, 0.35); border-radius: 4px; padding: 2px 6px; font-weight: bold;`;
      }

      // Add positioning if word has custom offset
      if (x !== 0 || y !== 0) {
        inlineStyle += ` position: relative; left: ${x}px; top: ${y}px;`;
      }

      // Apply animation class ONLY on first appearance, not on subsequent frames
      const classNames = hasAnimated ? 'word-span word-visible' : 'word-span word-appearing';
      return `<span class="${classNames}" data-word-index="${wordIndexInSegment}" data-active="${wordIndexInSegment === activeWordIndex}" style="${inlineStyle}">${word.text}</span>`;
    }).join(' ');
  }

  /**
   * Render to DOM container
   * @param {Object} segment - Subtitle segment
   * @param {Object} segmentDefaultStyle - Default segment styles
   * @param {number} videoCurrentTime - Current video time
   */
  render(segment, segmentDefaultStyle = {}, videoCurrentTime) {
    if (!this.container) return;

    const html = this.renderHTML(segment, segmentDefaultStyle, videoCurrentTime);
    this.container.innerHTML = html;
    this.onRender(segment, videoCurrentTime);
  }

  /**
   * Render all words at once (for Full Sentence mode) - NO progressive reveal
   * @param {Object} segment - Subtitle segment
   * @param {Object} segmentDefaultStyle - Default segment styles
   * @returns {string} - HTML string with all words visible
   */
  renderAllWordsHTML(segment, segmentDefaultStyle = {}) {
    if (!segment || !segment.words || segment.words.length === 0) {
      return '';
    }

    // Show ALL words immediately - no progressive filtering
    return segment.words.map((word, index) => {
      const wordStyle = word.customStyle || {};
      const color = wordStyle.color || segmentDefaultStyle.color || '#ffffff';
      const font = wordStyle.font || segmentDefaultStyle.font || 'Arial';
      const size = wordStyle.size || segmentDefaultStyle.size || 36;
      const fontWeight = wordStyle.fontWeight || segmentDefaultStyle.fontWeight || 'normal';
      const textDecoration = wordStyle.textDecoration || segmentDefaultStyle.textDecoration || 'none';
      const x = wordStyle.x !== undefined ? wordStyle.x : 0;
      const y = wordStyle.y !== undefined ? wordStyle.y : 0;

      // Build inline style - all words visible, no animation
      let inlineStyle = `color: ${color}; font-family: ${font}; font-size: ${size}px; font-weight: ${fontWeight}; text-decoration: ${textDecoration}; display: inline-block; white-space: nowrap; margin: 2px 4px; line-height: 1.4;`;

      // Add positioning if word has custom offset
      if (x !== 0 || y !== 0) {
        inlineStyle += ` position: relative; left: ${x}px; top: ${y}px;`;
      }

      return `<span class="word-span" data-word-index="${index}" style="${inlineStyle}">${word.text}</span>`;
    }).join(' ');
  }

  /**
   * Render for Word Studio mode - individual word containers
   * @param {Object} segment - Subtitle segment
   * @param {Object} segmentDefaultStyle - Default segment styles
   * @param {number} videoCurrentTime - Current video time
   * @returns {string} - HTML with individual word containers
   */
  renderWordStudioHTML(segment, segmentDefaultStyle = {}, videoCurrentTime) {
    const { visibleWords, activeWordIndex, wordIndices } = this.getVisibleWords(segment, videoCurrentTime);

    // For Word Studio: Show ONLY the currently active word (one at a time)
    if (activeWordIndex === -1 || !segment.words[activeWordIndex]) {
      return '';
    }

    const activeWord = segment.words[activeWordIndex];
    const wordStyle = activeWord.customStyle || {};
    
    // Get styling with defaults
    const color = wordStyle.color || segmentDefaultStyle.color || '#ffffff';
    const font = wordStyle.font || segmentDefaultStyle.font || 'Arial';
    const size = wordStyle.size || segmentDefaultStyle.size || 48;
    const fontWeight = wordStyle.fontWeight || segmentDefaultStyle.fontWeight || 'normal';
    const bgColor = wordStyle.bgColor || segmentDefaultStyle.bgColor || 'transparent';
    const textDecoration = wordStyle.textDecoration || segmentDefaultStyle.textDecoration || 'none';
    
    // Get position - default to center (0, 0 = center)
    const x = wordStyle.x !== undefined ? wordStyle.x : 0;
    const y = wordStyle.y !== undefined ? wordStyle.y : 0;
    
    // Calculate progress within this word's duration for fade effect
    const wordDuration = activeWord.end - activeWord.start;
    const timeSinceStart = videoCurrentTime - activeWord.start;
    const progress = Math.min(1, Math.max(0, timeSinceStart / wordDuration));
    
    // Determine opacity based on progress (fade in at start, fade out at end)
    let opacity = 1;
    const fadeInDuration = 0.1; // 100ms fade in
    const fadeOutDuration = 0.15; // 150ms fade out
    const fadeOutStart = 1 - (fadeOutDuration / wordDuration);
    
    if (progress < fadeInDuration / wordDuration) {
      // Fade in phase
      opacity = progress / (fadeInDuration / wordDuration);
    } else if (progress > fadeOutStart) {
      // Fade out phase
      opacity = (1 - progress) / (fadeOutDuration / wordDuration);
    }
    
    // Build container style with drag cursor
    let containerStyle = `position: absolute; left: ${50 + x}%; top: ${50 + y}%; transform: translate(-50%, -50%); `;
    containerStyle += `color: ${color}; font-family: ${font}; font-size: ${size}px; font-weight: ${fontWeight}; `;
    containerStyle += `text-decoration: ${textDecoration}; background-color: ${bgColor}; `;
    containerStyle += `opacity: ${opacity}; padding: 8px 16px; border-radius: 6px; `;
    containerStyle += `cursor: grab; user-select: none; white-space: nowrap; `;
    containerStyle += `transition: opacity 0.05s ease-out;`;
    
    return `<div class="word-studio-container word-studio-active" data-word-index="${activeWordIndex}" style="${containerStyle}">
      <span class="word-studio-word">${activeWord.text}</span>
    </div>`;
  }

  /**
   * Render words in numbered stacked format with drag-and-drop positioning
   * For Numbered Words mode - shows only positioned words
   * User drags words from timeline panel and places them on video
   */
  renderNumberedWordsHTML(segment, segmentDefaultStyle = {}, videoCurrentTime) {
    const { visibleWords, activeWordIndex, wordIndices } = this.getVisibleWords(segment, videoCurrentTime);

    if (visibleWords.length === 0 || activeWordIndex === -1) {
      return '';
    }

    // Create unique key for this segment to track animations
    const segmentKey = `${segment.start}-${segment.end}`;
    if (!this.animatedWords.has(segmentKey)) {
      this.animatedWords.set(segmentKey, new Set());
    }
    const animatedSet = this.animatedWords.get(segmentKey);

    // Build container for positioned words
    let html = '<div class="numbered-words-container">';
    let hasPositionedWords = false;

    visibleWords.forEach((word, idx) => {
      const wordIndexInSegment = wordIndices[idx];
      const wordKey = `${wordIndexInSegment}`;
      
      const wordStyle = word.customStyle || {};
      
      // Check if word has been explicitly positioned (has positioned flag)
      const hasCustomPos = wordStyle.positioned === true;
      
      // Only render words that have been positioned via drag-and-drop
      if (!hasCustomPos) {
        return; // Skip unpositioned words
      }
      
      hasPositionedWords = true;
      
      // Check if this word has already been animated
      const hasAnimated = animatedSet.has(wordKey);
      
      // Mark this word as animated on first appearance
      if (!hasAnimated) {
        animatedSet.add(wordKey);
      }
      
      const color = wordStyle.color || segmentDefaultStyle.color || '#ffffff';
      const font = wordStyle.font || segmentDefaultStyle.font || 'Arial';
      const size = wordStyle.size || segmentDefaultStyle.size || 36;
      const fontWeight = wordStyle.fontWeight || segmentDefaultStyle.fontWeight || 'normal';
      
      // Apply animation class ONLY on first appearance
      const classNames = hasAnimated ? 'numbered-word-item word-visible' : 'numbered-word-item word-appearing';
      
      // Build inline style with position
      const xVal = wordStyle.x || 0;
      const yVal = wordStyle.y || 0;
      let itemStyle = `color: ${color}; font-family: ${font}; font-size: ${size}px; font-weight: ${fontWeight};`;
      itemStyle += `position: absolute; left: ${xVal}px; top: ${yVal}px;`;
      
      html += `<div class="${classNames}" data-word-index="${wordIndexInSegment}" data-segment-key="${segmentKey}" style="${itemStyle}">
        <span class="word-text-display">${word.text}</span>
      </div>`;
    });

    // Only show container if there are positioned words
    if (hasPositionedWords) {
      html += '</div>';
      return html;
    }
    
    return ''; // Return empty if no positioned words
  }

  /**
   * Attach to video element for automatic updates
   * @param {Function} onUpdate - Callback for each update
   */
  attachToVideo(onUpdate) {
    if (!this.videoElement) return;

    this.videoElement.addEventListener('timeupdate', () => {
      this.currentTime = this.videoElement.currentTime;
      if (onUpdate) onUpdate(this.currentTime);
    });
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WordByWordTypingEffect;
}
