import './Authentication.css';
import { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import toast, { Toaster } from "react-hot-toast";

function Authentication() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1 = Input Form, 2 = OTP Screen
  const navigate = useNavigate(); 

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
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

  // Helper to handle switching mode & resetting steps
  const switchAuthMode = (loginState) => {
    setIsLogin(loginState);
    setStep(1);
    setFormData((prev) => ({ ...prev, otp: "" }));
  };

  // ---------------------------------------------------------------------------
  // 🔐 LOGIN FLOW
  // ---------------------------------------------------------------------------

  // LOGIN STEP 1 → Request OTP
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "OTP sent successfully! Check your email. 📩");
        setStep(2); 
      } else {
        toast.error(data.message || "Invalid email or password.");
      }
    } catch (error) {
      console.error("Login Step 1 Network Error:", error);
      toast.error("Backend server connection failed.");
    }
  };

  // LOGIN STEP 2 → Verify OTP
  const handleLoginOtpSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Access Granted! Welcome to SecureHub. 🔓");

        localStorage.setItem("userId", String(data.user.user_id));
        localStorage.setItem("userName", data.user.full_name);
        localStorage.setItem("userEmail", data.user.email);

        navigate("/dashboard");
      } else {
        toast.error(data.message || "Invalid OTP code entered.");
      }
    } catch (error) {
      console.error("Login Step 2 Network Error:", error);
      toast.error("Verification server link down.");
    }
  };

  // ---------------------------------------------------------------------------
  // 📝 REGISTRATION FLOW
  // ---------------------------------------------------------------------------

  // REGISTER STEP 1 → Validate & Request Registration OTP
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      // Endpoint to request an OTP before user account creation
      const response = await fetch('http://localhost:5000/api/auth/register-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Verification code sent to your email! 📩");
        setStep(2);
      } else {
        toast.error(data.message || "Failed to send verification code.");
      }
    } catch (error) {
      console.error("Registration Request Error:", error);
      toast.error("Could not reach server to send registration OTP.");
    }
  };

  // REGISTER STEP 2 → Verify Registration OTP & Finalize User Creation
  const handleRegisterOtpSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          phone: formData.phone,
          email: formData.email,
          password: formData.password,
          otp: formData.otp, // Pass OTP along with user payload to complete setup
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Account verified & registered! 🎉");
        switchAuthMode(true); // Switch to Login screen
      } else {
        toast.error(data.message || "OTP verification or registration failed.");
      }
    } catch (error) {
      console.error("Registration Verification Error:", error);
      toast.error("Could not talk to registration API backend.");
    }
  };

  return (
    <div className="auth">
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3500,
          style: {
            background: "#1e293b",
            color: "#fff",
            borderRadius: "8px",
          },
        }} 
      />

      <section className="auth-hero">
        <h1>{isLogin ? "Login to SecureHub" : "Create Your Account"}</h1>
        <p>Secure and Transparent Online Bidding Platform</p>

        <div className="auth-toggle">
          <button
            className={isLogin ? "active" : ""}
            onClick={() => switchAuthMode(true)}
          >
            Login
          </button>

          <button
            className={!isLogin ? "active" : ""}
            onClick={() => switchAuthMode(false)}
          >
            Register
          </button>
        </div>
      </section>

      <section className="auth-form-section">
        
        {/* ==================== LOGIN FORMS ==================== */}
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

        {isLogin && step === 2 && (
          <form className="auth-form" onSubmit={handleLoginOtpSubmit}>
            <p>Enter login OTP sent to {formData.email}</p>

            <input
              type="text"
              name="otp"
              placeholder="Enter 6-Digit OTP Code"
              onChange={handleChange}
              required
            />

            <button type="submit" className="submit-btn">
              Verify OTP & Login
            </button>

            <button
              type="button"
              className="back-btn"
              onClick={() => setStep(1)}
            >
              Back
            </button>
          </form>
        )}

        {/* ==================== REGISTRATION FORMS ==================== */}
        {!isLogin && step === 1 && (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                required
              />

              <input
                type="text"
                name="middleName"
                placeholder="Middle Name"
                value={formData.middleName}
                onChange={handleChange}
              />

              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              required
            />

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <div className="form-group">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="submit-btn">
              Send Verification Code
            </button>
          </form>
        )}

        {!isLogin && step === 2 && (
          <form className="auth-form" onSubmit={handleRegisterOtpSubmit}>
            <p>Enter registration verification code sent to {formData.email}</p>

            <input
              type="text"
              name="otp"
              placeholder="Enter 6-Digit Code"
              onChange={handleChange}
              required
            />

            <button type="submit" className="submit-btn">
              Verify & Complete Registration
            </button>

            <button
              type="button"
              className="back-btn"
              onClick={() => setStep(1)}
            >
              Back
            </button>
          </form>
        )}
      </section>

      <section className="auth-footer">
        <p>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span onClick={() => switchAuthMode(!isLogin)}>
            {isLogin ? " Register" : " Login"}
          </span>
        </p>
      </section>
    </div>
  );
}

export default Authentication;