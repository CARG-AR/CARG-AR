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
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  if (userId) { nav('/perfil'); return null; }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setMsg(''); setLoading(true);
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); setLoading(false); return; }
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg('Cuenta creada. Revisá tu email o ingresá con tus datos.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav('/perfil');
      }
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
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
        {msg && <Alert kind="ok">{msg}</Alert>}

        <Field label="Email">
          <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>

        <Field label="Contraseña">
          <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>

        <button disabled={loading} className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-gray-900 font-bold py-2.5 rounded-xl">
          {loading ? 'Procesando…' : isSignUp ? 'Crear cuenta' : 'Ingresar'}
        </button>

        <p className="text-center text-sm text-gray-600">
          {isSignUp ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}{' '}
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="font-semibold text-amber-700 hover:underline">
            {isSignUp ? 'Ingresá' : 'Registrate'}
          </button>
        </p>

        <Link to="/" className="block text-center text-xs text-gray-400 hover:text-gray-600">Volver al feed de fletes</Link>
      </form>
    </div>
  );
}
