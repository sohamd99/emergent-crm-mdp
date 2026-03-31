import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Truck, Package } from "lucide-react";
import { toast } from "sonner";
import { formatDate, getStatusColor } from "@/utils/helpers";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const emptyItem = { product_name: "", description: "", hsn_code: "", quantity: 1, unit: "NOS", rate: 0, gst_rate: 0 };

export default function DeliveryChallans() {
  const [challans, setChallans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_id: "", date: new Date().toISOString().split("T")[0], invoice_id: "", vehicle_number: "", transport_mode: "Road", notes: "", items: [{ ...emptyItem }] });

  const fetchAll = () => {
    axios.get(`${API}/challans`).then(r => setChallans(r.data)).catch(() => {});
    axios.get(`${API}/customers`).then(r => setCustomers(r.data)).catch(() => {});
    axios.get(`${API}/products`).then(r => setProducts(r.data)).catch(() => {});
    axios.get(`${API}/invoices`).then(r => setInvoices(r.data)).catch(() => {});
  };
  useEffect(() => { fetchAll(); }, []);

  const updateItem = (idx, field, value) => { const items = [...form.items]; items[idx] = { ...items[idx], [field]: value }; setForm({ ...form, items }); };
  const selectProduct = (idx, pid) => { const p = products.find(x => x.id === pid); if (!p) return; const items = [...form.items]; items[idx] = { ...items[idx], product_name: p.name, description: p.description || "", hsn_code: p.hsn_code || "", unit: p.unit || "NOS", rate: p.rate || 0 }; setForm({ ...form, items }); };
  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleSave = async () => {
    if (!form.customer_id) return toast.error("Select a customer");
    try {
      const payload = { ...form, items: form.items.map(it => ({ ...it, quantity: parseFloat(it.quantity) || 0, rate: parseFloat(it.rate) || 0 })) };
      await axios.post(`${API}/challans`, payload);
      toast("WhatsApp Alert", { description: "Delivery Challan created", className: "whatsapp-toast" });
      setShowForm(false); fetchAll();
    } catch { toast.error("Failed"); }
  };

  const handleStatusChange = async (id, status) => {
    try { await axios.patch(`${API}/challans/${id}/status?status=${status}`); toast("WhatsApp Alert", { description: `Challan status: ${status}`, className: "whatsapp-toast" }); fetchAll(); } catch { toast.error("Failed"); }
  };

  const handleDelete = async (id) => { try { await axios.delete(`${API}/challans/${id}`); toast.success("Deleted"); fetchAll(); } catch { toast.error("Failed"); } };
  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || "-";

  return (
    <div className="p-6 md:p-8 space-y-6 page-enter" data-testid="challans-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>Delivery Challans</h1>
          <p className="text-sm text-[#4F5D75] mt-1">Track goods delivery with challans</p>
        </div>
        <Button data-testid="create-challan-button" onClick={() => { setForm({ customer_id: "", date: new Date().toISOString().split("T")[0], invoice_id: "", vehicle_number: "", transport_mode: "Road", notes: "", items: [{ ...emptyItem }] }); setShowForm(true); }} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Challan
        </Button>
      </div>

      <Card className="border-[#E5E0DA]">
        {challans.length === 0 ? (
          <CardContent className="py-12 text-center"><Truck className="w-12 h-12 text-[#E5E0DA] mx-auto mb-3" strokeWidth={1.5} /><p className="text-sm text-[#4F5D75]">No challans yet.</p></CardContent>
        ) : (
          <Table>
            <TableHeader><TableRow className="bg-[#F4F3F0]">
              <TableHead className="font-semibold text-[#2D3142]">Challan #</TableHead>
              <TableHead className="font-semibold text-[#2D3142]">Customer</TableHead>
              <TableHead className="font-semibold text-[#2D3142] hidden md:table-cell">Date</TableHead>
              <TableHead className="font-semibold text-[#2D3142] hidden md:table-cell">Vehicle</TableHead>
              <TableHead className="font-semibold text-[#2D3142]">Status</TableHead>
              <TableHead className="text-right font-semibold text-[#2D3142]">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {challans.map((ch, i) => (
                <TableRow key={ch.id} className="animate-row" style={{ animationDelay: `${i * 40}ms` }}>
                  <TableCell className="font-semibold text-[#2D3142]">{ch.challan_number}</TableCell>
                  <TableCell className="text-[#4F5D75]">{getCustomerName(ch.customer_id)}</TableCell>
                  <TableCell className="text-[#4F5D75] hidden md:table-cell">{formatDate(ch.date)}</TableCell>
                  <TableCell className="text-[#4F5D75] hidden md:table-cell font-mono text-xs">{ch.vehicle_number || "-"}</TableCell>
                  <TableCell>
                    <Select value={ch.status} onValueChange={(v) => handleStatusChange(ch.id, v)}>
                      <SelectTrigger className="w-28 h-7 border-0 p-0"><Badge className={`${getStatusColor(ch.status)} text-xs font-bold rounded-full px-3 py-1 border-0`}>{ch.status}</Badge></SelectTrigger>
                      <SelectContent>{["pending", "dispatched", "delivered"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4F5D75] hover:text-red-600" onClick={() => handleDelete(ch.id)} data-testid={`delete-challan-${ch.id}`}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-lg font-semibold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>Create Delivery Challan</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Customer *</Label>
                  <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}><SelectTrigger className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" data-testid="challan-customer-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Linked Invoice</Label>
                  <Select value={form.invoice_id} onValueChange={v => setForm({ ...form, invoice_id: v })}><SelectTrigger className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]"><SelectValue placeholder="Optional" /></SelectTrigger><SelectContent>{invoices.map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Vehicle Number</Label><Input data-testid="challan-vehicle-input" value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA] font-mono uppercase" placeholder="MH 01 AB 1234" /></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Transport Mode</Label>
                  <Select value={form.transport_mode} onValueChange={v => setForm({ ...form, transport_mode: v })}><SelectTrigger className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]"><SelectValue /></SelectTrigger><SelectContent>{["Road", "Rail", "Air", "Ship"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3"><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Items</Label><Button type="button" variant="outline" size="sm" onClick={addItem} className="border-[#E5E0DA]"><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
                <div className="border border-[#E5E0DA] rounded-lg overflow-hidden">
                  <Table><TableHeader><TableRow className="bg-[#F4F3F0]">
                    <TableHead className="text-xs w-8">#</TableHead><TableHead className="text-xs">Product</TableHead><TableHead className="text-xs w-16">Qty</TableHead><TableHead className="text-xs w-16">Unit</TableHead><TableHead className="w-10"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {form.items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{idx + 1}</TableCell>
                        <TableCell><div className="flex gap-1"><Input value={it.product_name} onChange={e => updateItem(idx, "product_name", e.target.value)} className="h-8 text-xs bg-[#F9F8F6] border-[#E5E0DA]" /><Select onValueChange={v => selectProduct(idx, v)}><SelectTrigger className="h-8 w-10 px-1 border-[#E5E0DA]"><Package className="w-3 h-3" /></SelectTrigger><SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div></TableCell>
                        <TableCell><Input type="number" value={it.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} className="h-8 text-xs bg-[#F9F8F6] border-[#E5E0DA]" /></TableCell>
                        <TableCell><Input value={it.unit} onChange={e => updateItem(idx, "unit", e.target.value)} className="h-8 text-xs bg-[#F9F8F6] border-[#E5E0DA]" /></TableCell>
                        <TableCell>{form.items.length > 1 && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}><Trash2 className="w-3 h-3" /></Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
                </div>
              </div>
              <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-3 mt-4 border-t pt-4"><Button variant="outline" onClick={() => setShowForm(false)} className="border-[#E5E0DA]">Cancel</Button><Button onClick={handleSave} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white" data-testid="save-challan-button">Create Challan</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
