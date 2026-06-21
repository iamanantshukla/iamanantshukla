export default function CoachView() {
  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '24px', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
        <h2 style={{ margin: 0, color: 'var(--accent)' }}>AI Coach Interactive Chat</h2>
        <p style={{ color: 'var(--muted)', margin: '8px 0 0' }}>Your personal AI padel... I mean, pistol coach.</p>
      </div>
      
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: 'var(--panel-2)', padding: '16px', borderRadius: '12px', alignSelf: 'flex-start', maxWidth: '80%' }}>
          <p style={{ margin: 0 }}>Hello! I've analyzed your last session. Would you like me to break down your posture issues or generate a drill plan?</p>
        </div>
      </div>
      
      <div style={{ padding: '24px', borderTop: '1px solid var(--line)' }}>
        <input 
          type="text" 
          placeholder="Ask your AI coach..." 
          style={{ width: '100%', padding: '16px', borderRadius: '999px', background: 'var(--panel-2)', border: '1px solid var(--line)' }} 
        />
      </div>
    </div>
  );
}
