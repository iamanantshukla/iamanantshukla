// src/components/LeafBack.jsx — a per-leaf back chevron (spec §3). Leaves are dead-ends in a
// chrome-less PWA, so each one gets an explicit way back to its hub. `to` is the hub path; `label`
// is the hub's name.
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft } from './Icons.jsx';

export default function LeafBack({ to, label }) {
  const navigate = useNavigate();
  return (
    <button className="leaf-back" onClick={() => navigate(to)} aria-label={`Back to ${label}`}>
      <IconChevronLeft size={18} /> {label}
    </button>
  );
}
