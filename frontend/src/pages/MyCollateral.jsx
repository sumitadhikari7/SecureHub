function MyCollateral() {
  const [activeTab, setActiveTab] = useState("view");
 
  //wire this up to backend
  const account = {
    totalCollateral: "$1,200",
    used: "$450",
    remaining: "$750",
  };