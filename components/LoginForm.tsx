'use client';

import { useActionState, useRef } from 'react';
import { loginAction, type LoginState } from '@/app/login/actions';

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, { step: 'email' });
  const intentRef = useRef<HTMLInputElement>(null);
  const setIntent = (v: string) => { if (intentRef.current) intentRef.current.value = v; };

  return (
    <form action={formAction} className="login__form" noValidate>
      <input ref={intentRef} type="hidden" name="intent" defaultValue={state.step === 'email' ? 'send' : 'verify'} key={state.step} />

      {state.error && <div className="message-strip message-strip--error" role="alert">{state.error}</div>}
      {state.info && !state.error && <div className="message-strip message-strip--success" role="status">{state.info}</div>}

      {state.step === 'email' ? (
        <>
          <label htmlFor="email" className="login__label">Email</label>
          <input id="email" name="email" type="email" className="input" autoComplete="email"
            inputMode="email" defaultValue={state.email ?? ''} required autoFocus />
          <button type="submit" className="btn btn--emphasized login__submit" disabled={pending}
            onClick={() => setIntent('send')}>
            {pending ? 'Sending…' : 'Send code'}
          </button>
        </>
      ) : (
        <>
          <input type="hidden" name="email" value={state.email ?? ''} />
          <label htmlFor="code" className="login__label">Sign-in code</label>
          <input id="code" name="code" className="input login__code" autoComplete="one-time-code"
            inputMode="numeric" pattern="[0-9]*" maxLength={10} required autoFocus />
          <button type="submit" className="btn btn--emphasized login__submit" disabled={pending}
            onClick={() => setIntent('verify')}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
          <div className="login__links">
            <button type="submit" className="btn btn--transparent" disabled={pending}
              onClick={() => setIntent('resend')} formNoValidate>Send a new code</button>
            <button type="submit" className="btn btn--transparent" disabled={pending}
              onClick={() => setIntent('change-email')} formNoValidate>Use another email</button>
          </div>
        </>
      )}
    </form>
  );
}
