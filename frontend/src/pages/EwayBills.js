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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Route, Zap } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency, getStatusColor } from "@/utils/helpers";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EwayBills() {
  const [bills, setBills] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    invoice_id: "", from_place: "", from_state: "", from_pincode: "",
    to_place: "", to_state: "", to_pincode: "",
    vehicle_number: "", vehicle_type: "Regular", transport_mode: "Road",
    transporter_id: "", distance: 0
  });

  const fetchAll = () => {
    axios.get(`${API}/eway-bills`).then(r => setBills(r.data)).catch(() => {});
    axios.get(`${API}/invoices`).then(r => setInvoices(r.data)).catch(() => {});
  };
  useEffect(() => { fetchAll(); }, []);

  const handleOneClickGenerate = async (invoiceId) => {
    try {
      const res = await axios.get(`${API}/eway-bills/prefill/${invoiceId}`);
      const { customer, company } = res.data;
      setForm({
        invoice_id: invoiceId,
        from_place: company?.city || "", from_state: company?.state || "", from_pincode: company?.pincode || "",
        to_place: customer?.city || "", to_state: customer?.state || "", to_pincode: customer?.pincode || "",
        vehicle_number: "", vehicle_type: "Regular", transport_mode: "Road",
        transporter_id: "", distance: 0
      });
      setEditing(null);
      setShowForm(true);
    } catch { toast.error("Failed to prefill"); }
  };

  const handleSave = async () => {
    if (!form.invoice_id) return toast.error("Select an invoice");
    try {
      const payload = { ...form, distance: parseFloat(form.distance) || 0 };
      if (editing) {
        await axios.put(`${API}/eway-bills/${editing.id}`, payload);
        toast.success("Updated");
      } else {
        await axios.post(`${API}/eway-bills`, payload);
        toast("WhatsApp Alert", { description: "E-Way Bill generated successfully!", className: "whatsapp-toast" });
      }
      setShowForm(false); setEditing(null); fetchAll();
    } catch { toast.error("Failed"); }
  };

  const handleStatusChange = async (id, status) => {
    try { await axios.patch(`${API}/eway-bills/${id}/status?status=${status}`); toast("WhatsApp Alert", { description: `E-Way Bill status: ${status}`, className: "whatsapp-toast" }); fetchAll(); } catch { toast.error("Failed"); }
  };

  const handleDelete = async (id) => { try { await axios.delete(`${API}/eway-bills/${id}`); toast.success("Deleted"); fetchAll(); } catch { toast.error("Failed"); } };

  const handleEdit = (bill) => {
    setEditing(bill);
    setForm({
      invoice_id: bill.invoice_id || "", from_place: bill.from_place || "", from_state: bill.from_state || "", from_pincode: bill.from_pincode || "",
      to_place: bill.to_place || "", to_state: bill.to_state || "", to_pincode: bill.to_pincode || "",
      vehicle_number: bill.vehicle_number || "", vehicle_type: bill.vehicle_type || "Regular", transport_mode: bill.transport_mode || "Road",
      transporter_id: bill.transporter_id || "", distance: bill.distance || 0
    });
    setShowForm(true);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 page-enter" data-testid="eway-bills-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>E-Way Bills</h1>
          <p className="text-sm text-[#4F5D75] mt-1">Generate, edit and manage e-way bills</p>
        </div>
        <Button data-testid="create-eway-button" onClick={() => { setEditing(null); setForm({ invoice_id: "", from_place: "", from_state: "", from_pincode: "", to_place: "", to_state: "", to_pincode: "", vehicle_number: "", vehicle_type: "Regular", transport_mode: "Road", transporter_id: "", distance: 0 }); setShowForm(true); }} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white">
          <Plus className="w-4 h-4 mr-2" /> New E-Way Bill
        </Button>
      </div>

      {/* Quick Generate from Invoice */}
      {invoices.length > 0 && (
        <Card className="border-[#E5E0DA] bg-[#81B29A]/5" data-testid="quick-generate-card">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#D4A373] mb-3">One-Click Generate from Invoice</p>
            <div className="flex gap-2 flex-wrap">
              {invoices.slice(0, 5).map(inv => (
                <Button key={inv.id} variant="outline" size="sm" onClick={() => handleOneClickGenerate(inv.id)} className="border-[#81B29A] text-[#81B29A] hover:bg-[#81B29A] hover:text-white" data-testid={`quick-generate-${inv.id}`}>
                  <Zap className="w-3 h-3 mr-1" /> {inv.invoice_number}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-[#E5E0DA]">
        {bills.length === 0 ? (
          <CardContent className="py-12 text-center"><Route className="w-12 h-12 text-[#E5E0DA] mx-auto mb-3" strokeWidth={1.5} /><p className="text-sm text-[#4F5D75]">No e-way bills yet.</p></CardContent>
        ) : (
          <Table>
            <TableHeader><TableRow className="bg-[#F4F3F0]">
              <TableHead className="font-semibold text-[#2D3142]">EWB #</TableHead>
              <TableHead className="font-semibold text-[#2D3142]">Invoice</TableHead>
              <TableHead className="font-semibold text-[#2D3142] hidden md:table-cell">From</TableHead>
              <TableHead className="font-semibold text-[#2D3142] hidden md:table-cell">To</TableHead>
              <TableHead className="font-semibold text-[#2D3142] hidden lg:table-cell">Vehicle</TableHead>
              <TableHead className="font-semibold text-[#2D3142]">Value</TableHead>
              <TableHead className="font-semibold text-[#2D3142]">Status</TableHead>
              <TableHead className="text-right font-semibold text-[#2D3142]">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {bills.map((b, i) => (
                <TableRow key={b.id} className="animate-row" style={{ animationDelay: `${i * 40}ms` }}>
                  <TableCell className="font-semibold text-[#2D3142]">{b.eway_bill_number}</TableCell>
                  <TableCell className="text-[#4F5D75]">{b.invoice_number || "-"}</TableCell>
                  <TableCell className="text-[#4F5D75] hidden md:table-cell text-xs">{b.from_place}{b.from_state ? `, ${b.from_state}` : ""}</TableCell>
                  <TableCell className="text-[#4F5D75] hidden md:table-cell text-xs">{b.to_place}{b.to_state ? `, ${b.to_state}` : ""}</TableCell>
                  <TableCell className="text-[#4F5D75] hidden lg:table-cell font-mono text-xs">{b.vehicle_number || "-"}</TableCell>
                  <TableCell className="font-bold text-[#2D3142]">Rs. {formatCurrency(b.invoice_total)}</TableCell>
                  <TableCell>
                    <Select value={b.status} onValueChange={(v) => handleStatusChange(b.id, v)}>
                      <SelectTrigger className="w-28 h-7 border-0 p-0"><Badge className={`${getStatusColor(b.status)} text-xs font-bold rounded-full px-3 py-1 border-0`}>{b.status}</Badge></SelectTrigger>
                      <SelectContent>{["active", "cancelled", "expired"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4F5D75] hover:text-[#E07A5F]" onClick={() => handleEdit(b)} data-testid={`edit-eway-${b.id}`}><Route className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4F5D75] hover:text-red-600" onClick={() => handleDelete(b.id)} data-testid={`delete-eway-${b.id}`}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* E-Way Bill Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-lg font-semibold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>{editing ? "Edit E-Way Bill" : "Generate E-Way Bill"}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Invoice *</Label>
                <Select value={form.invoice_id} onValueChange={v => setForm({ ...form, invoice_id: v })}>
                  <SelectTrigger className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" data-testid="eway-invoice-select"><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>{invoices.map(inv => <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number} - Rs. {formatCurrency(inv.total)}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#81B29A]">From (Consignor)</p>
                  <div><Label className="text-xs text-[#4F5D75]">Place</Label><Input value={form.from_place} onChange={e => setForm({ ...form, from_place: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" data-testid="eway-from-place" /></div>
                  <div><Label className="text-xs text-[#4F5D75]">State</Label><Input value={form.from_state} onChange={e => setForm({ ...form, from_state: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
                  <div><Label className="text-xs text-[#4F5D75]">Pincode</Label><Input value={form.from_pincode} onChange={e => setForm({ ...form, from_pincode: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#E07A5F]">To (Consignee)</p>
                  <div><Label className="text-xs text-[#4F5D75]">Place</Label><Input value={form.to_place} onChange={e => setForm({ ...form, to_place: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" data-testid="eway-to-place" /></div>
                  <div><Label className="text-xs text-[#4F5D75]">State</Label><Input value={form.to_state} onChange={e => setForm({ ...form, to_state: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
                  <div><Label className="text-xs text-[#4F5D75]">Pincode</Label><Input value={form.to_pincode} onChange={e => setForm({ ...form, to_pincode: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Vehicle Number</Label><Input value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA] font-mono uppercase" placeholder="MH 01 AB 1234" data-testid="eway-vehicle-input" /></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Vehicle Type</Label>
                  <Select value={form.vehicle_type} onValueChange={v => setForm({ ...form, vehicle_type: v })}><SelectTrigger className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]"><SelectValue /></SelectTrigger><SelectContent>{["Regular", "ODC"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Transport Mode</Label>
                  <Select value={form.transport_mode} onValueChange={v => setForm({ ...form, transport_mode: v })}><SelectTrigger className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]"><SelectValue /></SelectTrigger><SelectContent>{["Road", "Rail", "Air", "Ship"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Transporter ID</Label><Input value={form.transporter_id} onChange={e => setForm({ ...form, transporter_id: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Distance (KM)</Label><Input type="number" value={form.distance} onChange={e => setForm({ ...form, distance: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" data-testid="eway-distance-input" /></div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-3 mt-4 border-t pt-4">
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-[#E5E0DA]">Cancel</Button>
            <Button onClick={handleSave} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white" data-testid="save-eway-button">
              <Zap className="w-4 h-4 mr-2" /> {editing ? "Update" : "Generate E-Way Bill"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
