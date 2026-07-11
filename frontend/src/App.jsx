import { Routes, Route } from "react-router-dom"
import Dashboard from "./pages/Dashboard";
import Authentication from "./pages/Authentication";
import CreateAuction from "./pages/CreateAuction";
function App() {
  return (
    <Routes>
      <Route path="/" element={<Authentication />}/> 
      <Route path="/dashboard" element={<Dashboard />}/>
      <Route path="/create-auction" element={<CreateAuction />}/>

    </Routes>
  );
}

export default App;