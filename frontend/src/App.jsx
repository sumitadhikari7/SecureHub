import { Routes, Route } from "react-router-dom"
import Dashboard from "./pages/Dashboard";
import Authentication from "./pages/Authentication";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Authentication />}/>
      <Route path="/dashboard" element={<Dashboard />}/>
    </Routes>
  );
}

export default App;