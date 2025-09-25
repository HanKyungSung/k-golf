import React, { useState, useEffect } from 'react';
import { useAuth } from '../app/authState';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const { login, state } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string|undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (state.authenticated) navigate('/', { replace: true });
  }, [state.authenticated, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(undefined);
    try { await login(email.trim(), password); } catch (e: any) { setError(e?.message || 'Login failed'); } finally { setBusy(false); }
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-8 shadow">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">K-Golf</h1>
          <p className="text-sm text-slate-500 mt-1">Point of Sale System</p>
        </div>
        <form className="space-y-5" onSubmit={submit}>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="loginEmail">Email</label>
            <input id="loginEmail" type="email" autoComplete="username" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="loginPassword">Password</label>
            <input id="loginPassword" type="password" autoComplete="current-password" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors text-white font-medium rounded-md py-2.5 text-sm">
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="h-5 text-xs font-medium text-red-600" aria-live="polite">{error}</div>
        </form>
        <div className="mt-10 text-center text-[10px] text-slate-400">K-Golf POS • Secure Access</div>
      </div>
    </div>
  );
};
export default LoginPage;
