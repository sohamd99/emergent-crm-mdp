import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Sidebar from "@/components/layout/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Notes from "@/pages/Notes";
import Customers from "@/pages/Customers";
import Products from "@/pages/Products";
import Invoices from "@/pages/Invoices";
import Quotations from "@/pages/Quotations";
import Estimates from "@/pages/Estimates";
import DeliveryChallans from "@/pages/DeliveryChallans";
import EwayBills from "@/pages/EwayBills";
import POS from "@/pages/POS";

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <div className="flex min-h-screen bg-[#F9F8F6]">
        <Sidebar />
        <main className="flex-1 md:ml-64 min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/quotations" element={<Quotations />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/challans" element={<DeliveryChallans />} />
            <Route path="/eway-bills" element={<EwayBills />} />
            <Route path="/pos" element={<POS />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
