import './Authentication.css';
import { useState } from "react";


function Authentication() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // login steps: 1 = credentials, 2 = OTP

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // LOGIN STEP 1 → send OTP
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    console.log("Sending OTP to:", formData.email);
    setStep(2);
  };

  // LOGIN STEP 2 → verify OTP
  const handleOtpSubmit = (e) => {
    e.preventDefault();
    console.log("OTP entered:", formData.otp);

    if (formData.otp === "123456") {
      console.log("Login Successful");
    } else {
      console.log("Invalid OTP");
    }
  };

  // REGISTER submit
  const handleRegisterSubmit = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      console.log("Passwords do not match");
      return;
    }

    console.log("Registration Submitted", formData);
  };

  return (
    <div className="auth">

      {/* HERO */}
      <section className="auth-hero">
        <h1>{isLogin ? "Login to SecureHub" : "Create Your Account"}</h1>
        <p>Secure and Transparent Online Bidding Platform</p>

        <div className="auth-toggle">
          <button
            className={isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(true);
              setStep(1);
            }}
          >
            Login
          </button>

          <button
            className={!isLogin ? "active" : ""}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>
      </section>

      {/* FORM SECTION */}
      <section className="auth-form-section">

        {/* ================= LOGIN ================= */}
        {isLogin && step === 1 && (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              onChange={handleChange}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              onChange={handleChange}
              required
            />

            <button type="submit" className="submit-btn">
              Send OTP
            </button>
          </form>
        )}

        {/* OTP STEP */}
        {isLogin && step === 2 && (
          <form className="auth-form" onSubmit={handleOtpSubmit}>
            <p>Enter OTP sent to your email</p>

            <input
              type="text"
              name="otp"
              placeholder="Enter OTP (123456)"
              onChange={handleChange}
              required
            />

            <button type="submit" className="submit-btn">
              Verify OTP
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
            >
              Back
            </button>
          </form>
        )}