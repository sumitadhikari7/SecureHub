import './Authentication.css';
import { useState } from "react";
import { useNavigate } from "react-router-dom"; 

function Authentication() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1 = Email & Password input, 2 = OTP screen
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

  // 🔐 LOGIN STEP 1 → Verify Credentials & Request OTP
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    console.log("Requesting OTP for:", formData.email);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password // 🚀 FIXED: Password is now packed and sent!
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "OTP sent successfully! Check your email. 📩");
        setStep(2); // Move user to OTP verification input stage
      } else {
        alert(data.message || "Invalid email or password.");
      }
    } catch (error) {
      console.error("Login Step 1 Network Error:", error);
      alert("Backend server connection failed.");
    }
  };

  // 🛡️ LOGIN STEP 2 → Verify OTP Code
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    console.log("Verifying OTP for:", formData.email);

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Access Granted! Welcome to SecureHub. 🔓");
        localStorage.setItem('token', data.token); 
        navigate('/dashboard'); // Kick user into the secure dashboard zone
      } else {
        alert(data.message || "Invalid OTP code entered.");
      }
    } catch (error) {
      console.error("Login Step 2 Network Error:", error);
      alert("Verification server link down.");
    }
  };

  // 📝 REGISTER SUBMIT → Write Account to Postgres Database
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match ❌");
      return;
    }

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
          password: formData.password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || "Registration Successful! 🎉");
        setIsLogin(true); // Flip over to login layout state
        setStep(1);
      } else {
        alert(data.message || "Registration failed ❌");
      }
    } catch (error) {
      console.error("Registration Connection Error:", error);
      alert("Could not talk to registration API backend.");
    }
  };

  return (
    <div className="auth">
      
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

      <section className="auth-form-section">
        
        {/* LOGIN FORM - STEP 1 */}
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

        {/* LOGIN FORM - STEP 2 */}
        {isLogin && step === 2 && (
          <form className="auth-form" onSubmit={handleOtpSubmit}>
            <p>Enter OTP sent to your email</p>

            <input
              type="text"
              name="otp"
              placeholder="Enter 6-Digit OTP Code"
              onChange={handleChange}
              required
            />

            <button type="submit" className="submit-btn">
              Verify OTP
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

        {/* REGISTRATION FORM */}
        {!isLogin && (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                onChange={handleChange}
                required
              />

              <input
                type="text"
                name="middleName"
                placeholder="Middle Name"
                onChange={handleChange}
              />

              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                onChange={handleChange}
                required
              />
            </div>

            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              onChange={handleChange}
              required
            />

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              onChange={handleChange}
              required
            />

            <div className="form-group">
              <input
                type="password"
                name="password"
                placeholder="Password"
                onChange={handleChange}
                required
              />

              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="submit-btn">
              Create Account
            </button>
          </form>
        )}
      </section>

      <section className="auth-footer">
        <p>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span
            onClick={() => {
              setIsLogin(!isLogin);
              setStep(1);
            }}
          >
            {isLogin ? " Register" : " Login"}
          </span>
        </p>
      </section>

    </div>
  );
}

export default Authentication;