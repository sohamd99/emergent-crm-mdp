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
import { Plus, Trash2, FileCheck, Eye, Package } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, getStatusColor } from "@/utils/helpers";
import InvoicePreview from "@/pages/InvoicePreview";
import MDPQuotation from "@/pages/MDPQuotation";
import SearchSelect from "@/components/SearchSelect";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const emptyItem = { product_name: "", description: "", hsn_code: "", quantity: 1, unit: "NOS", rate: 0, gst_rate: 18 };

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ customer_id: "", date: new Date().toISOString().split("T")[0], valid_until: "", supply_type: "intra", notes: "", terms: "", pax: 0, subject: "", items: [{ ...emptyItem }] });

  const fetchAll = () => {
    axios.get(`${API}/quotations`).then(r => setQuotations(r.data)).catch(() => {});
    axios.get(`${API}/customers`).then(r => setCustomers(r.data)).catch(() => {});
    axios.get(`${API}/products`).then(r => setProducts(r.data)).catch(() => {});
  };
  useEffect(() => { fetchAll(); }, []);

  const updateItem = (idx, field, value) => { const items = [...form.items]; items[idx] = { ...items[idx], [field]: value }; setForm({ ...form, items }); };
  const selectProduct = (idx, pid) => { const p = products.find(x => x.id === pid); if (!p) return; const items = [...form.items]; items[idx] = { ...items[idx], product_name: p.name, description: p.description || "", hsn_code: p.hsn_code || "", unit: p.unit || "NOS", rate: p.rate || 0, gst_rate: p.gst_rate || 18 }; setForm({ ...form, items }); };
  const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleSave = async () => {
    if (!form.customer_id) return toast.error("Select a customer");
    try {
      const payload = { ...form, items: form.items.map(it => ({ ...it, quantity: parseFloat(it.quantity) || 0, rate: parseFloat(it.rate) || 0, gst_rate: parseFloat(it.gst_rate) || 0 })), pax: parseInt(form.pax) || 0 };
      if (editing) { await axios.put(`${API}/quotations/${editing.id}`, payload); toast.success("Updated"); }
      else { await axios.post(`${API}/quotations`, payload); toast("WhatsApp Alert", { description: "Quotation created", className: "whatsapp-toast" }); }
      setShowForm(false); setEditing(null); fetchAll();
    } catch { toast.error("Failed"); }
  };

  const handlePreview = async (q) => { try { const r = await axios.get(`${API}/quotations/${q.id}`); setPreviewData(r.data); setShowPreview(true); } catch { toast.error("Failed"); } };
  const handleStatusChange = async (id, status) => { try { await axios.patch(`${API}/quotations/${id}/status?status=${status}`); toast("WhatsApp Alert", { description: `Quotation status: ${status}`, className: "whatsapp-toast" }); fetchAll(); } catch { toast.error("Failed"); } };
  const handleDelete = async (id) => { try { await axios.delete(`${API}/quotations/${id}`); toast.success("Deleted"); fetchAll(); } catch { toast.error("Failed"); } };
  const handleEdit = (q) => { setEditing(q); setForm({ customer_id: q.customer_id || "", date: q.date || "", valid_until: q.valid_until || "", supply_type: q.supply_type || "intra", notes: q.notes || "", terms: q.terms || "", pax: q.pax || 0, subject: q.subject || "", items: (q.items || []).map(it => ({ product_name: it.product_name || "", description: it.description || "", hsn_code: it.hsn_code || "", quantity: it.quantity || 1, unit: it.unit || "NOS", rate: it.rate || 0, gst_rate: it.gst_rate || 18 })) }); setShowForm(true); };
  const getCustomerName = (id) => customers.find(c => c.id === id)?.name || "-";

  return (
    <div className="p-6 md:p-8 space-y-6 page-enter" data-testid="quotations-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>Quotations</h1>
          <p className="text-sm text-[#4F5D75] mt-1">Create and manage price quotations</p>
        </div>
        <Button data-testid="create-quotation-button" onClick={() => { setEditing(null); setForm({ customer_id: "", date: new Date().toISOString().split("T")[0], valid_until: "", supply_type: "intra", notes: "", terms: "", pax: 0, subject: "", items: [{ product_name: "Event Cost", description: "", hsn_code: "", quantity: 1, unit: "NOS", rate: 0, gst_rate: 0 }, { product_name: "Service Charges", description: "", hsn_code: "", quantity: 1, unit: "NOS", rate: 0, gst_rate: 0 }] }); setShowForm(true); }} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white">
          <Plus className="w-4 h-4 mr-2" /> New Quotation
        </Button>
      </div>

      <Card className="border-[#E5E0DA]">
        {quotations.length === 0 ? (
          <CardContent className="py-12 text-center"><FileCheck className="w-12 h-12 text-[#E5E0DA] mx-auto mb-3" strokeWidth={1.5} /><p className="text-sm text-[#4F5D75]">No quotations yet.</p></CardContent>
        ) : (
          <Table>
            <TableHeader><TableRow className="bg-[#F4F3F0]">
              <TableHead className="font-semibold text-[#2D3142]">Quote #</TableHead>
              <TableHead className="font-semibold text-[#2D3142]">Customer</TableHead>
              <TableHead className="font-semibold text-[#2D3142] hidden md:table-cell">Date</TableHead>
              <TableHead className="font-semibold text-[#2D3142]">Total</TableHead>
              <TableHead className="font-semibold text-[#2D3142]">Status</TableHead>
              <TableHead className="text-right font-semibold text-[#2D3142]">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {quotations.map((q, i) => (
                <TableRow key={q.id} className="animate-row" style={{ animationDelay: `${i * 40}ms` }}>
                  <TableCell className="font-semibold text-[#2D3142]">{q.quote_number}</TableCell>
                  <TableCell className="text-[#4F5D75]">{getCustomerName(q.customer_id)}</TableCell>
                  <TableCell className="text-[#4F5D75] hidden md:table-cell">{formatDate(q.date)}</TableCell>
                  <TableCell className="font-bold text-[#2D3142]">Rs. {formatCurrency(q.total)}</TableCell>
                  <TableCell>
                    <Select value={q.status} onValueChange={(v) => handleStatusChange(q.id, v)}>
                      <SelectTrigger className="w-28 h-7 border-0 p-0"><Badge className={`${getStatusColor(q.status)} text-xs font-bold rounded-full px-3 py-1 border-0`}>{q.status}</Badge></SelectTrigger>
                      <SelectContent>{["draft", "sent", "accepted", "rejected"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4F5D75] hover:text-[#81B29A]" onClick={() => handlePreview(q)} data-testid={`preview-quotation-${q.id}`}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4F5D75] hover:text-red-600" onClick={() => handleDelete(q.id)} data-testid={`delete-quotation-${q.id}`}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-lg font-semibold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>{editing ? "Edit Quotation" : "Create Quotation"}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2"><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Customer *</Label>
                  <SearchSelect value={form.customer_id} displayValue={customers.find(c=>c.id===form.customer_id)?.name||""} options={customers} placeholder="Search customer (3+ chars)..." minChars={3} onSelect={(c)=>setForm({...form,customer_id:c.id})} /></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Subject (Event Name) *</Label><Input data-testid="quotation-subject-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="e.g., MP Meet" className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">PAX (No. of People)</Label><Input data-testid="quotation-pax-input" type="number" value={form.pax} onChange={e => setForm({ ...form, pax: e.target.value })} placeholder="25" className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
              </div>
              <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Supply Type</Label>
                <div className="flex gap-3 mt-2">
                  <Button type="button" variant={form.supply_type === "intra" ? "default" : "outline"} className={form.supply_type === "intra" ? "bg-[#81B29A] hover:bg-[#6fa388] text-white" : "border-[#E5E0DA] text-[#4F5D75]"} onClick={() => setForm({ ...form, supply_type: "intra" })}>Intra-State</Button>
                  <Button type="button" variant={form.supply_type === "inter" ? "default" : "outline"} className={form.supply_type === "inter" ? "bg-[#81B29A] hover:bg-[#6fa388] text-white" : "border-[#E5E0DA] text-[#4F5D75]"} onClick={() => setForm({ ...form, supply_type: "inter" })}>Inter-State</Button>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3"><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Items</Label><Button type="button" variant="outline" size="sm" onClick={addItem} className="border-[#E5E0DA] text-[#4F5D75]"><Plus className="w-3 h-3 mr-1" /> Add</Button></div>
                <div className="border border-[#E5E0DA] rounded-lg overflow-hidden">
                  <Table><TableHeader><TableRow className="bg-[#F4F3F0]">
                    <TableHead className="text-xs w-8">#</TableHead><TableHead className="text-xs">Product</TableHead><TableHead className="text-xs w-20">HSN</TableHead><TableHead className="text-xs w-16">Qty</TableHead><TableHead className="text-xs w-16">Unit</TableHead><TableHead className="text-xs w-24">Rate</TableHead><TableHead className="text-xs w-16">GST%</TableHead><TableHead className="text-xs w-24 text-right">Amount</TableHead><TableHead className="w-10"></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {form.items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">{idx + 1}</TableCell>
                        <TableCell><div className="flex gap-1"><Input value={it.product_name} onChange={e => updateItem(idx, "product_name", e.target.value)} className="h-8 text-xs bg-[#F9F8F6] border-[#E5E0DA]" /><Select onValueChange={v => selectProduct(idx, v)}><SelectTrigger className="h-8 w-10 px-1 border-[#E5E0DA]"><Package className="w-3 h-3" /></SelectTrigger><SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div></TableCell>
                        <TableCell><Input value={it.hsn_code} onChange={e => updateItem(idx, "hsn_code", e.target.value)} className="h-8 text-xs bg-[#F9F8F6] border-[#E5E0DA] font-mono" /></TableCell>
                        <TableCell><Input type="number" value={it.quantity} onChange={e => updateItem(idx, "quantity", e.target.value)} className="h-8 text-xs bg-[#F9F8F6] border-[#E5E0DA]" /></TableCell>
                        <TableCell><Input value={it.unit} onChange={e => updateItem(idx, "unit", e.target.value)} className="h-8 text-xs bg-[#F9F8F6] border-[#E5E0DA]" /></TableCell>
                        <TableCell><Input type="number" value={it.rate} onChange={e => updateItem(idx, "rate", e.target.value)} className="h-8 text-xs bg-[#F9F8F6] border-[#E5E0DA]" /></TableCell>
                        <TableCell><Input type="number" value={it.gst_rate} onChange={e => updateItem(idx, "gst_rate", e.target.value)} className="h-8 text-xs bg-[#F9F8F6] border-[#E5E0DA]" /></TableCell>
                        <TableCell className="text-right text-xs font-bold">Rs. {formatCurrency((parseFloat(it.quantity) || 0) * (parseFloat(it.rate) || 0))}</TableCell>
                        <TableCell>{form.items.length > 1 && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}><Trash2 className="w-3 h-3" /></Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Terms</Label><Textarea value={form.terms} onChange={e => setForm({ ...form, terms: e.target.value })} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-3 mt-4 border-t pt-4"><Button variant="outline" onClick={() => setShowForm(false)} className="border-[#E5E0DA]">Cancel</Button><Button onClick={handleSave} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white" data-testid="save-quotation-button">{editing ? "Update" : "Create"}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}><DialogContent className="max-w-4xl max-h-[95vh] p-0"><ScrollArea className="max-h-[90vh]">{previewData && <MDPQuotation data={previewData} onClose={() => setShowPreview(false)} />}</ScrollArea></DialogContent></Dialog>
    </div>
  );
}
