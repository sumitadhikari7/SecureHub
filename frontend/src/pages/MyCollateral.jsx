import { useState } from "react";

function MyCollateral() {
  const [activeTab, setActiveTab] = useState("view");
 
  //wire this up to backend
  const account = {
    totalCollateral: "$1,200",
    used: "$450",
    remaining: "$750",
  };
};
return(
    <>
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
    </>
)