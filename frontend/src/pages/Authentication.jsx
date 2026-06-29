import { useState } from "react";
import "../styles/AuthPage.css";

function Authentication() {
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isLogin) {
      console.log("Login Submitted");
    } else {
      console.log("Registration Submitted");
    }
  };