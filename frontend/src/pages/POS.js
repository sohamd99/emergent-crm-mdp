import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingCart, Plus, Minus, Trash2, Search, CreditCard,
  Banknote, Truck, CheckCircle2, X, Package
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/helpers";
import SearchSelect from "@/components/SearchSelect";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function POS() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashType, setCashType] = useState("paid");
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(null);

  useEffect(() => {
    axios.get(`${API}/products`).then(r => setProducts(r.data)).catch(() => {});
    axios.get(`${API}/customers`).then(r => setCustomers(r.data)).catch(() => {});
  }, []);

  const filteredProducts = searchQuery.length > 0
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku || "").toLowerCase().includes(searchQuery.toLowerCase()))
    : products;

  const addToCart = (product) => {
    const existing = cart.find(c => c.id === product.id);
    if (existing) {
      setCart(cart.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { id: product.id, name: product.name, sku: product.sku || "", rate: product.rate, gst_rate: product.gst_rate || 18, qty: 1 }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(cart.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
  };

  const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));

  const subtotal = cart.reduce((s, c) => s + c.rate * c.qty, 0);
  const tax = cart.reduce((s, c) => s + (c.rate * c.qty * (c.gst_rate || 18) / 100), 0);
  const grandTotal = Math.round(subtotal + tax);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    if (paymentMethod === "upi") {
      toast.info("Razorpay will be connected after deployment. Order saved as UPI Pending.");
    }
    setProcessing(true);
    try {
      const payload = {
        customer_id: selectedCustomer?.id || "",
        customer_name: selectedCustomer?.name || "Walk-in Customer",
        items: cart.map(c => ({ product_name: c.name, sku: c.sku, quantity: c.qty, rate: c.rate, gst_rate: c.gst_rate, total: c.rate * c.qty })),
        subtotal: Math.round(subtotal),
        tax: Math.round(tax),
        total: grandTotal,
        payment_method: paymentMethod === "cash" ? `Cash - ${cashType === "paid" ? "Paid" : "COD"}` : "UPI - Razorpay",
        payment_status: paymentMethod === "upi" ? "pending" : (cashType === "paid" ? "paid" : "cod"),
      };
      const res = await axios.post(`${API}/pos/orders`, payload);
      setOrderComplete(res.data);
      toast("WhatsApp Alert", { description: `POS Order ${res.data.order_number} placed - Rs.${formatCurrency(grandTotal)}`, className: "whatsapp-toast" });
    } catch { toast.error("Order failed"); }
    finally { setProcessing(false); }
  };

  const resetOrder = () => {
    setCart([]);
    setSelectedCustomer(null);
    setPaymentMethod("cash");
    setCashType("paid");
    setOrderComplete(null);
  };

  // Order complete screen
  if (orderComplete) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[80vh]" data-testid="pos-order-complete">
        <Card className="border-[#81B29A] border-2 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#81B29A]/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#81B29A]" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-[#2D3142] mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>Order Placed!</h2>
            <p className="text-3xl font-bold text-[#E07A5F] mb-2">Rs. {formatCurrency(orderComplete.total)}</p>
            <p className="text-sm text-[#4F5D75] mb-1">{orderComplete.order_number}</p>
            <p className="text-xs text-[#4F5D75] mb-1">{orderComplete.customer_name}</p>
            <Badge className="bg-[#81B29A]/20 text-[#81B29A] border-0 text-xs mb-6">{orderComplete.payment_method}</Badge>
            <div className="flex gap-3">
              <Button onClick={resetOrder} className="flex-1 bg-[#E07A5F] hover:bg-[#C96D55] text-white" data-testid="new-order-button">New Order</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden" data-testid="pos-page">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col border-r border-[#E5E0DA] bg-[#F9F8F6]">
        {/* Header */}
        <div className="p-4 bg-white border-b border-[#E5E0DA]">
          <h1 className="text-xl font-bold text-[#2D3142] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <ShoppingCart className="w-5 h-5 inline-block mr-2 text-[#E07A5F]" strokeWidth={1.5} />
            POS Billing
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4F5D75]" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products by name or SKU..."
              className="pl-10 bg-[#F9F8F6] border-[#E5E0DA]"
              data-testid="pos-product-search"
            />
          </div>
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1 p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((p) => {
              const inCart = cart.find(c => c.id === p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${
                    inCart ? "border-[#E07A5F] bg-[#E07A5F]/5 shadow-sm" : "border-[#E5E0DA] bg-white"
                  }`}
                  data-testid={`pos-product-${p.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 rounded-lg bg-[#F4F3F0]">
                      <Package className="w-4 h-4 text-[#4F5D75]" strokeWidth={1.5} />
                    </div>
                    {inCart && (
                      <Badge className="bg-[#E07A5F] text-white text-[10px] border-0 px-2">{inCart.qty}</Badge>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#2D3142] leading-tight mb-0.5 line-clamp-2">{p.name}</p>
                  <p className="text-[10px] text-[#D4A373] font-mono font-bold">{p.sku || "-"}</p>
                  <p className="text-base font-bold text-[#E07A5F] mt-1">Rs. {formatCurrency(p.rate)}</p>
                  <p className="text-[10px] text-[#4F5D75]">GST {p.gst_rate || 18}%</p>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-[#4F5D75] text-sm">No products found</div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Cart & Checkout */}
      <div className="w-[380px] flex flex-col bg-white">
        {/* Cart Header */}
        <div className="p-4 border-b border-[#E5E0DA]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Cart ({cart.reduce((s, c) => s + c.qty, 0)})
            </h2>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-[#4F5D75] text-xs h-7" data-testid="clear-cart-button">
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-10 h-10 text-[#E5E0DA] mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-[#4F5D75]">Tap products to add</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#F9F8F6] border border-[#E5E0DA]" data-testid={`cart-item-${item.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#2D3142] truncate">{item.name}</p>
                    <p className="text-[10px] text-[#4F5D75]">Rs. {formatCurrency(item.rate)} x {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-6 w-6 border-[#E5E0DA]" onClick={() => updateQty(item.id, -1)} data-testid={`qty-minus-${item.id}`}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-xs font-bold w-6 text-center">{item.qty}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6 border-[#E5E0DA]" onClick={() => updateQty(item.id, 1)} data-testid={`qty-plus-${item.id}`}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs font-bold text-[#2D3142] w-16 text-right">{formatCurrency(item.rate * item.qty)}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-[#4F5D75] hover:text-red-500" onClick={() => removeFromCart(item.id)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Checkout Section */}
        {cart.length > 0 && (
          <div className="border-t border-[#E5E0DA] p-4 space-y-3">
            {/* Customer (optional) */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4A373] mb-1">Customer (optional)</p>
              <SearchSelect
                value={selectedCustomer?.id || ""}
                displayValue={selectedCustomer?.name || ""}
                options={customers}
                placeholder="Walk-in or search..."
                minChars={3}
                onSelect={(c) => setSelectedCustomer(c)}
              />
            </div>

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-[#4F5D75]">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#4F5D75]">
                <span>GST</span><span>{formatCurrency(tax)}</span>
              </div>
              <Separator className="bg-[#E5E0DA]" />
              <div className="flex justify-between text-lg font-bold text-[#2D3142]">
                <span>Total</span><span>Rs. {formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4A373] mb-2">Payment</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  className={`h-10 text-xs ${paymentMethod === "cash" ? "bg-[#81B29A] hover:bg-[#6fa388] text-white" : "border-[#E5E0DA] text-[#4F5D75]"}`}
                  onClick={() => setPaymentMethod("cash")}
                  data-testid="pay-cash-button"
                >
                  <Banknote className="w-4 h-4 mr-1.5" /> Cash
                </Button>
                <Button
                  variant={paymentMethod === "upi" ? "default" : "outline"}
                  className={`h-10 text-xs ${paymentMethod === "upi" ? "bg-[#E07A5F] hover:bg-[#C96D55] text-white" : "border-[#E5E0DA] text-[#4F5D75]"}`}
                  onClick={() => setPaymentMethod("upi")}
                  data-testid="pay-upi-button"
                >
                  <CreditCard className="w-4 h-4 mr-1.5" /> UPI
                </Button>
              </div>

              {/* Cash sub-options */}
              {paymentMethod === "cash" && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant={cashType === "paid" ? "default" : "outline"}
                    size="sm"
                    className={`text-xs ${cashType === "paid" ? "bg-[#2D3142] text-white" : "border-[#E5E0DA] text-[#4F5D75]"}`}
                    onClick={() => setCashType("paid")}
                    data-testid="cash-paid-button"
                  >
                    <Banknote className="w-3 h-3 mr-1" /> Cash Paid
                  </Button>
                  <Button
                    variant={cashType === "cod" ? "default" : "outline"}
                    size="sm"
                    className={`text-xs ${cashType === "cod" ? "bg-[#2D3142] text-white" : "border-[#E5E0DA] text-[#4F5D75]"}`}
                    onClick={() => setCashType("cod")}
                    data-testid="cash-cod-button"
                  >
                    <Truck className="w-3 h-3 mr-1" /> Cash on Delivery
                  </Button>
                </div>
              )}

              {paymentMethod === "upi" && (
                <div className="mt-2 p-2 rounded bg-[#E07A5F]/10 text-[10px] text-[#E07A5F] text-center">
                  Razorpay gateway will be connected after deployment
                </div>
              )}
            </div>

            {/* Place Order Button */}
            <Button
              onClick={handlePlaceOrder}
              disabled={processing}
              className="w-full h-12 bg-[#E07A5F] hover:bg-[#C96D55] text-white text-base font-bold"
              data-testid="place-order-button"
            >
              {processing ? "Processing..." : `Place Order - Rs. ${formatCurrency(grandTotal)}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
