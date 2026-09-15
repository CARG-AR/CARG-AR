import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './style.css';
import { AuthProvider } from './lib/useAuth';
import { Layout } from './components/Layout';
import Feed from './pages/Feed';
import NewShipment from './pages/NewShipment';
import ShipmentDetail from './pages/ShipmentDetail';
import MyShipments from './pages/MyShipments';
import CarrierOnboarding from './pages/CarrierOnboarding';
import ProfilePage from './pages/ProfilePage';
import Admin from './pages/Admin';

import LoginPage from './pages/LoginPage';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Feed /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/nuevo', element: <NewShipment /> },
      { path: '/flete/:id', element: <ShipmentDetail /> },
      { path: '/mis-fletes', element: <MyShipments /> },
      { path: '/transportista', element: <CarrierOnboarding /> },
      { path: '/perfil', element: <ProfilePage /> },
      { path: '/admin', element: <Admin /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
