import React from 'react';

interface LeaderboardWidgetProps {
  userData: {
    name: string;
    count: number;
    ambito: string;
  }[];
}

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({
  userData,
}) => {
  return (
    <div className="chart-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      
      {/* Widget Header */}
      <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '6px', marginBottom: '8px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Desempeño de Ventanilla</h3>
        <p style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Top 10 operadores por cantidad de validaciones completadas.</p>
      </div>

      {/* Leaderboard List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {userData.slice(0, 10).map((user, idx) => {
          const initials = user.name
            .replace('USUARIO_', '')
            .substring(0, 2)
            .toUpperCase();

          // Position Badge Style
          const getBadgeStyle = (index: number) => {
            if (index === 0) return { bg: '#ffd700', text: '#000000', label: '1°' };
            if (index === 1) return { bg: '#c0c0c0', text: '#000000', label: '2°' };
            if (index === 2) return { bg: '#cd7f32', text: '#ffffff', label: '3°' };
            return { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-secondary)', label: `${index + 1}°` };
          };

          const badge = getBadgeStyle(idx);

          return (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '4px 0', 
                borderBottom: idx < 9 ? '1px solid rgba(255, 255, 255, 0.02)' : 'none' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Ranking Position Badge */}
                <div style={{ width: '20px', height: '20px', borderRadius: '4px', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: badge.bg, color: badge.text, fontWeight: 'bold', flexShrink: 0 }}>
                  {badge.label}
                </div>
                {/* Avatar Initials */}
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-input)', color: 'var(--primary)', border: '1px solid var(--border-color)', fontWeight: 'bold', flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                  <div 
                    style={{ 
                      fontSize: '9.5px', 
                      color: 'var(--text-muted)', 
                      maxWidth: '170px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap' 
                    }} 
                    title={user.ambito}
                  >
                    {user.ambito}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)' }}>{user.count.toLocaleString()}</div>
                <div style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.2px' }}>Docs</div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
