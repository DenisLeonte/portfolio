import { useState, useEffect, useCallback, useRef } from 'react';

interface TypingEffectProps {
  phrases: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseAfterTyping?: number;
  pauseAfterDeleting?: number;
}

export default function TypingEffect({
  phrases: initialPhrases,
  typingSpeed = 75,
  deletingSpeed = 35,
  pauseAfterTyping = 2200,
  pauseAfterDeleting = 400,
}: TypingEffectProps) {
  const [phrases, setPhrases] = useState(initialPhrases);
  const [displayText, setDisplayText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const phrasesRef = useRef(phrases);
  phrasesRef.current = phrases;

  // Listen for language changes and swap phrases
  useEffect(() => {
    const handler = () => {
      const i18n = (window as any).__i18n;
      if (i18n) {
        const newPhrases = i18n.tArray('hero.typingPhrases', i18n.getCurrentLang());
        if (newPhrases.length > 0) {
          setPhrases(newPhrases);
          // Reset typing state to start fresh with new phrases
          setPhraseIndex(0);
          setCharIndex(0);
          setDisplayText('');
          setIsDeleting(false);
          setIsPaused(false);
        }
      }
    };
    document.addEventListener('langchange', handler);
    return () => document.removeEventListener('langchange', handler);
  }, []);

  const tick = useCallback(() => {
    const currentPhrase = phrasesRef.current[phraseIndex] ?? '';

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
          setPhraseIndex((p) => (p + 1) % phrasesRef.current.length);
          setIsPaused(false);
        }, pauseAfterDeleting);
      }
    }
  }, [charIndex, isDeleting, isPaused, phraseIndex, pauseAfterTyping, pauseAfterDeleting]);

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
          color: '#16a34a',
          textShadow: 'none',
        }}
      >
        {displayText}
      </span>
      <span
        style={{
          display: 'inline-block',
          width: '2px',
          height: '1em',
          background: '#16a34a',
          boxShadow: '0 0 6px rgba(22,163,74,0.5)',
          animation: 'blink 1s step-end infinite',
          verticalAlign: 'text-bottom',
          marginLeft: '1px',
        }}
        aria-hidden="true"
      />
    </span>
  );
}
