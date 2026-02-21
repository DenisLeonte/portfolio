import { useState, useEffect, useCallback } from 'react';

interface TypingEffectProps {
  phrases: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseAfterTyping?: number;
  pauseAfterDeleting?: number;
}

export default function TypingEffect({
  phrases,
  typingSpeed = 75,
  deletingSpeed = 35,
  pauseAfterTyping = 2200,
  pauseAfterDeleting = 400,
}: TypingEffectProps) {
  const [displayText, setDisplayText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const tick = useCallback(() => {
    const currentPhrase = phrases[phraseIndex] ?? '';

    if (isPaused) return;

    if (!isDeleting) {
      // Typing forward
      if (charIndex < currentPhrase.length) {
        setDisplayText(currentPhrase.slice(0, charIndex + 1));
        setCharIndex((c) => c + 1);
      } else {
        // Finished typing → pause then start deleting
        setIsPaused(true);
        setTimeout(() => {
          setIsDeleting(true);
          setIsPaused(false);
        }, pauseAfterTyping);
      }
    } else {
      // Deleting backward
      if (charIndex > 0) {
        setDisplayText(currentPhrase.slice(0, charIndex - 1));
        setCharIndex((c) => c - 1);
      } else {
        // Finished deleting → pause then move to next phrase
        setIsPaused(true);
        setTimeout(() => {
          setIsDeleting(false);
          setPhraseIndex((p) => (p + 1) % phrases.length);
          setIsPaused(false);
        }, pauseAfterDeleting);
      }
    }
  }, [charIndex, isDeleting, isPaused, phraseIndex, phrases, pauseAfterTyping, pauseAfterDeleting]);

  useEffect(() => {
    const delay = isDeleting ? deletingSpeed : typingSpeed;
    const timer = setTimeout(tick, delay);
    return () => clearTimeout(timer);
  }, [tick, isDeleting, typingSpeed, deletingSpeed]);

  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={phrases[phraseIndex]}
      aria-live="polite"
    >
      <span
        style={{
          color: '#00ff41',
          textShadow:
            '0 0 10px rgba(0,255,65,0.5), 0 0 20px rgba(0,255,65,0.25)',
        }}
      >
        {displayText}
      </span>
      <span
        style={{
          display: 'inline-block',
          width: '2px',
          height: '1em',
          background: '#00ff41',
          boxShadow: '0 0 8px rgba(0,255,65,0.8)',
          animation: 'blink 1s step-end infinite',
          verticalAlign: 'text-bottom',
          marginLeft: '1px',
        }}
        aria-hidden="true"
      />
    </span>
  );
}
