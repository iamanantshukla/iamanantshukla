import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useSession } from '../context/SessionContext.jsx';

export default function SkillFocusTable() {
  const { skillFocus, setSkillFocus } = useSession();
  const [catalogue, setCatalogue] = useState([]);
  const [adding, setAdding] = useState(false);
  const [popover, setPopover] = useState(null); // {name, expectation}

  useEffect(() => { api.listSkills().then(setCatalogue).catch(() => { }); }, []);

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
        if (currentSeenList.has(row.skillId)) {
          tablesList.push(currentTableList);
          currentTableList = [];
          currentSeenList.clear();
        }
        currentTableList.push(row);
        currentSeenList.add(row.skillId);
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
    if (currentSeen.has(row.skillId)) {
      tables.push({ rows: currentTable, startIdx: tableStartIdx });
      currentTable = [];
      currentSeen.clear();
      tableStartIdx = idx;
    }
    currentTable.push(row);
    currentSeen.add(row.skillId);
  });
  if (currentTable.length > 0) {
    tables.push({ rows: currentTable, startIdx: tableStartIdx });
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <button onClick={() => setAdding((v) => !v)}>+ Add Skill</button>
        {adding && (
          <select defaultValue="" onChange={(e) => {
            const s = catalogue.find((c) => String(c.id) === e.target.value);
            if (s) addSkill(s);
          }}>
            <option value="" disabled>Select a skill…</option>
            {catalogue.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
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
                        setPopover({ name: row.name, expectation: s?.expectation || 'No expectation on file.' });
                      }}>{row.name}</button>
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
            <button onClick={() => setPopover(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
