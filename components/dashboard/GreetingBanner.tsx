import './greeting-banner.css';

export default function GreetingBanner() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="greeting-banner">
      <div>
        <div className="greeting-title">Selamat sore, Zanak Dental 👋</div>
        <div className="greeting-date">{formattedDate}</div>
      </div>
      <div className="owner-badge">OWNER</div>
    </div>
  );
}
