import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useSession } from '../context/SessionContext.jsx';

// Stable grouping key: prefer the catalogue id, else the skill name. Lets pre-seeded suggested rows
// (skillId null, not yet in the catalogue) group + render without colliding on a shared null id.
const rowKey = (row) => (row.skillId != null ? `id:${row.skillId}` : `name:${row.name}`);

export default function SkillFocusTable() {
  const { skillFocus, setSkillFocus } = useSession();
  const [catalogue, setCatalogue] = useState([]);
  const [adding, setAdding] = useState(false);
  const [popover, setPopover] = useState(null); // {name, expectation}

  // Resolve any suggested rows (skillId:null) against the catalogue once it loads — NON-RESTRICTIVE:
  // a name that matches the catalogue gets its id (so the expectation popover works); a name with no
  // match stays as a suggestion the user can keep or add. We never drop a suggested skill.
  useEffect(() => {
    api.listSkills().then((cat) => {
      setCatalogue(cat || []);
      setSkillFocus((prev) => prev.map((r) => {
        if (r.skillId != null) return r;
        const match = (cat || []).find((c) => c.name.toLowerCase() === String(r.name).toLowerCase());
        return match ? { ...r, skillId: match.id } : r;
      }));
    }).catch(() => { });
  }, [setSkillFocus]);

  // Add a suggested-but-uncatalogued skill to the catalogue, then adopt its id on the matching rows.
  async function adoptSuggested(name) {
    try {
      const created = await api.addSkill(name, '');
      setCatalogue((c) => [...c, created]);
      setSkillFocus((prev) => prev.map((r) =>
        (r.skillId == null && r.name === name) ? { ...r, skillId: created.id, suggested: false } : r));
    } catch { /* non-fatal: the row still works as a suggestion */ }
  }

  function addSkill(skill) {
    setSkillFocus((prev) => [...prev, { skillId: skill.id, name: skill.name, cells: Array(10).fill('') }]);
    setAdding(false);
  }
  function setCell(rowIdx, shotIdx, value) {
    setSkillFocus((prev) => {
      const next = prev.map((r, i) =>
        i === rowIdx ? { ...r, cells: r.cells.map((c, j) => (j === shotIdx ? value : c)) } : r
      );

      const tablesList = [];
      let currentTableList = [];
      let currentSeenList = new Set();
      next.forEach((row) => {
        if (currentSeenList.has(rowKey(row))) {
          tablesList.push(currentTableList);
          currentTableList = [];
          currentSeenList.clear();
        }
        currentTableList.push(row);
        currentSeenList.add(rowKey(row));
      });
      if (currentTableList.length > 0) {
        tablesList.push(currentTableList);
      }

      const lastTable = tablesList[tablesList.length - 1];
      if (lastTable && lastTable.length > 0) {
        const isLastTableFull = lastTable.every(r => r.cells.every(c => c !== ''));
        if (isLastTableFull) {
          const newRows = lastTable.map(r => ({
            skillId: r.skillId,
            name: r.name,
            cells: Array(10).fill('')
          }));
          return [...next, ...newRows];
        }
      }
      return next;
    });
  }
  function removeRow(rowIdx) {
    setSkillFocus((prev) => prev.filter((_, i) => i !== rowIdx));
  }

  const tables = [];
  let currentTable = [];
  let currentSeen = new Set();
  let tableStartIdx = 0;

  skillFocus.forEach((row, idx) => {
    if (currentSeen.has(rowKey(row))) {
      tables.push({ rows: currentTable, startIdx: tableStartIdx });
      currentTable = [];
      currentSeen.clear();
      tableStartIdx = idx;
    }
    currentTable.push(row);
    currentSeen.add(rowKey(row));
  });
  if (currentTable.length > 0) {
    tables.push({ rows: currentTable, startIdx: tableStartIdx });
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <button onClick={() => setAdding((v) => !v)}>+ Add Skill</button>
        {adding && (
          <>
            <input
              list="skills-datalist"
              placeholder="Type or select a skill..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  const val = e.target.value.trim();
                  const match = catalogue.find(c => c.name.toLowerCase() === val.toLowerCase());
                  if (match) {
                    addSkill(match);
                  } else {
                    setSkillFocus(prev => [...prev, { skillId: null, name: val, cells: Array(10).fill('') }]);
                    setAdding(false);
                  }
                }
              }}
            />
            <datalist id="skills-datalist">
              {catalogue.map((s) => <option key={s.id} value={s.name} />)}
            </datalist>
          </>
        )}
      </div>

      {skillFocus.length === 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Skill</th>
                {Array.from({ length: 10 }, (_, i) => <th key={i}>Shot {i + 1}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={12} className="muted" style={{ padding: 16 }}>
                No skills added. Use “Add Skill”.</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {tables.map((tableObj, tableIdx) => (
        <div className="table-scroll" key={tableIdx} style={{ marginBottom: 24 }}>
          {tables.length > 1 && <h4 style={{ marginBottom: 8, marginTop: 4 }}>Set {tableIdx + 1}</h4>}
          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Skill</th>
                {Array.from({ length: 10 }, (_, i) => <th key={i}>Shot {i + 1}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tableObj.rows.map((row, localRi) => {
                const ri = tableObj.startIdx + localRi;
                return (
                  <tr key={`${row.skillId}-${ri}`}>
                    <td className="skill-name">
                      <button onClick={() => {
                        const s = catalogue.find((c) => c.id === row.skillId);
                        setPopover({
                          name: row.name,
                          expectation: s?.expectation
                            || (row.skillId == null ? 'Suggested for this session. Not in your catalogue yet — add it to track an expectation.' : 'No expectation on file.'),
                          canAdd: row.skillId == null,
                        });
                      }}>{row.name}{row.skillId == null ? ' ·' : ''}</button>
                    </td>
                    {row.cells.map((c, ci) => (
                      <td key={ci} style={{ padding: '4px' }}>
                        <div
                          onClick={() => {
                            let next = '';
                            if (c === '') next = 'green';
                            else if (c === 'green') next = 'red';
                            else if (c === 'red') next = 'yellow';
                            else if (c === 'yellow') next = '';
                            setCell(ri, ci, next);
                          }}
                          style={{
                            width: '100%',
                            height: '38px',
                            cursor: 'pointer',
                            borderRadius: '6px',
                            border: c === '' ? '1px solid var(--line)' : 'none',
                            background: c === 'green' ? 'var(--good)' : c === 'red' ? 'var(--bad)' : c === 'yellow' ? 'var(--warn)' : 'var(--panel-2)'
                          }}
                        />
                      </td>
                    ))}
                    <td><button className="secondary" onClick={() => removeRow(ri)} aria-label="Remove row">Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {popover && (
        <div className="modal-backdrop" onClick={() => setPopover(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{popover.name}</h3>
            <p className="muted">Perfect execution:</p>
            <p>{popover.expectation}</p>
            <div className="row">
              {popover.canAdd && (
                <button onClick={() => { adoptSuggested(popover.name); setPopover(null); }}>Add to my skills</button>
              )}
              <button className={popover.canAdd ? 'secondary' : ''} onClick={() => setPopover(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
