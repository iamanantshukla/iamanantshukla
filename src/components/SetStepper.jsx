import { IconPlus, IconMinus } from './Icons.jsx';

export default function SetStepper({ label, unit, value, step = 1, onChange }) {
  const dec = () => onChange(Math.max(0, Math.round((value - step) * 100) / 100));
  const inc = () => onChange(Math.round((value + step) * 100) / 100);
  return (
    <div className="stepper-row">
      <span className="stepper-label">{label}</span>
      <div className="stepper-seg">
        <button aria-label={`decrease ${label}`} onClick={dec}><IconMinus size={18} /></button>
        <span className="stepper-val">{value}{unit ? <small> {unit}</small> : null}</span>
        <button aria-label={`increase ${label}`} onClick={inc}><IconPlus size={18} /></button>
      </div>
    </div>
  );
}
