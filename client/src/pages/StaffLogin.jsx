import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, TextField } from '../components/ui.jsx';
import { CupIcon, ArrowRightIcon } from '../components/Icons.jsx';

export default function StaffLogin() {
  const { isStaff, login, busy, error, clearError } = useAuth();
  const [username, setUsername] = useState('staff');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isStaff) return <Navigate to="/staff" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!username.trim()) nextErrors.username = 'Enter your username.';
    if (!password) nextErrors.password = 'Enter your password.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const ok = await login(username.trim(), password);
    if (ok) navigate('/staff', { replace: true });
  }

  return (
    <div className="login">
      <aside className="login__aside">
        <div className="login__brand">
          <span className="brand__mark brand__mark--light" aria-hidden="true">
            <CupIcon size={22} />
          </span>
          <span className="brand__name brand__name--light">Ground &amp; Grain</span>
        </div>

        <blockquote className="login__quote">
          &ldquo;Two flat whites, one croissant, and a queue out the door.&rdquo;
        </blockquote>
        <p className="login__attribution">Every Saturday, 09:14</p>

        <div className="login__aside-footer">
          <span className="dot dot--ready" /> Counter service open
        </div>
      </aside>

      <main className="login__main">
        <form className="login__card" onSubmit={handleSubmit} noValidate>
          <p className="eyebrow eyebrow--muted">Staff access</p>
          <h1 className="login__title">Sign in</h1>
          <p className="login__lede">
            Manage the menu, track orders and update statuses. This area is for staff only.
          </p>

          <TextField
            id="username"
            label="Username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setFieldErrors((current) => ({ ...current, username: undefined }));
            }}
            error={fieldErrors.username}
            autoComplete="username"
          />

          <TextField
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
            error={fieldErrors.password}
            autoComplete="current-password"
          />

          {error && (
            <div className="banner banner--error" role="alert">
              <p>{error}</p>
            </div>
          )}

          <Button type="submit" size="lg" loading={busy} className="login__submit">
            Sign in <ArrowRightIcon size={18} />
          </Button>

          <p className="login__hint">
            <strong>Demo credentials:</strong> staff / coffee123
            <span>Change these with STAFF_PASSWORD_HASH before deploying.</span>
          </p>
        </form>
      </main>
    </div>
  );
}
