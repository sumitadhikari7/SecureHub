import './Authentication.css';
import { useState } from "react";


function Authentication() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);

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

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    console.log("Sending OTP to:", formData.email);
    setStep(2);
  };


  const handleOtpSubmit = (e) => {
    e.preventDefault();
    console.log("OTP entered:", formData.otp);

    if (formData.otp === "123456") {
      console.log("Login Successful");
    } else {
      console.log("Invalid OTP");
    }
  };


  const handleRegisterSubmit = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      console.log("Passwords do not match");
      return;
    }

    console.log("Sending OTP to:", formData.email);
    setStep(2);
  };

  const handleRegisterOtpSubmit = (e) => {
    e.preventDefault();
    console.log("OTP entered:", formData.otp);
    if(formData.otp === "123456"){
      console.log("Registration submitted", formData)
    }
    else{
      console.log("Invalid otp");
    }
  }

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
        {!isLogin && step === 1 && (
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

        {!isLogin && step === 2 && (
          <form className="auth-form" onSubmit={handleRegisterOtpSubmit}>
            <p>Enter OTP sent to you email</p>
            <input 
              type="text"
              name="otp"
              placeholder="Enter OTP (123456)"
              onChange={handleChange}
              required
            />
          </form>


        )}

      </section>

      <section className="auth-footer">
        <p>
          {isLogin
            ? "Don't have an account?"
            : "Already have an account?"}

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