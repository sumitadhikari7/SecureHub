import { useState } from "react";
import Navbar from "../components/Navbar";
import './MyCollateral.css'

function MyCollateral() {
  const [activeTab, setActiveTab] = useState("view");
 
  //wire this up to backend
  const account = {
    totalCollateral: "$1,200",
    used: "$450",
    remaining: "$750",
  };
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [requestSent, setRequestSent] = useState(false);

    const handleSendRequest = (e) => {
    e.preventDefault();
    if (!amount || !transactionId) return;
 
    // TODO: replace with real API call to notify admin
    // e.g. await api.post("/collateral/requests", { amount, transactionId })
 
    setRequestSent(true);
};
return(
    <>
        <Navbar />
        <div className="collateral-page">
        <div className="collateral-header">
          <h1>My Collateral</h1>
          <p>View your balance or load more collateral to start bidding.</p>
        </div>
 
        <div className="collateral-tabs">
          <button
            className={activeTab === "view" ? "tab active" : "tab"}
            onClick={() => setActiveTab("view")}
          >
            View Collateral
          </button>
          <button
            className={activeTab === "load" ? "tab active" : "tab"}
            onClick={() => setActiveTab("load")}
          >
            Load Collateral
          </button>
        </div>
        {activeTab === "view" && (
          <div className="collateral-card view-card">
            <span className="status">Account Balance</span>
            <h2 className="remaining-amount">{account.remaining}</h2>
            <p className="sub-label">Available Collateral</p>
 
            <div className="stats-row">
              <div className="stat">
                <p className="stat-label">Total Collateral</p>
                <p className="stat-value">{account.totalCollateral}</p>
              </div>
              <div className="stat">
                <p className="stat-label">Used</p>
                <p className="stat-value">{account.used}</p>
              </div>
              <div className="stat">
                <p className="stat-label">Remaining</p>
                <p className="stat-value">{account.remaining}</p>
              </div>
            </div>
          </div>
        )}
        {activeTab === "load" && (
          <div className="collateral-card load-card">
            {requestSent ? (
              <div className="confirmation">
                <span className="status success">Request Sent</span>
                <h2>Thanks — we've notified the admin</h2>
                <p className="sub-label">
                  Your request for {amount} with transaction ID{" "}
                  <strong>{transactionId}</strong> is pending review. You'll
                  be notified once it's approved.
                </p>
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setRequestSent(false);
                    setAmount("");
                    setTransactionId("");
                  }}
                >
                  Submit Another Request
                </button>
              </div>
            ):(
              <div className="load-grid">
                <form className="load-form" onSubmit={handleSendRequest}>
                  <label htmlFor="amount">Amount to Load</label>
                  <input
                    id="amount"
                    type="number"
                    min="1"
                    placeholder="Enter amount (e.g. 100)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
 
                  <label htmlFor="transactionId">Transaction ID</label>
                  <input
                    id="transactionId"
                    type="text"
                    placeholder="Enter transaction ID from your transfer"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    required
                  />
 
                  <button type="submit" className="send-request-btn">
                    Send Request
                  </button>
 
                  <p className="helper-text">
                    Once you send the request, an admin will review your
                    transfer and verify the transaction ID before adding it
                    to your balance.
                  </p>
                </form>
 
                <div className="qr-section">
                  <p className="qr-label">Scan to Transfer</p>
                  <div className="qr-box">
                    <img
                      src="/assets/payment-qr.png"
                      alt="Account QR code for payment transfer"
                    />
                  </div>
                  <p className="account-detail">
                    <strong>Account Name:</strong> Your Business Name
                  </p>
                  <p className="account-detail">
                    <strong>Account No:</strong> XXXX-XXXX-XXXX
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
    );
}

export default MyCollateral;