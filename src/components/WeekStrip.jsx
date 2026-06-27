import { useState } from 'react';
import { weekDays, localDateString, mondayOf } from '../lib/gymDates.js';
import { IconChevronLeft, IconChevronRight } from './Icons.jsx';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function WeekStrip({ anchor = new Date(), selected, onSelect, dots = {} }) {
  const [weekAnchor, setWeekAnchor] = useState(mondayOf(anchor));
  const days = weekDays(weekAnchor);
  const today = localDateString(new Date());
  const shiftWeek = (n) => { const d = new Date(weekAnchor); d.setDate(d.getDate() + n * 7); setWeekAnchor(mondayOf(d)); };
  const range = `${days[0].getDate()}–${days[6].getDate()} ${MONTHS[days[6].getMonth()]}`;
  return (
    <div className="week-strip">
      <div className="week-strip-head">
        <span className="week-range">{range}</span>
        <span className="week-arrows">
          <button className="icon-btn" aria-label="Previous week" onClick={() => shiftWeek(-1)}><IconChevronLeft size={16} /></button>
          <button className="icon-btn" aria-label="Next week" onClick={() => shiftWeek(1)}><IconChevronRight size={16} /></button>
        </span>
      </div>
      <div className="week-row">
        {days.map((d, i) => {
          const ds = localDateString(d);
          const cls = ['week-day'];
          if (ds === today) cls.push('today');
          if (ds === selected) cls.push('selected');
          return (
            <button key={ds} className={cls.join(' ')} onClick={() => onSelect(ds)}>
              <span className="wd-name">{DOW[i]}</span>
              <span className="wd-num">{d.getDate()}</span>
              <span className={`wd-dot ${dots[ds] || 'none'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
