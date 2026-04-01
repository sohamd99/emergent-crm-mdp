import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const empty = { name: "", email: "", phone: "", gstin: "", address: "", city: "", state: "", state_code: "", pincode: "" };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const fetch = () => axios.get(`${API}/customers`).then(r => setCustomers(r.data)).catch(() => toast.error("Failed to load customers"));
  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    try {
      if (editing) {
        await axios.put(`${API}/customers/${editing.id}`, form);
        toast.success("Customer updated");
      } else {
        await axios.post(`${API}/customers`, form);
        toast.success("Customer created");
      }
      setShowForm(false); setEditing(null); setForm(empty); fetch();
    } catch { toast.error("Failed to save"); }
  };

  const handleEdit = (c) => { setEditing(c); setForm({ name: c.name, email: c.email || "", phone: c.phone || "", gstin: c.gstin || "", address: c.address || "", city: c.city || "", state: c.state || "", state_code: c.state_code || "", pincode: c.pincode || "" }); setShowForm(true); };
  const handleDelete = async (id) => { try { await axios.delete(`${API}/customers/${id}`); toast.success("Deleted"); fetch(); } catch { toast.error("Failed"); } };

  return (
    <div className="p-6 md:p-8 space-y-6 page-enter" data-testid="customers-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>Customers</h1>
          <p className="text-sm text-[#4F5D75] mt-1">Manage your customer directory</p>
        </div>
        <Button data-testid="add-customer-button" onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      <Card className="border-[#E5E0DA]">
        {customers.length === 0 ? (
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-[#E5E0DA] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-[#4F5D75]">No customers yet. Add your first customer.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F4F3F0]">
                <TableHead className="font-semibold text-[#2D3142]">Code</TableHead>
                <TableHead className="font-semibold text-[#2D3142]">Name</TableHead>
                <TableHead className="font-semibold text-[#2D3142]">Phone</TableHead>
                <TableHead className="font-semibold text-[#2D3142] hidden md:table-cell">GSTIN</TableHead>
                <TableHead className="font-semibold text-[#2D3142] hidden lg:table-cell">City</TableHead>
                <TableHead className="font-semibold text-[#2D3142] hidden lg:table-cell">State</TableHead>
                <TableHead className="text-right font-semibold text-[#2D3142]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c, i) => (
                <TableRow key={c.id} className="animate-row" style={{ animationDelay: `${i * 40}ms` }}>
                  <TableCell className="text-[#D4A373] font-mono text-xs font-bold">{c.customer_code || "-"}</TableCell>
                  <TableCell className="font-medium text-[#2D3142]">{c.name}</TableCell>
                  <TableCell className="text-[#4F5D75]">{c.phone || "-"}</TableCell>
                  <TableCell className="text-[#4F5D75] hidden md:table-cell font-mono text-xs">{c.gstin || "-"}</TableCell>
                  <TableCell className="text-[#4F5D75] hidden lg:table-cell">{c.city || "-"}</TableCell>
                  <TableCell className="text-[#4F5D75] hidden lg:table-cell">{c.state || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4F5D75] hover:text-[#E07A5F]" onClick={() => handleEdit(c)} data-testid={`edit-customer-${c.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4F5D75] hover:text-red-600" onClick={() => handleDelete(c.id)} data-testid={`delete-customer-${c.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="sm:col-span-2"><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Name *</Label><Input data-testid="customer-name-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Email</Label><Input data-testid="customer-email-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Phone</Label><Input data-testid="customer-phone-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            <div className="sm:col-span-2"><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">GSTIN</Label><Input data-testid="customer-gstin-input" value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value})} placeholder="22AAAAA0000A1Z5" className="mt-1 bg-[#F9F8F6] border-[#E5E0DA] font-mono" /></div>
            <div className="sm:col-span-2"><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Address</Label><Input data-testid="customer-address-input" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">City</Label><Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">State</Label><Input value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">State Code</Label><Input value={form.state_code} onChange={e => setForm({...form, state_code: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Pincode</Label><Input value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-[#E5E0DA] text-[#4F5D75]" data-testid="cancel-customer-button">Cancel</Button>
            <Button onClick={handleSave} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white" data-testid="save-customer-button">{editing ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
