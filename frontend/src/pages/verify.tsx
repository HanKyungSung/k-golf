import { useEffect, useState } from 'react';

export default function VerifyPage() {
  const [state, setState] = useState<'idle'|'verifying'|'success'|'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get('email');
    const token = params.get('token');
    if (!email || !token) {
      setState('error');
      setMessage('Missing email or token in URL.');
      return;
    }
  (async () => {
      setState('verifying');
      try {
        // Use the same env var mechanism as the rest of the app (webpack DefinePlugin)
        const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:8080';
        const res = await fetch(`${apiBase}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, token })
        });
        if (!res.ok) {
          const data = await res.json().catch(()=>({error:'Verification failed'}));
          throw new Error(data.error || 'Verification failed');
        }
        setState('success');
        setMessage('Signed in. Redirecting...');
        setTimeout(() => { window.location.href = '/'; }, 1500);
      } catch (e:any) {
        setState('error');
        setMessage(e.message || 'Unexpected error');
      }
    })();
  }, []);

  return (
    <main style={{maxWidth:480,margin:'60px auto',fontFamily:'system-ui',padding:'0 16px'}}>
      <h1>Email Verification</h1>
      {state==='verifying' && <p>Verifying link...</p>}
      {state==='success' && <p style={{color:'green'}}>{message}</p>}
      {state==='error' && <p style={{color:'crimson'}}>{message}</p>}
      {state==='error' && <button onClick={()=>window.location.reload()}>Retry</button>}
    </main>
  );
}
