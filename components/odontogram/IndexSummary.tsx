'use client';

import { ToothIndex } from './odontogram-data';

interface IndexCardProps {
  title: string;
  subtitle: string;
  color: string;
  index: ToothIndex;
  components: { key: keyof ToothIndex; label: string; desc: string }[];
}

function IndexCard({ title, subtitle, color, index, components }: IndexCardProps) {
  return (
    <div className="odontogram-index-card" style={{ '--index-color': color } as React.CSSProperties}>
      <div className="odontogram-index-heading">
        <div>
          <div className="odontogram-index-title">{title}</div>
          <div className="odontogram-index-subtitle">{subtitle}</div>
        </div>
        <div className="odontogram-index-total">
          <span>Total</span> {index.total}
        </div>
      </div>
      <div className="odontogram-index-divider" />
      <div className="odontogram-index-stats">
        {components.map((c) => (
          <div className="odontogram-index-stat" key={c.key}>
            <div className="odontogram-index-stat-value">{index[c.key]}</div>
            <div className="odontogram-index-stat-label">{c.label}</div>
            <div className="odontogram-index-stat-desc">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface IndexSummaryProps {
  dmft: ToothIndex;
  deft: ToothIndex;
}

export default function IndexSummary({ dmft, deft }: IndexSummaryProps) {
  return (
    <div className="odontogram-index-grid">
      <IndexCard
        title="DMFT"
        subtitle="Gigi Permanen"
        color="#4F7EF8"
        index={dmft}
        components={[
          { key: 'decayed', label: 'D', desc: 'Decayed' },
          { key: 'missing', label: 'M', desc: 'Missing' },
          { key: 'filled', label: 'F', desc: 'Filled' },
        ]}
      />
      <IndexCard
        title="deft"
        subtitle="Gigi Susu"
        color="#2DCB8A"
        index={deft}
        components={[
          { key: 'decayed', label: 'd', desc: 'Decayed' },
          { key: 'missing', label: 'e', desc: 'Extracted' },
          { key: 'filled', label: 'f', desc: 'Filled' },
        ]}
      />
    </div>
  );
}
