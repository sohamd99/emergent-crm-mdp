import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard, FileText, Users, Package, Receipt,
  FileCheck, FileSpreadsheet, Truck, Route, Menu, Settings, Bell, ShoppingCart
} from "lucide-react";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/notes", icon: FileText, label: "Notes" },
  { path: "/pos", icon: ShoppingCart, label: "POS Billing" },
  { path: "/customers", icon: Users, label: "Customers" },
  { path: "/products", icon: Package, label: "Products" },
  { path: "/invoices", icon: Receipt, label: "Invoices" },
  { path: "/quotations", icon: FileCheck, label: "Quotations" },
  { path: "/estimates", icon: FileSpreadsheet, label: "Estimates" },
  { path: "/challans", icon: Truck, label: "Delivery Challans" },
  { path: "/eway-bills", icon: Route, label: "E-Way Bills" },
];

function NavContent({ onItemClick }) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <h1 className="text-xl font-extrabold tracking-tight text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          BillFlow
        </h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4A373] mt-1">
          GST Billing Suite
        </p>
      </div>
      <Separator className="bg-[#E5E0DA]" />
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[#E07A5F] text-white shadow-sm"
                    : "text-[#4F5D75] hover:bg-[#F4F3F0] hover:text-[#2D3142]"
                }`}
              >
                <item.icon className="w-5 h-5" strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator className="bg-[#E5E0DA]" />
      <div className="p-4 space-y-1">
        <Link
          to="/"
          data-testid="nav-notifications"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-[#4F5D75] hover:bg-[#F4F3F0] hover:text-[#2D3142] transition-all duration-200"
        >
          <Bell className="w-5 h-5" strokeWidth={1.5} />
          Notifications
        </Link>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#E5E0DA] z-40 no-print">
        <NavContent />
      </aside>

      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-4 left-4 z-50 no-print">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              data-testid="mobile-menu-button"
              className="bg-white border-[#E5E0DA] shadow-sm"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <NavContent onItemClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
