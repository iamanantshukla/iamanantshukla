import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Pebble from './Pebble.jsx';
import QuickStartSheet from './QuickStartSheet.jsx';
import { IconHome, IconDumbbell, IconTarget, IconNotebook } from './Icons.jsx';

export default function NavBar({ onLogout }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const link = (to, Icon, label) => (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <Icon size={23} /><span>{label}</span>
    </NavLink>
  );
  return (
    <>
      <div className="top-bar">
        <span className="brand-logo">PEBBLE</span>
        <button className="secondary logout-btn" onClick={onLogout}>Logout</button>
      </div>

      <nav className="bottom-nav">
        {link('/home', IconHome, 'Home')}
        {link('/gym', IconDumbbell, 'Gym')}
        <div className="nav-fab-container">
          <button className="nav-fab pebble-fab" aria-label="Quick start" onClick={() => setSheetOpen(true)}>
            <Pebble size={40} variant="face" expression="happy" />
          </button>
        </div>
        {link('/shoot', IconTarget, 'Shoot')}
        {link('/journal', IconNotebook, 'Journal')}
      </nav>

      <QuickStartSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
