import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/useAuth';
import { Alert, Field, inputCls } from '../components/ui';

export default function LoginPage() {
  const { userId } = useAuth();
  const nav = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [waitingEmail, setWaitingEmail] = useState('');
  const [error, setError] = useState('');

  if (userId) { nav('/perfil'); return null; }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); setLoading(false); return; }
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) { nav('/perfil'); return; }
        // Sin sesión: la cuenta queda en espera hasta validar por correo
        setWaitingEmail(email);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav('/perfil');
      }
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  async function signInWithGoogle() {
    setError(''); setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  if (waitingEmail) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white rounded-xl border p-6 w-full max-w-md text-center space-y-3">
          <div className="text-4xl">📩</div>
          <h1 className="text-lg font-bold">Falta un paso: validá tu correo</h1>
          <p className="text-sm text-gray-600">
            Te enviamos un enlace de validación a <b>{waitingEmail}</b>.
            Tu cuenta queda en espera hasta que lo confirmes.
          </p>
          <p className="text-sm text-gray-600">
            Revisá tu bandeja de entrada (y el correo no deseado). Al confirmar, podés ingresar normalmente.
          </p>
          <button
            onClick={() => { setWaitingEmail(''); setIsSignUp(false); }}
            className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold px-5 py-2.5 rounded-xl w-full"
          >
            Ya validé, ir a ingresar
          </button>
          <Link to="/" className="block text-xs text-gray-400 hover:text-gray-600">Volver al feed de fletes</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="bg-white rounded-xl border p-6 w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-1 text-xl font-black">
            <span className="bg-amber-400 text-gray-900 px-2 py-0.5 rounded">CARG</span><span>AR</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">{isSignUp ? 'Creá tu cuenta' : 'Ingresá a tu cuenta'}</p>
        </div>

        {error && <Alert kind="error">{error}</Alert>}

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 hover:bg-gray-50 font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.5l6.3 5.3C36.9 40.4 44 35 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
          Continuar con Google
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex-1 border-t" />o con correo<div className="flex-1 border-t" />
        </div>

        <Field label="Email">
          <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>

        <Field label="Contraseña">
          <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>

        <button disabled={loading} className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-900 font-bold py-2.5 rounded-xl">
          {loading ? 'Procesando…' : isSignUp ? 'Crear cuenta' : 'Ingresar'}
        </button>

        {isSignUp && (
          <p className="text-xs text-gray-500 text-center">
            Te vamos a enviar un correo de validación. Tu cuenta se activa al confirmarlo.
          </p>
        )}

        <p className="text-center text-sm text-gray-600">
          {isSignUp ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}{' '}
          <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); }} className="font-semibold text-amber-700 hover:underline">
            {isSignUp ? 'Ingresá' : 'Registrate'}
          </button>
        </p>

        <Link to="/" className="block text-center text-xs text-gray-400 hover:text-gray-600">Volver al feed de fletes</Link>
      </form>
    </div>
  );
}
