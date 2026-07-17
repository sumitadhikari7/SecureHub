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

  const [errors, setErrors] = useState({});

    const handleChange = (e) => {
      const {name, value} = e.target;

    setFormData({
      ...formData,
      [name]:value
    });

    // field error disappears after update
    if(errors[name]){
    setErrors({
      ...errors,
      [name]: "",
    });
  }

  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();

    console.log("Login validation result:", newErrors)

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
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

  const validateRegisterForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()){
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }else if (!/^\d{1,10}$/.test(formData.phone)) {
      newErrors.phone = "Phone number must be numeric and no more than 10 digits";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required";
    }else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }

    const passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_-])[A-Za-z\d@$!%*?&#^_-]{8,}$/;
 
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!passwordRules.test(formData.password)) {
      newErrors.password = "Password must be at least 8 characters and include uppercase, lowercase, number, and special character";
    }
 
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    }else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    return newErrors;

  }

  const validateLoginForm = () => {

    const newErrors = {};
      if (!formData.email.trim()) {
    newErrors.email = "Email address is required";
    } 
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    return newErrors;
};

  const handleRegisterSubmit = (e) => {
    e.preventDefault();

    const newErrors = validateRegisterForm();
    console.log("VALIDATION RESULT:", newErrors);
    
    if(Object.keys(newErrors).length > 0){
      setErrors(newErrors);
      return;
    } //To not let user proceed if any roor is found

    setErrors({});
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
            onClick={() => {
              setIsLogin(false);
              setStep(1);
            }}
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
            <div className="input-field">
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                onChange={handleChange}
              />
              <span className="error-text">
                {errors.firstName || ""}
              </span>
            </div>

            <div className="input-field">
              <input
                type="text"
                name="middleName"
                placeholder="Middle Name"
                onChange={handleChange}
              />
              <span className="error-text">
                {errors.middleName || ""}
              </span>
            </div>

            <div className="input-field">
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                onChange={handleChange}
              />
              <span className="error-text">
                {errors.lastName || ""}
              </span>
            </div>
          </div>


          <div className="input-field">
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              onChange={handleChange}
            />
            <span className="error-text">
              {errors.phone || ""}
            </span>
          </div>


          <div className="input-field">
            <input
              type="text"
              name="email"
              placeholder="Email Address"
              onChange={handleChange}
            />
            <span className="error-text">
              {errors.email || ""}
            </span>
          </div>


          <div className="form-group">
            <div className="input-field">
              <input
                type="password"
                name="password"
                placeholder="Password"
                onChange={handleChange}
              />
              <span className="error-text">
                {errors.password || ""}
              </span>
            </div>

            <div className="input-field">
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                onChange={handleChange}
              />
              <span className="error-text">
                {errors.confirmPassword || ""}
              </span>
            </div>
          </div>

            <button type="submit" className="submit-btn">
              Send OTP
            </button>

          </form>
        )}

        {!isLogin && step === 2 && (
          <form className="auth-form" onSubmit={handleRegisterOtpSubmit}>
            <p>Enter OTP sent to your email</p>
            <input 
              type="text"
              name="otp"
              placeholder="Enter OTP (123456)"
              onChange={handleChange}
              required
            />

            <button 
              type="submit" 
              className="submit-btn"
            >
              Verify OTP & Create Account
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
            >
              Back
            </button>
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