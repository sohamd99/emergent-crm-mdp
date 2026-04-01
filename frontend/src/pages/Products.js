import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/helpers";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const empty = { name: "", hsn_code: "", unit: "NOS", rate: 0, gst_rate: 18, description: "", category: "pos" };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const fetch = () => axios.get(`${API}/products`).then(r => setProducts(r.data)).catch(() => toast.error("Failed to load"));
  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    try {
      const data = { ...form, rate: parseFloat(form.rate) || 0, gst_rate: parseFloat(form.gst_rate) || 18 };
      if (editing) {
        await axios.put(`${API}/products/${editing.id}`, data);
        toast.success("Product updated");
      } else {
        await axios.post(`${API}/products`, data);
        toast.success("Product created");
      }
      setShowForm(false); setEditing(null); setForm(empty); fetch();
    } catch { toast.error("Failed to save"); }
  };

  const handleEdit = (p) => { setEditing(p); setForm({ name: p.name, hsn_code: p.hsn_code || "", unit: p.unit || "NOS", rate: p.rate || 0, gst_rate: p.gst_rate || 18, description: p.description || "", category: p.category || "pos" }); setShowForm(true); };
  const handleDelete = async (id) => { try { await axios.delete(`${API}/products/${id}`); toast.success("Deleted"); fetch(); } catch { toast.error("Failed"); } };

  return (
    <div className="p-6 md:p-8 space-y-6 page-enter" data-testid="products-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>Products</h1>
          <p className="text-sm text-[#4F5D75] mt-1">Manage your product catalog with HSN codes</p>
        </div>
        <Button data-testid="add-product-button" onClick={() => { setEditing(null); setForm(empty); setShowForm(true); }} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <Card className="border-[#E5E0DA]">
        {products.length === 0 ? (
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-[#E5E0DA] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-[#4F5D75]">No products yet. Add your first product.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F4F3F0]">
                <TableHead className="font-semibold text-[#2D3142]">SKU</TableHead>
                <TableHead className="font-semibold text-[#2D3142]">Name</TableHead>
                <TableHead className="font-semibold text-[#2D3142]">HSN Code</TableHead>
                <TableHead className="font-semibold text-[#2D3142]">Unit</TableHead>
                <TableHead className="font-semibold text-[#2D3142]">Rate</TableHead>
                <TableHead className="font-semibold text-[#2D3142]">GST %</TableHead>
                <TableHead className="font-semibold text-[#2D3142]">Type</TableHead>
                <TableHead className="text-right font-semibold text-[#2D3142]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p, i) => (
                <TableRow key={p.id} className="animate-row" style={{ animationDelay: `${i * 40}ms` }}>
                  <TableCell className="text-[#D4A373] font-mono text-xs font-bold">{p.sku || "-"}</TableCell>
                  <TableCell className="font-medium text-[#2D3142]">{p.name}</TableCell>
                  <TableCell className="text-[#4F5D75] font-mono text-xs">{p.hsn_code || "-"}</TableCell>
                  <TableCell className="text-[#4F5D75]">{p.unit}</TableCell>
                  <TableCell className="text-[#2D3142] font-medium">Rs. {formatCurrency(p.rate)}</TableCell>
                  <TableCell className="text-[#4F5D75]">{p.gst_rate}%</TableCell>
                  <TableCell><Badge className={`text-[10px] font-bold rounded-full px-2 py-0.5 border-0 ${p.category === 'service' ? 'bg-[#E07A5F]/15 text-[#E07A5F]' : 'bg-[#81B29A]/15 text-[#81B29A]'}`}>{p.category === 'service' ? 'Service' : 'POS'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4F5D75] hover:text-[#E07A5F]" onClick={() => handleEdit(p)} data-testid={`edit-product-${p.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#4F5D75] hover:text-red-600" onClick={() => handleDelete(p.id)} data-testid={`delete-product-${p.id}`}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="sm:col-span-2"><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Product Name *</Label><Input data-testid="product-name-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">HSN Code</Label><Input data-testid="product-hsn-input" value={form.hsn_code} onChange={e => setForm({...form, hsn_code: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA] font-mono" /></div>
            <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Unit</Label><Input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Rate (Rs.)</Label><Input data-testid="product-rate-input" type="number" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            <div><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">GST Rate (%)</Label><Input data-testid="product-gst-input" type="number" value={form.gst_rate} onChange={e => setForm({...form, gst_rate: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            <div className="sm:col-span-2"><Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Description</Label><Input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 bg-[#F9F8F6] border-[#E5E0DA]" /></div>
            <div className="sm:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Category</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" size="sm" variant={form.category === "pos" ? "default" : "outline"} className={form.category === "pos" ? "bg-[#81B29A] hover:bg-[#6fa388] text-white text-xs" : "border-[#E5E0DA] text-xs text-[#4F5D75]"} onClick={() => setForm({...form, category: "pos"})}>POS / Stationary</Button>
                <Button type="button" size="sm" variant={form.category === "service" ? "default" : "outline"} className={form.category === "service" ? "bg-[#E07A5F] hover:bg-[#C96D55] text-white text-xs" : "border-[#E5E0DA] text-xs text-[#4F5D75]"} onClick={() => setForm({...form, category: "service"})}>Service / Events</Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)} className="border-[#E5E0DA] text-[#4F5D75]" data-testid="cancel-product-button">Cancel</Button>
            <Button onClick={handleSave} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white" data-testid="save-product-button">{editing ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
