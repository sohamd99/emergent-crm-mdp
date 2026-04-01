import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShoppingCart, Plus, Minus, Trash2, Search, CreditCard,
  Banknote, Truck, CheckCircle2, X, Package, Sparkles, Loader2, Send,
  Mic, MicOff
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
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashType, setCashType] = useState("paid");
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const aiInputRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceStartRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/products/by-category?cat=pos`).then(r => setProducts(r.data)).catch(() => {
      axios.get(`${API}/products`).then(r => setProducts(r.data.filter(p => p.category !== "service"))).catch(() => {});
    });
    axios.get(`${API}/customers`).then(r => setCustomers(r.data)).catch(() => {});
  }, []);

  const filteredProducts = searchQuery.length > 0
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku || "").toLowerCase().includes(searchQuery.toLowerCase()))
    : products;

  const addToCart = (product, qty = 1) => {
    const existing = cart.find(c => c.id === product.id);
    if (existing) {
      setCart(cart.map(c => c.id === product.id ? { ...c, qty: c.qty + qty } : c));
    } else {
      setCart([...cart, { id: product.id, name: product.name, sku: product.sku || "", rate: product.rate, gst_rate: product.gst_rate || 18, qty }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(cart.map(c => c.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
  };

  const removeFromCart = (id) => setCart(cart.filter(c => c.id !== id));

  const subtotal = cart.reduce((s, c) => s + c.rate * c.qty, 0);
  const tax = cart.reduce((s, c) => s + (c.rate * c.qty * (c.gst_rate || 18) / 100), 0);
  const grandTotal = Math.round(subtotal + tax);

  // AI Quick Add
  const handleAICart = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const res = await axios.post(`${API}/pos/ai-cart`, { content: aiQuery, source: "pos_ai" });
      const items = res.data.items || [];
      if (items.length === 0) {
        toast.error("Couldn't find matching products. Try SKU number or product name.");
      } else {
        items.forEach(item => {
          const prod = products.find(p => p.id === item.product_id);
          if (prod) {
            addToCart(prod, item.qty || 1);
            toast.success(`Added ${prod.name} x${item.qty || 1}`);
          }
        });
        setAiQuery("");
      }
    } catch { toast.error("AI search failed"); }
    finally { setAiLoading(false); }
  };

  const handleAIKeyDown = (e) => { if (e.key === "Enter") handleAICart(); };

  // Voice recording with silence detection -> auto AI cart
  const SILENCE_THRESHOLD = 8;
  const SILENCE_DURATION = 3000;

  const monitorSilence = () => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
    const rms = Math.sqrt(sum / data.length) * 100;
    if (rms < SILENCE_THRESHOLD) {
      if (!silenceStartRef.current) silenceStartRef.current = Date.now();
      else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) { stopVoice(); return; }
    } else { silenceStartRef.current = null; }
    rafRef.current = requestAnimationFrame(monitorSilence);
  };

  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      chunksRef.current = [];
      silenceStartRef.current = null;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        analyserRef.current = null;
        if (blob.size < 100) return;
        // Transcribe then auto-add to cart
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("file", blob, mimeType.includes('mp4') ? 'rec.m4a' : 'rec.webm');
          const res = await axios.post(`${API}/ai/voice-to-text`, fd, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
          if (res.data.success && res.data.text) {
            setAiQuery(res.data.text);
            toast.success(`Voice: "${res.data.text}" - processing...`);
            // Auto-trigger AI cart with transcribed text
            setAiLoading(true);
            try {
              const cartRes = await axios.post(`${API}/pos/ai-cart`, { content: res.data.text, source: "pos_voice" });
              const items = cartRes.data.items || [];
              if (items.length === 0) { toast.error("No matching products found. Try again."); }
              else {
                items.forEach(item => {
                  const prod = products.find(p => p.id === item.product_id);
                  if (prod) { addToCart(prod, item.qty || 1); toast.success(`Added ${prod.name} x${item.qty || 1}`); }
                });
                setAiQuery("");
              }
            } catch { toast.error("AI cart failed"); }
            finally { setAiLoading(false); }
          } else { toast.error("Couldn't hear clearly. Try again."); }
        } catch { toast.error("Voice failed"); }
        finally { setTranscribing(false); }
      };
      recorder.start(250);
      recorderRef.current = recorder;
      setIsRecording(true);
      toast.info("Speak your order... auto-stops when you pause");
      setTimeout(() => { if (recorderRef.current && recorderRef.current.state === "recording") { rafRef.current = requestAnimationFrame(monitorSilence); } }, 3000);
    } catch { toast.error("Microphone access denied"); }
  };

  const stopVoice = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    setIsRecording(false);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    setProcessing(true);
    try {
      // Create POS order first
      const payload = {
        customer_id: selectedCustomer?.id || "",
        customer_name: selectedCustomer?.name || "Shop Order",
        items: cart.map(c => ({ product_name: c.name, sku: c.sku, quantity: c.qty, rate: c.rate, gst_rate: c.gst_rate, total: c.rate * c.qty })),
        subtotal: Math.round(subtotal),
        tax: Math.round(tax),
        total: grandTotal,
        payment_method: paymentMethod === "cash" ? `Cash - ${cashType === "paid" ? "Paid" : "COD"}` : "UPI - Razorpay",
        payment_status: paymentMethod === "cash" ? (cashType === "paid" ? "paid" : "cod") : "pending",
      };
      const orderRes = await axios.post(`${API}/pos/orders`, payload);
      const posOrder = orderRes.data;

      if (paymentMethod === "upi") {
        // Razorpay UPI checkout
        try {
          const rzRes = await axios.post(`${API}/pos/razorpay/create-order`, { amount: grandTotal });
          const { order_id, key_id, amount } = rzRes.data;

          const options = {
            key: key_id,
            amount: amount,
            currency: "INR",
            name: "BillFlow POS",
            description: `Order ${posOrder.order_number}`,
            order_id: order_id,
            handler: async (response) => {
              // Verify payment
              try {
                await axios.post(`${API}/pos/razorpay/verify`, {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  pos_order_id: posOrder.id,
                  amount: amount,
                });
                setOrderComplete({ ...posOrder, payment_status: "paid", payment_method: "UPI - Razorpay (Paid)" });
                toast("WhatsApp Alert", { description: `Payment received for ${posOrder.order_number} - Rs.${formatCurrency(grandTotal)}`, className: "whatsapp-toast" });
              } catch {
                setOrderComplete({ ...posOrder, payment_status: "verification_failed" });
                toast.error("Payment verification failed");
              }
              setProcessing(false);
            },
            prefill: {
              name: selectedCustomer?.name || "Customer",
              contact: selectedCustomer?.phone || "",
            },
            theme: { color: "#E07A5F" },
            modal: {
              ondismiss: () => {
                setProcessing(false);
                toast.info("Payment cancelled. Order saved as pending.");
                setOrderComplete({ ...posOrder, payment_status: "pending", payment_method: "UPI - Razorpay (Pending)" });
              }
            }
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
          return; // Don't set processing=false here, handler will do it
        } catch (e) {
          toast.error("Razorpay failed to open. Order saved as pending.");
          setOrderComplete({ ...posOrder, payment_status: "pending" });
          setProcessing(false);
          return;
        }
      }

      // Cash order - complete immediately
      setOrderComplete(posOrder);
      toast("WhatsApp Alert", { description: `POS Order ${posOrder.order_number} - Rs.${formatCurrency(grandTotal)}`, className: "whatsapp-toast" });
    } catch { toast.error("Order failed"); }
    finally { if (paymentMethod !== "upi") setProcessing(false); }
  };

  const resetOrder = () => {
    setCart([]);
    setSelectedCustomer(null);
    setPaymentMethod("cash");
    setCashType("paid");
    setOrderComplete(null);
    setAiQuery("");
  };

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
            <Button onClick={resetOrder} className="w-full bg-[#E07A5F] hover:bg-[#C96D55] text-white" data-testid="new-order-button">New Order</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden" data-testid="pos-page">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col border-r border-[#E5E0DA] bg-[#F9F8F6]">
        <div className="p-4 bg-white border-b border-[#E5E0DA] space-y-2">
          <h1 className="text-xl font-bold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            <ShoppingCart className="w-5 h-5 inline-block mr-2 text-[#E07A5F]" strokeWidth={1.5} />
            POS Billing
          </h1>

          {/* AI Quick Add Bar with Voice */}
          <div className="flex gap-2">
            <Button
              onClick={() => isRecording ? stopVoice() : startVoice()}
              disabled={aiLoading || transcribing}
              className={`px-3 ${isRecording ? "bg-red-500 hover:bg-red-600 text-white recording-pulse" : "bg-[#2D3142] hover:bg-[#4F5D75] text-white"}`}
              data-testid="pos-mic-button"
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E07A5F]" />
              <Input
                ref={aiInputRef}
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                onKeyDown={handleAIKeyDown}
                placeholder={isRecording ? "Listening..." : transcribing ? "Transcribing..." : "Type or speak: '125 qty 50' or 'pen 3, notebook 2'"}
                className="pl-10 pr-10 bg-[#E07A5F]/5 border-[#E07A5F]/30 focus:border-[#E07A5F] text-sm"
                disabled={aiLoading || isRecording || transcribing}
                data-testid="pos-ai-input"
              />
              {(aiLoading || transcribing) && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E07A5F] animate-spin" />}
            </div>
            <Button onClick={handleAICart} disabled={aiLoading || transcribing || !aiQuery.trim()} className="bg-[#E07A5F] hover:bg-[#C96D55] text-white px-4" data-testid="pos-ai-add-button">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 p-2 rounded bg-red-50 border border-red-200">
              <span className="wave-bar" style={{animationDelay:'0s'}} /><span className="wave-bar" style={{animationDelay:'0.12s'}} /><span className="wave-bar" style={{animationDelay:'0.24s'}} />
              <span className="text-xs font-medium text-red-600">Listening... auto-stops on pause</span>
            </div>
          )}

          {/* Manual search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4F5D75]" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter products..."
              className="pl-10 bg-[#F9F8F6] border-[#E5E0DA] text-sm h-9"
              data-testid="pos-product-search"
            />
          </div>
        </div>

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
                    {inCart && <Badge className="bg-[#E07A5F] text-white text-[10px] border-0 px-2">{inCart.qty}</Badge>}
                  </div>
                  <p className="text-sm font-semibold text-[#2D3142] leading-tight mb-0.5 line-clamp-2">{p.name}</p>
                  <p className="text-[10px] text-[#D4A373] font-mono font-bold">{p.sku || "-"}</p>
                  <p className="text-base font-bold text-[#E07A5F] mt-1">Rs. {formatCurrency(p.rate)}</p>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-[#4F5D75] text-sm">No POS products found</div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Cart & Checkout */}
      <div className="w-[380px] flex flex-col bg-white">
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

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-10 h-10 text-[#E5E0DA] mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-[#4F5D75]">Tap products or use AI bar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#F9F8F6] border border-[#E5E0DA]" data-testid={`cart-item-${item.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#2D3142] truncate">{item.name}</p>
                    <p className="text-[10px] text-[#4F5D75]">Rs. {formatCurrency(item.rate)} x {item.qty}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-6 w-6 border-[#E5E0DA]" onClick={() => updateQty(item.id, -1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-xs font-bold w-6 text-center">{item.qty}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6 border-[#E5E0DA]" onClick={() => updateQty(item.id, 1)}>
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

        {cart.length > 0 && (
          <div className="border-t border-[#E5E0DA] p-4 space-y-3">
            {/* Customer (optional - Shop Order default) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4A373]">Customer</p>
                {selectedCustomer && (
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] text-[#4F5D75] px-1" onClick={() => setSelectedCustomer(null)}>
                    Reset to Shop Order
                  </Button>
                )}
              </div>
              {!selectedCustomer ? (
                <div>
                  <p className="text-xs text-[#81B29A] font-medium mb-1">Shop Order (no customer)</p>
                  <SearchSelect
                    value=""
                    displayValue=""
                    options={customers}
                    placeholder="Or search customer..."
                    minChars={3}
                    onSelect={(c) => setSelectedCustomer(c)}
                  />
                </div>
              ) : (
                <div className="p-2 rounded bg-[#F4F3F0] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#2D3142]">{selectedCustomer.name}</p>
                    <p className="text-[10px] text-[#D4A373] font-mono">{selectedCustomer.customer_code || ""}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedCustomer(null)}><X className="w-3 h-3" /></Button>
                </div>
              )}
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-[#4F5D75]"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-[#4F5D75]"><span>GST</span><span>{formatCurrency(tax)}</span></div>
              <Separator className="bg-[#E5E0DA]" />
              <div className="flex justify-between text-lg font-bold text-[#2D3142]"><span>Total</span><span>Rs. {formatCurrency(grandTotal)}</span></div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4A373] mb-2">Payment</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={paymentMethod === "cash" ? "default" : "outline"} className={`h-10 text-xs ${paymentMethod === "cash" ? "bg-[#81B29A] hover:bg-[#6fa388] text-white" : "border-[#E5E0DA] text-[#4F5D75]"}`} onClick={() => setPaymentMethod("cash")} data-testid="pay-cash-button">
                  <Banknote className="w-4 h-4 mr-1.5" /> Cash
                </Button>
                <Button variant={paymentMethod === "upi" ? "default" : "outline"} className={`h-10 text-xs ${paymentMethod === "upi" ? "bg-[#E07A5F] hover:bg-[#C96D55] text-white" : "border-[#E5E0DA] text-[#4F5D75]"}`} onClick={() => setPaymentMethod("upi")} data-testid="pay-upi-button">
                  <CreditCard className="w-4 h-4 mr-1.5" /> UPI
                </Button>
              </div>
              {paymentMethod === "cash" && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button variant={cashType === "paid" ? "default" : "outline"} size="sm" className={`text-xs ${cashType === "paid" ? "bg-[#2D3142] text-white" : "border-[#E5E0DA] text-[#4F5D75]"}`} onClick={() => setCashType("paid")} data-testid="cash-paid-button">
                    <Banknote className="w-3 h-3 mr-1" /> Cash Paid
                  </Button>
                  <Button variant={cashType === "cod" ? "default" : "outline"} size="sm" className={`text-xs ${cashType === "cod" ? "bg-[#2D3142] text-white" : "border-[#E5E0DA] text-[#4F5D75]"}`} onClick={() => setCashType("cod")} data-testid="cash-cod-button">
                    <Truck className="w-3 h-3 mr-1" /> Cash on Delivery
                  </Button>
                </div>
              )}
              {paymentMethod === "upi" && (
                <div className="mt-2 p-2 rounded bg-[#E07A5F]/10 text-[10px] text-[#E07A5F] text-center font-medium">
                  Razorpay UPI — secure checkout will open on Place Order
                </div>
              )}
            </div>

            <Button onClick={handlePlaceOrder} disabled={processing} className="w-full h-12 bg-[#E07A5F] hover:bg-[#C96D55] text-white text-base font-bold" data-testid="place-order-button">
              {processing ? "Processing..." : `Place Order - Rs. ${formatCurrency(grandTotal)}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
