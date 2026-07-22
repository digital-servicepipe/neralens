import { FormEvent, ReactNode, useState } from 'react';
import { LockKeyhole } from 'lucide-react';

const authSessionKey = 'neralens-pages-authenticated';
const passwordSalt = 'neralens-pages-lock-v1';
const passwordHash = '6b1f936dfb9acdc036f6efe0c14bea91e7185335fea3eb5be55a795d3a3856d3';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [isAuthenticated, setAuthenticated] = useState(() => sessionStorage.getItem(authSessionKey) === 'true');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return <>{children}</>;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const digest = await sha256(`${passwordSalt}:${password}`);
    if (digest !== passwordHash) {
      setError('Неверный пароль');
      setPassword('');
      return;
    }

    sessionStorage.setItem(authSessionKey, 'true');
    setAuthenticated(true);
  };

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <span className="auth-icon" aria-hidden="true">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <div>
          <h1>NeraLens</h1>
          <p>Вход в закрытый проект</p>
        </div>
        <label className="auth-field">
          <span>Пароль</span>
          <input
            autoComplete="current-password"
            autoFocus
            inputMode="text"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button className="primary-button auth-submit" type="submit">
          Войти
        </button>
      </form>
    </main>
  );
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
