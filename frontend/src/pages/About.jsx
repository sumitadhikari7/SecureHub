import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function About() {
  const features = [
    {
      id: 1,
      icon: "🛡️",
      title: "Fraud Detection",
      desc: "Every listing and bid is screened by our real-time fraud detection engine, flagging suspicious activity before it ever reaches you."
    },
    {
      id: 2,
      icon: "⚡",
      title: "Real-Time Bidding",
      desc: "Bids update instantly across every device, so you always see the true current price and never miss a last-second offer."
    },
    {
      id: 3,
      icon: "🔗",
      title: "Unified Accounts",
      desc: "One verified account to buy and sell — no juggling separate logins, no re-verifying your identity every time you switch roles."
    }
  ];

  const trustPoints = [
    {
      id: 1,
      title: "Verified Identities",
      desc: "Every buyer and seller completes identity verification before their first transaction."
    },
    {
      id: 2,
      title: "Encrypted Transactions",
      desc: "Payments and personal data are encrypted end-to-end, on every device, every time."
    },
    {
      id: 3,
      title: "24/7 Monitoring",
      desc: "Our security team and automated systems watch every auction around the clock."
    },
    {
      id: 4,
      title: "Buyer & Seller Protection",
      desc: "Dispute resolution and refund support if a listing isn't what it claims to be."
    }
  ];
    return (
    <>
      <Navbar />  
      <div className="about-page">

        <div className="about-header">
          <h1>About SecureHub</h1>
          <p>
            Founded in 2026, SecureHub was built on one idea: online bidding
            should be fast, transparent, and safe by default.
          </p>
        </div>

        <div className="about-mission">
          <h2>Our Mission</h2>
          <p>
            SecureHub exists to make buying and selling online feel as safe
            as walking into a trusted store. We combine real-time technology
            with serious security infrastructure so every bid you place, and
            every item you list, is protected from start to finish.
          </p>
        </div>

        <div className="feature-grid">
          {features.map((item) => (
            <div className="feature-card" key={item.id}>
              <div className="feature-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="security-section">
          <h2>Security You Can Trust</h2>
          <p className="security-intro">
            The name says it all. Security isn't a feature we added on top —
            it's the foundation SecureHub is built on.
          </p>

          <div className="trust-grid">
            {trustPoints.map((point) => (
              <div className="trust-card" key={point.id}>
                <span className="trust-badge">✓</span>
                <div>
                  <h4>{point.title}</h4>
                  <p>{point.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="about-cta">
          <h2>Ready to Buy or Sell Securely?</h2>
          <p>Join thousands of verified users bidding on SecureHub today.</p>
          <button>Get Started</button>
        </div>

      </div>
      <Footer />
    </>
  );

}

export default About;
