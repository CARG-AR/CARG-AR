import { useAuth } from '../lib/useAuth';

export default function LandingPage() {
  const { signIn } = useAuth();

  return (
    <div className="-mx-4 -my-6">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-900 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_#f59e0b_0%,_transparent_35%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,_#3b82f6_0%,_transparent_30%)]" />
        </div>

        {/* Animated road + trucks */}
        <div className="absolute bottom-0 left-0 right-0 h-32 opacity-30 pointer-events-none">
          <div className="absolute bottom-8 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
          <TruckLane delay="0s" direction="normal" />
          <TruckLane delay="4s" direction="reverse" top="3.5rem" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Conectando cargas con transportistas de confianza
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
            Llevá tu carga <br />
            <span className="text-amber-400">de punta a punta</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Publicá fletes, recibí ofertas verificadas, pagá con garantía y calificá a todos los actores. Desde un sobre hasta maquinaria agrícola.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={signIn}
              className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-bold text-lg px-8 py-3.5 rounded-xl shadow-lg shadow-amber-400/20 transition transform hover:scale-105"
            >
              Ingresar a CARG-AR
            </button>
            <span className="text-sm text-gray-400">Registro gratuito con Google o email</span>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-amber-400 text-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <Stat value="3" label="categorías de carga" />
          <Stat value="48h" label="liberación automática" />
          <Stat value="100%" label="pago en garantía" />
          <Stat value="GPS" label="obligatorio en viaje" />
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4 text-gray-900">¿Qué podés transportar?</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Cada categoría tiene tarifa referencial, vehículo sugerido y comisión transparente.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <CategoryCard
              icon="📦"
              title="Paquetería"
              desc="Sobres, bultos chicos y encomiendas. Ideal para motos, autos y utilitarios."
              fee="5%"
              color="bg-amber-100 text-amber-700"
            />
            <CategoryCard
              icon="🛻"
              title="Pallets"
              desc="Electrodomésticos, mudanzas y cargas medianas sobre pallets."
              fee="7%"
              color="bg-blue-100 text-blue-700"
            />
            <CategoryCard
              icon="🏗️"
              title="Maquinaria y vehículos"
              desc="Maquinaria agrícola, vehículos y cargas pesadas de gran porte."
              fee="12%"
              color="bg-red-100 text-red-700"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">¿Cómo funciona?</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <Step n="1" title="Publicás" desc="Cargás origen, destino, categoría y precio inicial. El receptor queda vinculado por alias." />
            <Step n="2" title="Recibís ofertas" desc="Transportistas verificados pujan en tiempo real. Ves reputación, vehículo y precio." />
            <Step n="3" title="Pagás con garantía" desc="El dinero queda retenido. Solo se libera cuando la entrega se acredita." />
            <Step n="4" title="Calificás" desc="Despacho, transportista y receptor se califican entre sí. Todos suman reputación." />
          </div>
        </div>
      </section>

      {/* Trust / illustration */}
      <section className="py-16 md:py-24 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-4">Seguridad en cada viaje</h2>
            <ul className="space-y-4 text-gray-300">
              <li className="flex items-start gap-3"><span className="text-amber-400 text-xl">✓</span> Transportistas verificados con documentación del vehículo.</li>
              <li className="flex items-start gap-3"><span className="text-amber-400 text-xl">✓</span> GPS obligatorio durante el tránsito.</li>
              <li className="flex items-start gap-3"><span className="text-amber-400 text-xl">✓</span> Foto de carga en origen y foto de entrega + DNI del receptor.</li>
              <li className="flex items-start gap-3"><span className="text-amber-400 text-xl">✓</span> Disputas con fondos congelados y mediación.</li>
            </ul>
          </div>
          <div className="flex-1 w-full max-w-md">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-gray-900 font-bold">A</div>
                <div>
                  <div className="font-semibold">Isla Verde → Córdoba Capital</div>
                  <div className="text-xs text-gray-400">Caja de repuestos · $15.000</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full w-3/4 bg-amber-400 rounded-full" /></div>
                <div className="flex justify-between text-xs text-gray-400"><span>Publicado</span><span>En tránsito</span><span>Entregado</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4 text-gray-900">¿Listo para mover tu carga?</h2>
          <p className="text-gray-600 mb-8">Entrá con tu cuenta y empezá a publicar o a ofertar en menos de un minuto.</p>
          <button
            onClick={signIn}
            className="bg-gray-900 hover:bg-gray-800 text-white font-bold text-lg px-8 py-3.5 rounded-xl transition"
          >
            Ingresar ahora
          </button>
        </div>
      </section>
    </div>
  );
}

function TruckLane({ delay, direction, top = '0.5rem' }: { delay: string; direction: 'normal' | 'reverse'; top?: string }) {
  return (
    <div className="absolute left-0 right-0" style={{ top }}>
      <div
        className="w-24 h-8 flex items-center gap-1"
        style={{
          animation: `drive 18s linear infinite ${delay}`,
          animationDirection: direction,
        }}
      >
        <svg viewBox="0 0 80 32" className="w-full h-full fill-current text-amber-400/70">
          <rect x="10" y="8" width="50" height="18" rx="3" />
          <rect x="52" y="4" width="20" height="22" rx="2" />
          <circle cx="22" cy="28" r="4" className="text-gray-900" />
          <circle cx="62" cy="28" r="4" className="text-gray-900" />
          <rect x="58" y="8" width="8" height="8" rx="1" className="text-gray-900 opacity-30" />
        </svg>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-sm font-semibold opacity-80">{label}</div>
    </div>
  );
}

function CategoryCard({ icon, title, desc, fee, color }: { icon: string; title: string; desc: string; fee: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg hover:-translate-y-1 transition text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{desc}</p>
      <span className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${color}`}>Comisión {fee}</span>
    </div>
  );
}

function Step({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="relative text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-gray-900 text-amber-400 font-black text-xl flex items-center justify-center mb-4">
        {n}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  );
}
