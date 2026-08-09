/* eslint-disable no-unused-vars */
/* eslint-disable preserve-caught-error */
import { useState, useEffect } from "react";
import {socket} from "../socket";
import Navbar from "../components/Navbar";
import "./MyCollateral.css";
import Footer from "../components/Footer";

function MyCollateral() {
  const [activeTab, setActiveTab] = useState("view");

  const [account, setAccount] = useState({
    totalCollateral: 0,
    used: 0,
    remaining: 0,
  });

  const [loadingBalance, setLoadingBalance] = useState(true);

  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [requestSent, setRequestSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ==========================================
  // FETCH LOGGED-IN USER'S COLLATERAL
  // ==========================================
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        setLoadingBalance(true);

        // Get currently logged-in user
        const res = await fetch("http://localhost:5000/api/me", {
          credentials: "include",
        });

        const responseText = await res.text();

        let user;

        try {
          user = responseText ? JSON.parse(responseText) : {};
        } catch (err) {
          console.error("Invalid /api/me response:", responseText);
          throw new Error("Server returned an invalid user response.");
        }

        if (!res.ok) {
          throw new Error(
            user.message || user.error || "Failed to fetch logged-in user."
          );
        }

        console.log("Logged-in user:", user);

        if (!user.userId) {
          throw new Error("User ID not found.");
        }

        // Fetch user's profile and balance
        const profileRes = await fetch(
          `http://localhost:5000/api/profile/${user.userId}`,
          {
            credentials: "include",
          }
        );

        const profileText = await profileRes.text();

        let profileData;

        try {
          profileData = profileText ? JSON.parse(profileText) : {};
        } catch (err) {
          console.error(
            "Invalid profile response:",
            profileText
          );
          throw new Error("Server returned an invalid profile response.");
        }

        if (!profileRes.ok) {
          throw new Error(
            profileData.message ||
              profileData.error ||
              `Failed to fetch profile: ${profileRes.status}`
          );
        }

        console.log("Profile data:", profileData);

        // `balance` is the current AVAILABLE collateral (already net of any
        // amount currently held on active bids). `totalCollateralLoaded` is
        // everything ever approved for this user, regardless of holds - so
        // Used = Total - Remaining reflects money actually locked in bids
        // right now, instead of the old hardcoded 0.
        const remaining = Number(profileData.balance ?? 0);
        const totalLoaded = Number(profileData.totalCollateralLoaded ?? remaining);
        const used = Math.max(totalLoaded - remaining, 0);

        setAccount({
          totalCollateral: totalLoaded,
          used,
          remaining,
        });
      } catch (err) {
        console.error("Failed to fetch balance:", err);

        setAccount({
          totalCollateral: 0,
          used: 0,
          remaining: 0,
        });
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [activeTab]);

  // ==========================================
  // SEND COLLATERAL REQUEST
  // ==========================================
  const handleSendRequest = async (e) => {
    e.preventDefault();

    if (!amount || !transactionId.trim()) {
      setErrorMsg("Please enter both the amount and transaction ID.");
      return;
    }

    if (Number(amount) <= 0) {
      setErrorMsg("Amount must be greater than 0.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const res = await fetch(
        "http://localhost:5000/api/user/collateral-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            amount: Number(amount),
            transactionId: transactionId.trim(),
          }),
        }
      );

      // Read response as text first so JSON errors don't crash
      const responseText = await res.text();

      let data = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (err) {
        console.error(
          "Server returned non-JSON response:",
          responseText
        );

        throw new Error(
          "Server returned an invalid response."
        );
      }

      console.log("Collateral request response:", data);

      if (!res.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Failed to submit collateral request."
        );
      }

      // Successfully submitted
      setRequestSent(true);
      setErrorMsg("");
    } catch (err) {
      console.error(
        "Failed to send collateral request:",
        err
      );

      setErrorMsg(
        err.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="collateral-page">
        <div className="collateral-container">

          <h1>My Collateral</h1>

          <p>
            View your balance or load more collateral to start bidding.
          </p>

          {/* ==============================
              TABS
          =============================== */}
          <div className="collateral-tabs">

            <button
              type="button"
              className={
                activeTab === "view"
                  ? "tab active"
                  : "tab"
              }
              onClick={() => setActiveTab("view")}
            >
              View Collateral
            </button>

            <button
              type="button"
              className={
                activeTab === "load"
                  ? "tab active"
                  : "tab"
              }
              onClick={() => setActiveTab("load")}
            >
              Load Collateral
            </button>

          </div>

          {/* ==============================
              VIEW COLLATERAL
          =============================== */}
          {activeTab === "view" && (
            <div className="collateral-summary-card view-card">

              <span className="status">
                Account Balance
              </span>

              <h2 className="remaining-amount">
                {loadingBalance
                  ? "Loading..."
                  : `$${account.remaining.toFixed(2)}`}
              </h2>

              <p className="sub-label">
                Available Collateral
              </p>

              <div className="stats-row">

                <div className="stat">
                  <p className="stat-label">
                    Total Collateral
                  </p>

                  <p className="collateral-stat-value">
                    {loadingBalance
                      ? "..."
                      : `$${account.totalCollateral.toFixed(2)}`}
                  </p>
                </div>

                <div className="stat">
                  <p className="stat-label">
                    Used
                  </p>

                  <p className="collateral-stat-value">
                    {loadingBalance
                      ? "..."
                      : `$${account.used.toFixed(2)}`}
                  </p>
                </div>

                <div className="stat">
                  <p className="stat-label">
                    Remaining
                  </p>

                  <p className="collateral-stat-value">
                    {loadingBalance
                      ? "..."
                      : `$${account.remaining.toFixed(2)}`}
                  </p>
                </div>

              </div>
            </div>
          )}

          {/* ==============================
              LOAD COLLATERAL
          =============================== */}
          {activeTab === "load" && (
            <div className="collateral-summary-card load-card">

              {requestSent ? (

                /* ==========================
                   SUCCESS MESSAGE
                =========================== */
                <div className="confirmation">

                  <span className="status success">
                    Request Sent
                  </span>

                  <h2>
                    Thanks - we've notified the admin
                  </h2>

                  <p className="sub-label">
                    Your request for ${amount} with
                    transaction ID{" "}
                    <strong>{transactionId}</strong>{" "}
                    is pending review. You'll be
                    notified once it's approved.
                  </p>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setRequestSent(false);
                      setAmount("");
                      setTransactionId("");
                      setErrorMsg("");
                    }}
                  >
                    Submit Another Request
                  </button>

                </div>

              ) : (

                /* ==========================
                   REQUEST FORM
                =========================== */
                <div className="load-grid">

                  <form
                    className="load-form"
                    onSubmit={handleSendRequest}
                  >

                    <label htmlFor="amount">
                      Amount to Load
                    </label>

                    <input
                      id="amount"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="Enter amount (e.g. 100)"
                      value={amount}
                      onChange={(e) =>
                        setAmount(e.target.value)
                      }
                      required
                    />

                    <label htmlFor="transactionId">
                      Transaction ID
                    </label>

                    <input
                      id="transactionId"
                      type="text"
                      placeholder="Enter transaction ID from your transfer"
                      value={transactionId}
                      onChange={(e) =>
                        setTransactionId(e.target.value)
                      }
                      required
                    />

                    {errorMsg && (
                      <p
                        className="error-text"
                        style={{
                          color: "red",
                          fontSize: "0.9rem",
                        }}
                      >
                        {errorMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="send-request-btn"
                      disabled={submitting}
                    >
                      {submitting
                        ? "Sending..."
                        : "Send Request"}
                    </button>

                    <p className="helper-text">
                      Once you send the request, an admin
                      will review your transfer and verify
                      the transaction ID before adding it
                      to your balance.
                    </p>

                  </form>

                  {/* ==========================
                      QR CODES
                  =========================== */}
                  <div className="qr-group">

                    <div className="qr-section">

                      <p className="qr-label">
                        Scan to Transfer
                      </p>

                      <div className="qr-box">
                        <img
                          src="/prarabdha.jpg"
                          alt="Account QR code for payment transfer"
                        />
                      </div>

                      <p className="account-detail">
                        <strong>Account Name:</strong>{" "}
                        Prarabdha Wagle
                      </p>

                      <p className="account-detail">
                        <strong>Account No:</strong>{" "}
                        9863026761
                      </p>

                    </div>

                    <div className="qr-section">

                      <p className="qr-label">
                        Alternate Transfer Method
                      </p>

                      <div className="qr-box">
                        <img
                          src="/sumit.jpg"
                          alt="Alternate account QR code for payment transfer"
                        />
                      </div>

                      <p className="account-detail">
                        <strong>Account Name:</strong>{" "}
                        Sumit Adhikari
                      </p>

                      <p className="account-detail">
                        <strong>Account No:</strong>{" "}
                        9818385754
                      </p>

                    </div>

                  </div>

                </div>
              )}

            </div>
          )}

        </div>
      </div>

      <Footer />
    </>
  );
}

export default MyCollateral;