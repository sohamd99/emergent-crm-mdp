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
import { Plus, Trash2, FileSpreadsheet, Eye, Package } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, getStatusColor } from "@/utils/helpers";
import RawEstimate from "@/pages/RawEstimate";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const emptyItem = { product_name: "Event Cost", description: "", hsn_code: "", quantity: 1, unit: "NOS", rate: 0, gst_rate: 0 };

export default function Estimates() {
  const [estimates, setEstimates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [form, setForm] = useState({ customer_id: "", date: new Date().toISOString().split("T")[0], pax: 0, subject: "", notes: "", items: [{ ...emptyItem }, { product_name: "Service Charges", description: "", hsn_code: "", quantity: 1, unit: "NOS", rate: 0, gst_rate: 0 }] });

  const fetchAll = () => {
    axios.get(`${API}/estimates`).then(r => setEstimates(r.data)).catch(() => {});
    axios.get(`${API}/customers`).then(r => setCustomers(r.data)).catch(() => {});
  };
  useEffect(() => { fetchAll(); }, []);

  const updateItem = (idx, field, value) => { const items = [...form.items]; items[idx] = { ...items[idx], [field]: value }; setForm({ ...form, items }); };
  const addItem = () => setForm({ ...form, items: [...form.items, { product_name: "", description: "", hsn_code: "", quantity: 1, unit: "NOS", rate: 0, gst_rate: 0 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const calcTotal = () => form.items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0), 0);

  const handleSave = async () => {
    if (!form.customer_id) return toast.error("Select a customer");
    try {
      const payload = { ...form, pax: parseInt(form.pax) || 0, items: form.items.map(it => ({ ...it, quantity: parseFloat(it.quantity) || 1, rate: parseFloat(it.rate) || 0, gst_rate: 0 })) };
      await axios.post(`${API}/estimates`, payload);
      toast("WhatsApp Alert", { description: "Estimate created", className: "whatsapp-toast" });
      setShowForm(false); fetchAll();
    } catch { toast.error("Failed"); }
  };

  const handlePreview = async (e) => { try { const r = await axios.get(`${API}/estimates/${e.id}`); setPreviewData(r.data); setShowPreview(true); } catch { toast.error("Failed"); } };
  const handleStatusChange = async (id, status) => { try { await axios.patch(`${API}/estimates/${id}/status?status=${status}`); toast.success("Updated"); fetchAll(); } catch { toast.error("Failed"); } };
  const handleDelete = async (id) => { try { await axios.delete(`${API}/estimates/${id}`); toast.success("Deleted"); fetchAll(); } catch { toast.error("Failed"); } };
  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || "-";

  return (
    <div className="p-6 md:p-8 space-y-6 page-enter" data-testid="estimates-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>Estimates</h1>
          <p className="text-sm text-[#4F5D75] mt-1">Quick raw estimates without company header</p>
        </div>
        <Button data-testid="create-estimate-button" onClick={() => { setForm({ customer_id: "", date: new Date().toISOString().split("T")[0], pax: 0, subject: "", notes: "", items: [{ ...emptyItem }, { product_name: "Service Charges", description: "", hsn_code: "", quantity: 1, unit: "NOS", rate: 0, gst_rate: 0 }] }); setShowForm(true); }} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Estimate
        </Button>
      </div>

      <Card className="border-[#E5E0DA]">
        {estimates.length === 0 ? (
          <CardContent className="py-12 text-center"><FileSpreadsheet className="w-12 h-12 text-[#E5E0DA] mx-auto mb-3" strokeWidth={1.5} /><p className="text-sm text-[#4F5D75]">No estimates yet.</p></CardContent>
        ) : (
          <Table>
            <TableHeader><TableRow className="bg-[#F4F3F0]">
              <TableHead className="font-semibold text-[#2D3142]">Estimate #</TableHead>
              <TableHead className="font-semibold text-[#2D3142]">Customer</TableHead>
              <TableHead className="font-semibold text-[#2D3142] hidden md:table-cell">Subject</TableHead>
              <TableHead className="font-semibold text-[#2D3142] hidden md:table-cell">Date</TableHead>
              <TableHead className="font-semibold text-[#2D3142]">Total</TableHead>
              <TableHead className="font-semibold text-[#2D3142]">Status</TableHead>
              <TableHead className="text-right font-semibold text-[#2D3142]">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {estimates.map((e, i) => (
                <TableRow key={e.id} className="animate-row" style={{ animationDelay: `${i * 40}ms` }}>
                  <TableCell className="font-semibold text-[#2D3142]">{e.estimate_number}</TableCell>
                  <TableCell className="text-[#4F5D75]">{getCustomerName(e.customer_id)}</TableCell>
                  <TableCell className="text-[#4F5D75] hidden md:table-cell text-xs">{e.subject || "-"}</TableCell>
                  <TableCell className="text-[#4F5D75] hidden md:table-cell">{formatDate(e.date)}</TableCell>
                  <TableCell className="font-bold text-[#2D3142]">Rs. {formatCurrency(e.total)}</TableCell>
                  <TableCell>
                    <Select value={e.status} onValueChange={(v) => handleStatusChange(e.id, v)}>
                      <SelectTrigger className="w-28 h-7 border-0 p-0"><Badge className={`${getStatusColor(e.status)} text-xs font-bold rounded-full px-3 py-1 border-0`}>{e.status}</Badge></SelectTrigger>
                      <SelectContent>{["draft", "sent", "accepted", "rejected"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4F5D75] hover:text-[#81B29A]" onClick={() => handlePreview(e)} data-testid={`preview-estimate-${e.id}`}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4F5D75] hover:text-red-600" onClick={() => handleDelete(e.id)} data-testid={`delete-estimate-${e.id}`}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-lg font-semibold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>Create Estimate</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Customer *</Label>
                  <Select value={form.customer_id} onValueChange={v => setForm({ ...form, customer_id: v })}><SelectTrigger className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" data-testid="estimate-customer-select"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Subject</Label><Input data-testid="estimate-subject-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g., Corporate Event" className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">PAX</Label><Input data-testid="estimate-pax-input" type="number" value={form.pax} onChange={e => setForm({ ...form, pax: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3"><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Cost Breakdown</Label><Button type="button" variant="outline" size="sm" onClick={addItem} className="border-[#E5E0DA]"><Plus className="w-3 h-3 mr-1" /> Add Row</Button></div>
                <div className="space-y-2">
                  {form.items.map((it, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-xs text-[#4F5D75] w-6">{idx+1}.</span>
                      <Input value={it.product_name} onChange={e => updateItem(idx, "product_name", e.target.value)} placeholder="Description" className="flex-1 h-9 text-sm bg-[#F9F8F6] border-[#E5E0DA]" data-testid={`est-item-name-${idx}`} />
                      <Input type="number" value={it.rate} onChange={e => updateItem(idx, "rate", e.target.value)} placeholder="Amount" className="w-32 h-9 text-sm bg-[#F9F8F6] border-[#E5E0DA] text-right font-mono" data-testid={`est-item-rate-${idx}`} />
                      {form.items.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4F5D75] hover:text-red-600" onClick={() => removeItem(idx)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-3 pr-10">
                  <p className="text-sm font-bold text-[#2D3142]">Total: Rs. {formatCurrency(calcTotal())}</p>
                </div>
              </div>
              <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA] min-h-[60px]" placeholder="Any additional notes..." /></div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-3 mt-4 border-t pt-4"><Button variant="outline" onClick={() => setShowForm(false)} className="border-[#E5E0DA]">Cancel</Button><Button onClick={handleSave} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white" data-testid="save-estimate-button">Create Estimate</Button></div>
        </DialogContent>
      </Dialog>

      {/* Preview */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}><DialogContent className="max-w-3xl max-h-[95vh] p-0"><ScrollArea className="max-h-[90vh]">{previewData && <RawEstimate data={previewData} onClose={() => setShowPreview(false)} />}</ScrollArea></DialogContent></Dialog>
    </div>
  );
}
