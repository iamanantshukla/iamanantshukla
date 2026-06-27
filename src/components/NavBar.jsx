import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Pebble from './Pebble.jsx';
import QuickStartSheet from './QuickStartSheet.jsx';
import SyncChip from './SyncChip.jsx';
import { useJarvis } from '../context/JarvisContext.jsx';
import { IconHome, IconDumbbell, IconTarget, IconNotebook } from './Icons.jsx';

// Bottom-nav: four hubs (Home, Gym, Shoot, Journal) + the center floating Pebble FAB. Tapping the
// FAB opens the start chooser (QuickStartSheet) so the athlete picks the session up front —
// practice/match · dry/live · shot-calling/skill-focus — or jumps to today's workout / journal.
export default function NavBar({ onLogout }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const jarvis = useJarvis();

  const link = (to, Icon, label) => (
    <NavLink to={to} end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <Icon size={23} /><span>{label}</span>
    </NavLink>
  );

  return (
    <>
      <div className="top-bar">
        <span className="brand-logo">PEBBLE</span>
        <SyncChip onLogout={onLogout} />
      </div>

      <nav className="bottom-nav">
        {link('/', IconHome, 'Home')}
        {link('/gym', IconDumbbell, 'Gym')}
        <div className="nav-fab-container">
          <button
            className="nav-fab pebble-fab"
            aria-label="Start a session"
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
          >
            <Pebble size={40} variant="face" expression={jarvis.expression} />
          </button>
        </div>
        {link('/shoot', IconTarget, 'Shoot')}
        {link('/journal', IconNotebook, 'Journal')}
      </nav>

      <QuickStartSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}
