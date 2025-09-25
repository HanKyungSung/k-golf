/** LoginPage.tsx - standalone TSX component using custom JSX runtime */
/** @jsx h */
/** @jsxFrag Fragment */
import { h, Fragment } from '../lib/jsx-runtime';

export interface LoginPageProps {
  onSubmit(email: string, password: string): void;
  message?: string;
}

export function LoginPage(props: LoginPageProps) {
  let msgDiv: HTMLDivElement | null = null;
  const emailInput = h('input', {
    id: 'loginEmail',
    type: 'email',
    className: 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500',
    placeholder: 'admin@example.com',
    autocomplete: 'username'
  });
  const passInput = h('input', {
    id: 'loginPassword',
    type: 'password',
    className: 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500',
    placeholder: '••••••••',
    autocomplete: 'current-password'
  });
  const btn = h('button', {
    id: 'btnLogin',
    type: 'button',
    className: 'w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors text-white font-medium rounded-md py-2.5 text-sm',
    onclick: () => {
      msgDiv && (msgDiv.textContent = 'Signing in...');
      props.onSubmit((emailInput as HTMLInputElement).value.trim(), (passInput as HTMLInputElement).value);
    }
  }, 'Sign In');
  msgDiv = h('div', { id: 'loginMsg', className: 'h-5 text-xs font-medium' }) as HTMLDivElement;

  const root = (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-8 shadow">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">K-Golf</h1>
          <p className="text-sm text-slate-500 mt-1">Point of Sale System</p>
        </div>
        <form className="space-y-5" onsubmit="return false;">
          <div>
            <label className="block text-sm font-medium mb-1" for="loginEmail">Email</label>
            {emailInput}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" for="loginPassword">Password</label>
            {passInput}
          </div>
          {btn}
          {msgDiv}
        </form>
        <div className="mt-10 text-center text-[10px] text-slate-400">K-Golf POS • Secure Access</div>
      </div>
    </div>
  );

  if (props.message) msgDiv.textContent = props.message;
  return root as unknown as HTMLElement;
}
