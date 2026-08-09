import { Outlet } from "react-router-dom";
 
// Wraps every admin page. This div stays mounted while you navigate
// between admin routes (only <Outlet /> content swaps), so the dark
// background never disappears between pages and there's no white flash.
function AdminLayout() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f172a" }}>
      <Outlet />
    </div>
  );
}
 
export default AdminLayout;
 