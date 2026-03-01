import { useState, useRef, type FormEvent } from 'react';
import emailjs from '@emailjs/browser';

type FormStatus = 'idle' | 'sending' | 'success' | 'error';

const SERVICE_ID = import.meta.env.PUBLIC_EMAILJS_SERVICE_ID as string;
const TEMPLATE_ID = import.meta.env.PUBLIC_EMAILJS_TEMPLATE_ID as string;
const PUBLIC_KEY = import.meta.env.PUBLIC_EMAILJS_PUBLIC_KEY as string;


export default function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (form: HTMLFormElement): Record<string, string> => {
    const errs: Record<string, string> = {};
    const name = (form.elements.namedItem('user_name') as HTMLInputElement)?.value.trim();
    const email = (form.elements.namedItem('user_email') as HTMLInputElement)?.value.trim();
    const message = (form.elements.namedItem('message') as HTMLTextAreaElement)?.value.trim();

    if (!name) errs.user_name = 'Name is required.';
    if (!email) {
      errs.user_email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.user_email = 'Please enter a valid email.';
    }
    if (!message || message.length < 10) {
      errs.message = 'Message must be at least 10 characters.';
    }

    return errs;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formRef.current) return;

    const validationErrors = validate(formRef.current);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setStatus('sending');

    try {
      await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, formRef.current, {
        publicKey: PUBLIC_KEY,
      });
      setStatus('success');
      formRef.current.reset();
    } catch (err) {
      console.error('EmailJS error:', err);
      setStatus('error');
    } finally {
      setTimeout(() => setStatus('idle'), 6000);
    }
  };

  const inputClass =
    'form-input w-full' + ' ';

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* Name */}
      <div>
        <label htmlFor="user_name" className="form-label">
          // Name
        </label>
        <input
          id="user_name"
          name="user_name"
          type="text"
          placeholder="John Doe"
          className={inputClass}
          style={{
            border: errors.user_name
              ? '1px solid rgba(255, 80, 80, 0.6)'
              : undefined,
          }}
          disabled={status === 'sending'}
          autoComplete="name"
        />
        {errors.user_name && (
          <p
            style={{
              color: 'rgba(255,100,100,0.9)',
              fontSize: '0.75rem',
              marginTop: '0.4rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {errors.user_name}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="user_email" className="form-label">
          // Email
        </label>
        <input
          id="user_email"
          name="user_email"
          type="email"
          placeholder="john@example.com"
          className={inputClass}
          style={{
            border: errors.user_email
              ? '1px solid rgba(255, 80, 80, 0.6)'
              : undefined,
          }}
          disabled={status === 'sending'}
          autoComplete="email"
        />
        {errors.user_email && (
          <p
            style={{
              color: 'rgba(255,100,100,0.9)',
              fontSize: '0.75rem',
              marginTop: '0.4rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {errors.user_email}
          </p>
        )}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="form-label">
          // Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          placeholder="Tell me about your project or just say hi..."
          className={inputClass}
          style={{
            border: errors.message
              ? '1px solid rgba(255, 80, 80, 0.6)'
              : undefined,
            resize: 'vertical',
            minHeight: '140px',
          }}
          disabled={status === 'sending'}
        />
        {errors.message && (
          <p
            style={{
              color: 'rgba(255,100,100,0.9)',
              fontSize: '0.75rem',
              marginTop: '0.4rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {errors.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={status === 'sending' || status === 'success'}
        className="btn-primary"
        style={{
          justifyContent: 'center',
          width: '100%',
          opacity: status === 'sending' || status === 'success' ? 0.7 : 1,
          cursor: status === 'sending' || status === 'success' ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'sending' ? (
          <>
            <span
              style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                border: '2px solid rgba(22,163,74,0.3)',
                borderTopColor: '#16a34a',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
            Sending...
          </>
        ) : (
          <>
            <span style={{ color: 'inherit' }}>./send</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                opacity: 0.7,
              }}
            >
              --message
            </span>
          </>
        )}
      </button>

      {/* Status Messages */}
      {status === 'success' && (
        <div
          role="alert"
          style={{
            padding: '0.875rem 1rem',
            background: 'rgba(22, 163, 74, 0.08)',
            border: '1px solid rgba(22, 163, 74, 0.3)',
            borderRadius: '4px',
            color: '#15803d',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          ✓ Message sent! I'll get back to you soon.
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          style={{
            padding: '0.875rem 1rem',
            background: 'rgba(255, 80, 80, 0.08)',
            border: '1px solid rgba(255, 80, 80, 0.3)',
            borderRadius: '4px',
            color: 'rgba(255, 120, 120, 0.9)',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          ✗ Something went wrong. Try emailing me directly.
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}
