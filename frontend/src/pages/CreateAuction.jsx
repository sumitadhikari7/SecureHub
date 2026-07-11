import { useState } from "react";
import "./CreateAuction.css";

function CreateAuction() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startingPrice: "",
    endTime: "",
    status: "in-progress",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

 