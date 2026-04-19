import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import './word-typing-styles.css';

/**
 * WordByWordTyping - React Component for Word-by-Word Typing Effect
 * 
 * @component
 * @example
 * const [segment, setSegment] = useState(subtitleData);
 * const [currentTime, setCurrentTime] = useState(0);
 * 
 * return (
 *   <WordByWordTyping
 *     segment={segment}
 *     videoCurrentTime={currentTime}
 *     onWordClick={(wordIndex) => console.log('Word clicked:', wordIndex)}
 *     segmentDefaultStyle={{ color: '#fff', font: 'Arial', size: 36 }}
 *   />
 * );
 */
const WordByWordTyping = ({
  segment,
  videoCurrentTime,
  segmentDefaultStyle = {},
  onWordClick = null,
  onWordStyleUpdate = null,
  enableInteraction = false,
  customClassName = 'word-typing-container',
  showActiveAnimation = true,
}) => {
  const [visibleWords, setVisibleWords] = useState([]);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  /**
   * Calculate which words should be visible at current time
   */
  const calculateVisibleWords = useCallback(() => {
    if (!segment?.words || segment.words.length === 0) {
      setVisibleWords([]);
      setActiveWordIndex(-1);
      return;
    }

    // Filter words that should be visible
    const visible = segment.words.filter(
      word => videoCurrentTime >= word.start && videoCurrentTime <= word.end
    );
    setVisibleWords(visible);

    // Find active word (most recent)
    let activeIdx = -1;
    for (let i = segment.words.length - 1; i >= 0; i--) {
      if (videoCurrentTime >= segment.words[i].start) {
        activeIdx = i;
        break;
      }
    }
    setActiveWordIndex(activeIdx);
  }, [segment, videoCurrentTime]);

  /**
   * Update when time or segment changes
   */
  useEffect(() => {
    calculateVisibleWords();
  }, [videoCurrentTime, segment, calculateVisibleWords]);

  /**
   * Get merged style for a word (custom + default)
   */
  const getWordStyle = useCallback((word) => {
    const wordStyle = word.customStyle || {};
    const defaults = segmentDefaultStyle;

    const color = wordStyle.color || defaults.color || '#ffffff';
    const font = wordStyle.font || defaults.font || 'Arial';
    const size = wordStyle.size || defaults.size || 36;
    const fontWeight = wordStyle.fontWeight || defaults.fontWeight || 'normal';
    const textDecoration = wordStyle.textDecoration || defaults.textDecoration || 'none';
    const x = wordStyle.x ?? 0;
    const y = wordStyle.y ?? 0;
    const opacity = wordStyle.opacity ?? 1;

    return {
      color,
      fontFamily: font,
      fontSize: `${size}px`,
      fontWeight,
      textDecoration,
      opacity,
      ...(x !== 0 || y !== 0) && {
        position: 'relative',
        left: `${x}px`,
        top: `${y}px`,
      },
    };
  }, [segmentDefaultStyle]);

  /**
   * Handle word click for interaction
   */
  const handleWordClick = useCallback((wordIndex) => {
    if (onWordClick && enableInteraction) {
      onWordClick(wordIndex);
    }
  }, [onWordClick, enableInteraction]);

  /**
   * Update word style function (can be called from parent)
   */
  const updateWordStyle = useCallback((wordIndex, newStyle) => {
    if (segment?.words?.[wordIndex]) {
      const updatedSegment = {
        ...segment,
        words: segment.words.map((w, idx) =>
          idx === wordIndex
            ? {
                ...w,
                customStyle: { ...w.customStyle, ...newStyle },
              }
            : w
        ),
      };
      if (onWordStyleUpdate) {
        onWordStyleUpdate(updatedSegment, wordIndex);
      }
    }
  }, [segment, onWordStyleUpdate]);

  // Expose updateWordStyle as a method (via ref or props)
  React.useImperativeHandle(
    React.useRef(),
    () => ({
      updateWordStyle,
    })
  );

  if (visibleWords.length === 0) {
    return <div className={customClassName} />;
  }

  return (
    <div
      className={customClassName}
      style={{
        background: segment?.segmentDefaultStyle?.bgColor 
          ? `rgba(${hexToRgb(segment.segmentDefaultStyle.bgColor).join(',')}, ${(segment.segmentDefaultStyle.bgOpacity || 60) / 100})`
          : 'transparent',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
      }}
    >
      {visibleWords.map((word, index) => {
        const wordIndex = segment.words.indexOf(word);
        const isActive = wordIndex === activeWordIndex;
        const wordStyle = getWordStyle(word);

        return (
          <span
            key={`${word.text}-${index}-${word.start}`}
            className={`word-span ${isActive && showActiveAnimation ? 'active' : ''}`}
            data-word-index={wordIndex}
            data-active={isActive}
            onClick={() => handleWordClick(wordIndex)}
            style={{
              ...wordStyle,
              display: 'inline-block',
              whiteSpace: 'nowrap',
              margin: '0 4px',
              padding: '2px 6px',
              transition: 'all 0.3s ease',
              cursor: enableInteraction ? 'pointer' : 'default',
              ...(isActive && showActiveAnimation) && {
                background: 'rgba(100, 150, 255, 0.2)',
                borderRadius: '2px',
                boxShadow: '0 0 8px rgba(100, 150, 255, 0.3)',
              },
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};

/**
 * PropTypes validation
 */
WordByWordTyping.propTypes = {
  /**
   * Subtitle segment object containing words array
   */
  segment: PropTypes.shape({
    text: PropTypes.string,
    start: PropTypes.number,
    end: PropTypes.number,
    words: PropTypes.arrayOf(
      PropTypes.shape({
        text: PropTypes.string.isRequired,
        start: PropTypes.number.isRequired,
        end: PropTypes.number.isRequired,
        customStyle: PropTypes.object,
      })
    ),
    segmentDefaultStyle: PropTypes.object,
  }),

  /**
   * Current video time in seconds
   */
  videoCurrentTime: PropTypes.number.isRequired,

  /**
   * Default styles for the segment (fallback for words)
   */
  segmentDefaultStyle: PropTypes.shape({
    color: PropTypes.string,
    font: PropTypes.string,
    size: PropTypes.number,
    fontWeight: PropTypes.string,
    bgColor: PropTypes.string,
    bgOpacity: PropTypes.number,
  }),

  /**
   * Callback when a word is clicked
   */
  onWordClick: PropTypes.func,

  /**
   * Callback when word style is updated
   */
  onWordStyleUpdate: PropTypes.func,

  /**
   * Enable click interactions on words
   */
  enableInteraction: PropTypes.bool,

  /**
   * Custom CSS class for container
   */
  customClassName: PropTypes.string,

  /**
   * Show animation for active word
   */
  showActiveAnimation: PropTypes.bool,
};

/**
 * Utility function to convert hex color to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

export default WordByWordTyping;

/**
 * Hook for managing word-by-word effects
 * 
 * @example
 * const { segment, updateWordStyle, getVisibleWords } = useWordByWordEffect(initialSegment);
 */
export function useWordByWordEffect(initialSegment) {
  const [segment, setSegment] = useState(initialSegment);
  const [visibleWords, setVisibleWords] = useState([]);

  /**
   * Update a specific word's style
   */
  const updateWordStyle = useCallback((wordIndex, newStyle) => {
    setSegment(prevSegment => ({
      ...prevSegment,
      words: prevSegment.words.map((w, idx) =>
        idx === wordIndex
          ? {
              ...w,
              customStyle: { ...w.customStyle, ...newStyle },
            }
          : w
      ),
    }));
  }, []);

  /**
   * Get visible words at current time
   */
  const getVisibleWords = useCallback((videoCurrentTime) => {
    if (!segment?.words) return [];

    return segment.words.filter(
      word => videoCurrentTime >= word.start && videoCurrentTime <= word.end
    );
  }, [segment]);

  /**
   * Update multiple words at once
   */
  const updateMultipleWords = useCallback((wordIndices, newStyle) => {
    setSegment(prevSegment => ({
      ...prevSegment,
      words: prevSegment.words.map((w, idx) =>
        wordIndices.includes(idx)
          ? {
              ...w,
              customStyle: { ...w.customStyle, ...newStyle },
            }
          : w
      ),
    }));
  }, []);

  /**
   * Reset segment to initial state
   */
  const resetSegment = useCallback(() => {
    setSegment(initialSegment);
  }, [initialSegment]);

  return {
    segment,
    setSegment,
    updateWordStyle,
    updateMultipleWords,
    getVisibleWords,
    resetSegment,
  };
}
