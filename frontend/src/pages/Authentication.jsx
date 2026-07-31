import "./Authentication.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Authentication() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);

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

  const [errors, setErrors] = useState({});


  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };


  const validateRegisterForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";

    if (!formData.lastName.trim())
      newErrors.lastName = "Last name is required";

    if (!formData.phone.trim())
      newErrors.phone = "Phone number is required";

    else if (!/^\d{1,10}$/.test(formData.phone))
      newErrors.phone = "Phone number must be numeric";


    if (!formData.email.trim())
      newErrors.email = "Email is required";

    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Enter valid email";


    const passwordRules =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_-])[A-Za-z\d@$!%*?&#^_-]{8,}$/;


    if (!formData.password)
      newErrors.password = "Password required";

    else if (!passwordRules.test(formData.password))
      newErrors.password =
        "Password must contain uppercase, lowercase, number and special character";


    if (!formData.confirmPassword)
      newErrors.confirmPassword = "Confirm password";

    else if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";


    return newErrors;
  };


  const validateLoginForm = () => {
    const newErrors = {};

    if (!formData.email.trim())
      newErrors.email = "Email required";

    if (!formData.password)
      newErrors.password = "Password required";


    return newErrors;
  };


  // Login Step 1 - Request OTP
  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    const newErrors = validateLoginForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }


    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          credentials: "include",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            email:formData.email,
            password:formData.password
          })
        }
      );


      const data = await response.json();


      if(response.ok){
        alert(data.message || "OTP sent");
        setStep(2);
      }
      else{
        alert(data.message);
      }


    } catch(error){
      console.error(error);
      alert("Backend connection failed");
    }
  };


  // Login Step 2 - Verify OTP
  const handleOtpSubmit = async(e)=>{
    e.preventDefault();


    try{

      const response = await fetch(
        "http://localhost:5000/api/auth/verify-otp",
        {
          method:"POST",
          credentials:"include",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            email:formData.email,
            otp:formData.otp
          })
        }
      );


      const data = await response.json();


      if(response.ok){

        localStorage.setItem(
          "userId",
          data.user.user_id
        );

        localStorage.setItem(
          "userName",
          data.user.full_name
        );


        navigate("/dashboard");

      }
      else{
        alert(data.message);
      }


    }catch(error){
      console.error(error);
    }
  };



  // Register
  const handleRegisterSubmit = async(e)=>{

    e.preventDefault();


    const newErrors = validateRegisterForm();


    if(Object.keys(newErrors).length>0){
      setErrors(newErrors);
      return;
    }


    try{

      const response = await fetch(
        "http://localhost:5000/api/auth/register",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify(formData)
        }
      );


      const data = await response.json();


      if(response.ok){

        alert(data.message);

        setIsLogin(true);
        setStep(1);

      }
      else{
        alert(data.message);
      }


    }catch(error){
      console.error(error);
    }

  };



  return (
    <div className="auth">

      <section className="auth-hero">

        <h1>
          {isLogin ? "Login to SecureHub":"Create Your Account"}
        </h1>

        <p>
          Secure and Transparent Online Bidding Platform
        </p>


        <div className="auth-toggle">

          <button
          className={isLogin?"active":""}
          onClick={()=>{
            setIsLogin(true);
            setStep(1);
          }}>
            Login
          </button>


          <button
          className={!isLogin?"active":""}
          onClick={()=>{
            setIsLogin(false);
            setStep(1);
          }}>
            Register
          </button>

        </div>

      </section>



      <section className="auth-form-section">


      {isLogin && step===1 && (

        <form className="auth-form" onSubmit={handleLoginSubmit}>

          <input
          name="email"
          placeholder="Email Address"
          onChange={handleChange}
          />

          <span className="error-text">
            {errors.email}
          </span>


          <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
          />

          <span className="error-text">
            {errors.password}
          </span>


          <button className="submit-btn">
            Send OTP
          </button>

        </form>

      )}



      {isLogin && step===2 && (

        <form className="auth-form" onSubmit={handleOtpSubmit}>

          <input
          name="otp"
          placeholder="Enter OTP"
          onChange={handleChange}
          />


          <button className="submit-btn">
            Verify OTP
          </button>


        </form>

      )}



      {!isLogin && (

        <form className="auth-form" onSubmit={handleRegisterSubmit}>


          <input name="firstName" placeholder="First Name" onChange={handleChange}/>
          <input name="lastName" placeholder="Last Name" onChange={handleChange}/>
          <input name="phone" placeholder="Phone" onChange={handleChange}/>
          <input name="email" placeholder="Email" onChange={handleChange}/>
          <input type="password" name="password" placeholder="Password" onChange={handleChange}/>
          <input type="password" name="confirmPassword" placeholder="Confirm Password" onChange={handleChange}/>


          <button className="submit-btn">
            Register
          </button>


        </form>

      )}


      </section>


    </div>
  );
}


export default Authentication;