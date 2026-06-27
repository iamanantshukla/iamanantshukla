// src/components/SessionBrief.jsx — the "what am I about to do" page shown when you tap Start on a
// checklist session (owner request). It states the session TYPE (a coloured badge), the OBJECTIVE,
// the DETAIL (prescription / exercise list), and the expected training VOLUME — then a Begin button.
import { kindMeta } from '../lib/sessionKinds.js';
import Pebble from './Pebble.jsx';
import { IconChevronLeft, IconPlay } from './Icons.jsx';

export default function SessionBrief({ item, onBegin, onClose }) {
  if (!item) return null;
  const meta = kindMeta(item.kind);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal brief" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <button className="leaf-back" onClick={onClose} aria-label="Back"><IconChevronLeft size={18} /> Back</button>

        <div className="brief-head">
          <Pebble size={40} variant="face" expression="focused" />
          <div>
            <span className={`brief-badge badge-${meta.tone}`}>{meta.label}</span>
            <h2 className="brief-title">{item.label}</h2>
          </div>
        </div>

        {item.objective && item.objective.trim() !== item.label.trim() ? (
          <div className="brief-row">
            <span className="brief-row-label">Objective</span>
            <span className="brief-row-val">{item.objective}</span>
          </div>
        ) : null}

        {item.volume ? (
          <div className="brief-row">
            <span className="brief-row-label">Volume</span>
            <span className="brief-row-val">{item.volume}</span>
          </div>
        ) : null}

        {item.skills && item.skills.length ? (
          <div className="brief-row">
            <span className="brief-row-label">Skills</span>
            <span className="brief-row-val">{item.skills.join(' · ')}</span>
          </div>
        ) : null}

        {item.detail ? (
          <div className="brief-detail">
            <span className="brief-row-label">What you'll do</span>
            <p className="brief-detail-text">{item.detail}</p>
          </div>
        ) : null}

        <div className="brief-actions">
          <button className="secondary" onClick={onClose}>Not now</button>
          <button onClick={() => onBegin(item)}><IconPlay size={15} /> Begin</button>
        </div>
      </div>
    </div>
  );
}
