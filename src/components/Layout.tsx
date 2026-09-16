import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';

export function Layout() {
  const { userId, profile, loading, signOut } = useAuth();
  const loc = useLocation();
  const link = (to: string, label: string) => (
    <Link
      to={to}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
        loc.pathname === to ? 'bg-amber-400 text-gray-900' : 'text-gray-200 hover:bg-white/10'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-900 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 mr-4">
            <span className="bg-amber-400 text-gray-900 font-black text-lg px-2 py-0.5 rounded">CARG</span>
            <span className="text-white font-bold tracking-wide">AR</span>
          </Link>
          <nav className="flex items-center gap-1 flex-1">
            {link('/', 'Fletes')}
            {link('/nuevo', 'Publicar')}
            {link('/mis-fletes', 'Mis fletes')}
            {link('/transportista', 'Soy transportista')}
            {profile?.is_admin && link('/admin', 'Panel de control')}
          </nav>
          {loading ? null : userId ? (
            <div className="flex items-center gap-2">
              <Link to="/perfil" className="text-gray-200 text-sm hover:text-white">
                {profile?.username ? `@${profile.username}` : profile?.full_name?.split(' ')[0] || 'Mi perfil'}
              </Link>
              <button onClick={signOut} className="text-xs text-gray-400 hover:text-white px-2 py-1">
                Salir
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-semibold text-sm px-4 py-1.5 rounded-lg"
            >
              Ingresar
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-gray-400 py-6">
        CARG-AR · Pago en garantía · Comisión según categoría · Reputación triangular
      </footer>
    </div>
  );
}
