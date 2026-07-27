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
    </>
)