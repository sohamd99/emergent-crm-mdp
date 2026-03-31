import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, Upload, Trash2, FileText, Camera, Loader2,
  CheckCircle2, Receipt, FileCheck, FileSpreadsheet, Truck, Route, User, Package,
  ArrowRight, Zap, MessageCircle, AlertCircle, RotateCcw, Mic, MicOff, Languages
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatCurrency } from "@/utils/helpers";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ACTION_LABELS = {
  invoice: { label: "Tax Invoice", icon: Receipt, color: "text-[#E07A5F]", bg: "bg-[#E07A5F]/10" },
  quotation: { label: "Quotation (MDP)", icon: FileCheck, color: "text-[#81B29A]", bg: "bg-[#81B29A]/10" },
  estimate: { label: "Estimate (Raw)", icon: FileSpreadsheet, color: "text-[#4F5D75]", bg: "bg-[#4F5D75]/10" },
  delivery_challan: { label: "Delivery Challan", icon: Truck, color: "text-[#D4A373]", bg: "bg-[#D4A373]/10" },
  eway_bill: { label: "E-Way Bill", icon: Route, color: "text-[#4F5D75]", bg: "bg-[#4F5D75]/10" },
};

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [step, setStep] = useState("idle");
  const [aiPlan, setAiPlan] = useState(null);
  const [results, setResults] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [detectedLang, setDetectedLang] = useState("");
  const fileRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const silenceStartRef = useRef(null);
  const rafRef = useRef(null);

  const fetchNotes = () => axios.get(`${API}/notes`).then(r => setNotes(r.data)).catch(() => {});
  const [whatsappNumber, setWhatsappNumber] = useState("");

  useEffect(() => {
    fetchNotes();
    axios.get(`${API}/settings`).then(r => setWhatsappNumber(r.data?.whatsapp_number || "")).catch(() => {});
  }, []);

  // AI Process
  const handleAIProcess = async () => {
    if (!content.trim()) return toast.error("Enter some notes first");
    setStep("processing");
    try {
      const res = await axios.post(`${API}/ai/parse-notes`, { content, source: "ai" });
      const parsed = res.data.parsed;
      if (parsed.error && !parsed.customer) {
        toast.error("AI couldn't parse the notes. Try being more specific.");
        setStep("idle");
        return;
      }
      setAiPlan(parsed);
      setStep("planned");
      toast("WhatsApp Alert", { description: `AI analyzed: ${parsed.summary || "Notes processed"}${whatsappNumber ? ` | Sending to ${whatsappNumber}` : ""}`, className: "whatsapp-toast" });
      fetchNotes();
    } catch (e) {
      toast.error("AI processing failed. Please try again.");
      setStep("idle");
    }
  };

  // Execute plan
  const handleExecute = async () => {
    if (!aiPlan) return;
    setStep("executing");
    try {
      const res = await axios.post(`${API}/ai/execute-plan`, aiPlan);
      if (res.data.error) {
        toast.error(res.data.error);
        setStep("planned");
        return;
      }
      setResults(res.data);
      setStep("done");
      const created = res.data.created || [];
      created.forEach(item => {
        toast("WhatsApp Alert", {
          description: `${item.type.replace("_", " ")} created: ${item.number || item.name}${item.total ? ` - Rs.${formatCurrency(item.total)}` : ""}${whatsappNumber ? ` | Sent to ${whatsappNumber}` : ""}`,
          className: "whatsapp-toast"
        });
      });
    } catch {
      toast.error("Execution failed");
      setStep("planned");
    }
  };

  // OCR Upload
  const handleOCR = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/notes/ocr`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setContent(res.data.content || "");
      toast.success("Text extracted from image! Click 'AI Process' to continue.");
      fetchNotes();
    } catch { toast.error("OCR failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  // Manual save
  const handleManualSave = async () => {
    if (!content.trim()) return toast.error("Enter some content");
    try {
      await axios.post(`${API}/notes`, { content, source: "manual" });
      toast.success("Note saved");
      setContent("");
      fetchNotes();
    } catch { toast.error("Failed to save"); }
  };

  // Voice Recording with auto-stop on silence
  const SILENCE_THRESHOLD = 12; // RMS level below this = silence
  const SILENCE_DURATION = 2000; // 2 seconds of silence to auto-stop

  const monitorSilence = () => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(data);
    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const val = (data[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / data.length) * 100;

    if (rms < SILENCE_THRESHOLD) {
      // Silence detected
      if (!silenceStartRef.current) {
        silenceStartRef.current = Date.now();
      } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) {
        // Been silent long enough — auto stop
        stopRecording();
        return;
      }
    } else {
      // Sound detected — reset silence timer
      silenceStartRef.current = null;
    }
    rafRef.current = requestAnimationFrame(monitorSilence);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
      });
      streamRef.current = stream;
      chunksRef.current = [];
      silenceStartRef.current = null;

      // Set up audio analysis for silence detection
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
        analyserRef.current = null;
        if (blob.size < 100) { toast.error("Recording too short"); return; }
        await transcribeAudio(blob, mimeType.includes('mp4') ? 'recording.m4a' : 'recording.webm');
      };
      recorder.start(250);
      recorderRef.current = recorder;
      setIsRecording(true);
      setDetectedLang("");
      toast.info("Listening... Will auto-stop when you pause speaking");

      // Start silence monitoring after a 1.5s grace period
      setTimeout(() => { rafRef.current = requestAnimationFrame(monitorSilence); }, 1500);
    } catch (err) {
      toast.error("Microphone access denied. Please allow mic permission.");
    }
  };

  const stopRecording = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const transcribeAudio = async (blob, filename) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, filename);
      const res = await axios.post(`${API}/ai/voice-to-text`, formData, {
        headers: { "Content-Type": "multipart/form-data" }, timeout: 60000
      });
      if (res.data.success && res.data.text) {
        const newContent = content ? content + "\n" + res.data.text : res.data.text;
        setContent(newContent);
        setDetectedLang(res.data.language || "");
        const langNames = { hi: "Hindi", mr: "Marathi", en: "English", gu: "Gujarati", ta: "Tamil", te: "Telugu", kn: "Kannada", ml: "Malayalam", pa: "Punjabi", bn: "Bengali", ur: "Urdu" };
        const langName = langNames[res.data.language] || res.data.language || "Auto";
        toast.success(`Voice transcribed (${langName}). Click "AI Process" to continue.`);
      } else {
        toast.error(res.data.error || "Transcription failed. Try speaking louder or closer.");
      }
    } catch { toast.error("Voice transcription failed. Please try again."); }
    finally { setTranscribing(false); }
  };

  const handleMicToggle = () => { isRecording ? stopRecording() : startRecording(); };

  // Toggle action
  const toggleAction = (action) => {
    if (!aiPlan) return;
    const actions = aiPlan.actions || [];
    setAiPlan({
      ...aiPlan,
      actions: actions.includes(action) ? actions.filter(a => a !== action) : [...actions, action]
    });
  };

  // Update plan item
  const updatePlanItem = (idx, field, value) => {
    const items = [...(aiPlan.items || [])];
    items[idx] = { ...items[idx], [field]: value };
    setAiPlan({ ...aiPlan, items });
  };

  // Reset
  const handleReset = () => {
    setStep("idle");
    setAiPlan(null);
    setResults(null);
    setContent("");
  };

  const handleDelete = async (id) => {
    try { await axios.delete(`${API}/notes/${id}`); toast.success("Deleted"); fetchNotes(); } catch { toast.error("Failed"); }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 page-enter" data-testid="notes-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          <Sparkles className="w-7 h-7 inline-block mr-2 text-[#E07A5F]" strokeWidth={1.5} />
          AI Command Center
        </h1>
        <p className="text-sm text-[#4F5D75] mt-1">Enter rough notes and let AI create invoices, quotations, challans & e-way bills automatically</p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <Card className="border-[#E5E0DA]" data-testid="ai-input-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#2D3142] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D4A373]" strokeWidth={1.5} />
              Enter Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              data-testid="ai-notes-textarea"
              placeholder={"Example: Sharma ji called, needs 50 laptops at Rs.45,000 each.\nDeliver to Pune office, vehicle MH12AB1234.\n\nType, paste, or use the mic to speak in Hindi/Marathi/English!"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[180px] bg-[#F9F8F6] border-[#E5E0DA] focus:ring-2 focus:ring-[#E07A5F] focus:border-[#E07A5F] resize-none text-sm"
              disabled={step === "processing" || step === "executing" || transcribing}
            />

            {/* Recording Indicator */}
            {isRecording && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 animate-row">
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map(i => (
                    <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.12}s`, height: '4px' }} />
                  ))}
                </div>
                <span className="text-sm font-medium text-red-600">Listening... auto-stops on pause</span>
                <Badge className="bg-red-100 text-red-600 text-[10px] border-0 ml-auto">
                  <Languages className="w-3 h-3 mr-1" /> Hindi / Marathi / English
                </Badge>
              </div>
            )}
            {transcribing && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#E07A5F]/10 border border-[#E07A5F]/20">
                <Loader2 className="w-4 h-4 text-[#E07A5F] animate-spin" />
                <span className="text-sm font-medium text-[#E07A5F]">Transcribing audio...</span>
              </div>
            )}
            {detectedLang && !isRecording && !transcribing && content && (
              <div className="flex items-center gap-2">
                <Languages className="w-3.5 h-3.5 text-[#81B29A]" />
                <span className="text-[10px] text-[#81B29A] font-medium">
                  Detected: {({hi:"Hindi",mr:"Marathi",en:"English",gu:"Gujarati",ta:"Tamil"})[detectedLang] || detectedLang}
                </span>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {/* Mic Button */}
              <Button
                data-testid="mic-button"
                onClick={handleMicToggle}
                disabled={step === "processing" || step === "executing" || transcribing}
                className={`${isRecording
                  ? "bg-red-500 hover:bg-red-600 text-white recording-pulse"
                  : "bg-[#2D3142] hover:bg-[#4F5D75] text-white"
                } transition-all duration-300`}
              >
                {isRecording ? (
                  <><MicOff className="w-4 h-4 mr-2" /> Stop</>
                ) : (
                  <><Mic className="w-4 h-4 mr-2" /> Voice</>
                )}
              </Button>
              <Button
                data-testid="ai-process-button"
                onClick={handleAIProcess}
                disabled={step === "processing" || step === "executing" || !content.trim()}
                className="bg-[#E07A5F] hover:bg-[#C96D55] text-white flex-1 sm:flex-none"
              >
                {step === "processing" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> AI Process</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || step === "processing"}
                className="border-[#E5E0DA] text-[#4F5D75]"
                data-testid="ocr-upload-button"
              >
                <Camera className="w-4 h-4 mr-2" />
                {uploading ? "Scanning..." : "OCR Scan"}
              </Button>
              <Button variant="outline" onClick={handleManualSave} className="border-[#E5E0DA] text-[#4F5D75]" data-testid="save-note-only-button">
                Save Note Only
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleOCR} data-testid="ocr-file-input" />
            </div>
            {step !== "idle" && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-[#4F5D75]" data-testid="reset-button">
                <RotateCcw className="w-3 h-3 mr-1" /> Start Over
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Right: AI Plan / Results */}
        <div className="space-y-4">
          {step === "idle" && (
            <Card className="border-[#E5E0DA] border-dashed" data-testid="ai-idle-card">
              <CardContent className="py-16 text-center">
                <Sparkles className="w-12 h-12 text-[#E5E0DA] mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-sm font-medium text-[#2D3142] mb-1">AI Workspace</p>
                <p className="text-xs text-[#4F5D75]">Enter notes on the left and click "AI Process".<br />AI will extract all details and suggest documents to create.</p>
              </CardContent>
            </Card>
          )}

          {step === "processing" && (
            <Card className="border-[#E07A5F]/30 bg-[#E07A5F]/5" data-testid="ai-processing-card">
              <CardContent className="py-16 text-center">
                <Loader2 className="w-12 h-12 text-[#E07A5F] mx-auto mb-4 animate-spin" strokeWidth={1.5} />
                <p className="text-sm font-medium text-[#2D3142]">AI is analyzing your notes...</p>
                <p className="text-xs text-[#4F5D75] mt-1">Extracting customer, items, delivery details</p>
              </CardContent>
            </Card>
          )}

          {step === "planned" && aiPlan && (
            <Card className="border-[#81B29A]/50 bg-[#81B29A]/5" data-testid="ai-plan-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-[#2D3142] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#81B29A]" strokeWidth={1.5} />
                  AI Plan Ready
                </CardTitle>
                {aiPlan.summary && <p className="text-xs text-[#4F5D75] mt-1">{aiPlan.summary}</p>}
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-4">
                    {/* Customer */}
                    <div className="p-3 rounded-lg bg-white border border-[#E5E0DA]">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-[#D4A373]" strokeWidth={1.5} />
                        <span className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Customer</span>
                        {aiPlan.customer?.existing_id && <Badge className="bg-[#81B29A]/20 text-[#81B29A] text-[10px] border-0">Existing</Badge>}
                        {!aiPlan.customer?.existing_id && aiPlan.customer?.name && <Badge className="bg-[#E07A5F]/20 text-[#E07A5F] text-[10px] border-0">New</Badge>}
                      </div>
                      <Input
                        value={aiPlan.customer?.name || ""}
                        onChange={e => setAiPlan({ ...aiPlan, customer: { ...aiPlan.customer, name: e.target.value } })}
                        className="h-8 text-sm bg-[#F9F8F6] border-[#E5E0DA] font-medium"
                        data-testid="plan-customer-name"
                      />
                      {aiPlan.customer?.phone && <p className="text-[10px] text-[#4F5D75] mt-1">Phone: {aiPlan.customer.phone} | City: {aiPlan.customer.city || "-"} | State: {aiPlan.customer.state || "-"}</p>}
                    </div>

                    {/* Items */}
                    <div className="p-3 rounded-lg bg-white border border-[#E5E0DA]">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-[#D4A373]" strokeWidth={1.5} />
                        <span className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Items ({(aiPlan.items || []).length})</span>
                      </div>
                      <div className="border border-[#E5E0DA] rounded overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#F4F3F0]">
                              <TableHead className="text-[10px] font-semibold">Product</TableHead>
                              <TableHead className="text-[10px] font-semibold w-16">Qty</TableHead>
                              <TableHead className="text-[10px] font-semibold w-24">Rate</TableHead>
                              <TableHead className="text-[10px] font-semibold w-16">GST%</TableHead>
                              <TableHead className="text-[10px] font-semibold w-24 text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(aiPlan.items || []).map((it, idx) => (
                              <TableRow key={idx}>
                                <TableCell>
                                  <Input value={it.product_name} onChange={e => updatePlanItem(idx, "product_name", e.target.value)} className="h-7 text-xs bg-transparent border-0 p-0 font-medium" data-testid={`plan-item-name-${idx}`} />
                                </TableCell>
                                <TableCell>
                                  <Input type="number" value={it.quantity} onChange={e => updatePlanItem(idx, "quantity", parseFloat(e.target.value) || 0)} className="h-7 text-xs bg-transparent border-0 p-0 w-14" data-testid={`plan-item-qty-${idx}`} />
                                </TableCell>
                                <TableCell>
                                  <Input type="number" value={it.rate} onChange={e => updatePlanItem(idx, "rate", parseFloat(e.target.value) || 0)} className="h-7 text-xs bg-transparent border-0 p-0 w-20" data-testid={`plan-item-rate-${idx}`} />
                                </TableCell>
                                <TableCell className="text-xs text-[#4F5D75]">{it.gst_rate}%</TableCell>
                                <TableCell className="text-xs font-bold text-right text-[#2D3142]">Rs. {formatCurrency((it.quantity || 0) * (it.rate || 0))}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Delivery */}
                    {aiPlan.delivery && (aiPlan.delivery.vehicle_number || aiPlan.delivery.to_city) && (
                      <div className="p-3 rounded-lg bg-white border border-[#E5E0DA]">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="w-4 h-4 text-[#D4A373]" strokeWidth={1.5} />
                          <span className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Delivery</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-[#4F5D75]">
                          {aiPlan.delivery.vehicle_number && <p>Vehicle: <span className="font-mono font-medium text-[#2D3142]">{aiPlan.delivery.vehicle_number}</span></p>}
                          {aiPlan.delivery.to_city && <p>To: <span className="font-medium text-[#2D3142]">{aiPlan.delivery.to_city}{aiPlan.delivery.to_state ? `, ${aiPlan.delivery.to_state}` : ""}</span></p>}
                          {aiPlan.delivery.transport_mode && <p>Mode: {aiPlan.delivery.transport_mode}</p>}
                          {aiPlan.delivery.distance > 0 && <p>Distance: {aiPlan.delivery.distance} km</p>}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="p-3 rounded-lg bg-white border border-[#E5E0DA]">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-[#D4A373]" strokeWidth={1.5} />
                        <span className="text-xs font-bold uppercase tracking-wider text-[#D4A373]">Documents to Create</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(ACTION_LABELS).map(([key, { label, icon: Icon, color, bg }]) => (
                          <div
                            key={key}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                              (aiPlan.actions || []).includes(key)
                                ? `${bg} border-current ${color} shadow-sm`
                                : "border-[#E5E0DA] text-[#4F5D75] opacity-50"
                            }`}
                            onClick={() => toggleAction(key)}
                            data-testid={`toggle-action-${key}`}
                          >
                            <Checkbox checked={(aiPlan.actions || []).includes(key)} className="pointer-events-none" />
                            <Icon className="w-4 h-4" strokeWidth={1.5} />
                            <span className="text-xs font-medium">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Supply Type */}
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant={aiPlan.supply_type === "intra" ? "default" : "outline"}
                        className={aiPlan.supply_type === "intra" ? "bg-[#81B29A] hover:bg-[#6fa388] text-white text-xs" : "border-[#E5E0DA] text-xs"}
                        onClick={() => setAiPlan({ ...aiPlan, supply_type: "intra" })} data-testid="plan-supply-intra">
                        Intra-State
                      </Button>
                      <Button type="button" size="sm" variant={aiPlan.supply_type === "inter" ? "default" : "outline"}
                        className={aiPlan.supply_type === "inter" ? "bg-[#81B29A] hover:bg-[#6fa388] text-white text-xs" : "border-[#E5E0DA] text-xs"}
                        onClick={() => setAiPlan({ ...aiPlan, supply_type: "inter" })} data-testid="plan-supply-inter">
                        Inter-State
                      </Button>
                    </div>

                    {/* PAX & Subject (for Quotations) */}
                    {(aiPlan.actions || []).includes("quotation") && (
                      <div className="p-3 rounded-lg bg-white border border-[#E5E0DA]">
                        <div className="flex items-center gap-2 mb-2">
                          <FileCheck className="w-4 h-4 text-[#81B29A]" strokeWidth={1.5} />
                          <span className="text-xs font-bold uppercase tracking-wider text-[#81B29A]">MDP Quotation Details</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-[#4F5D75]">Subject (Event)</span>
                            <Input value={aiPlan.subject || ""} onChange={e => setAiPlan({ ...aiPlan, subject: e.target.value })} className="h-7 text-xs bg-[#F9F8F6] border-[#E5E0DA]" placeholder="e.g., MP Meet" data-testid="plan-subject" />
                          </div>
                          <div>
                            <span className="text-[10px] text-[#4F5D75]">PAX (People)</span>
                            <Input type="number" value={aiPlan.pax || 0} onChange={e => setAiPlan({ ...aiPlan, pax: parseInt(e.target.value) || 0 })} className="h-7 text-xs bg-[#F9F8F6] border-[#E5E0DA]" data-testid="plan-pax" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <Separator className="my-4 bg-[#E5E0DA]" />

                <Button
                  onClick={handleExecute}
                  className="w-full bg-[#E07A5F] hover:bg-[#C96D55] text-white font-medium py-3"
                  data-testid="execute-plan-button"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Execute All ({(aiPlan.actions || []).length} documents)
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "executing" && (
            <Card className="border-[#E07A5F]/30 bg-[#E07A5F]/5" data-testid="ai-executing-card">
              <CardContent className="py-16 text-center">
                <Loader2 className="w-12 h-12 text-[#E07A5F] mx-auto mb-4 animate-spin" strokeWidth={1.5} />
                <p className="text-sm font-medium text-[#2D3142]">Creating documents...</p>
                <p className="text-xs text-[#4F5D75] mt-1">Invoice, Challan, E-Way Bill in progress</p>
              </CardContent>
            </Card>
          )}

          {step === "done" && results && (
            <Card className="border-[#81B29A]/50 bg-[#81B29A]/5" data-testid="ai-results-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-[#2D3142] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#81B29A]" strokeWidth={1.5} />
                  All Done!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(results.created || []).map((item, i) => {
                  const actionInfo = ACTION_LABELS[item.type] || {};
                  const Icon = actionInfo.icon || CheckCircle2;
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-[#E5E0DA] animate-row" style={{ animationDelay: `${i * 100}ms` }} data-testid={`result-item-${i}`}>
                      <div className={`p-2 rounded-lg ${actionInfo.bg || 'bg-[#81B29A]/10'}`}>
                        <Icon className={`w-4 h-4 ${actionInfo.color || 'text-[#81B29A]'}`} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#2D3142] capitalize">{item.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-[#4F5D75]">{item.number || item.name}{item.total ? ` - Rs. ${formatCurrency(item.total)}` : ""}</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-[#81B29A]" strokeWidth={1.5} />
                    </div>
                  );
                })}
                {results.errors?.length > 0 && results.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4" /> {err}
                  </div>
                ))}
                <Separator className="my-3" />
                <div className="flex gap-2">
                  <Button onClick={handleReset} className="bg-[#81B29A] hover:bg-[#6fa388] text-white flex-1" data-testid="new-task-button">
                    <Sparkles className="w-4 h-4 mr-2" /> New Task
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Notes History */}
      <div>
        <h2 className="text-lg font-semibold text-[#2D3142] mb-4 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          <MessageCircle className="w-5 h-5 text-[#4F5D75]" strokeWidth={1.5} />
          Notes History ({notes.length})
        </h2>
        {notes.length === 0 ? (
          <Card className="border-[#E5E0DA]">
            <CardContent className="py-8 text-center">
              <FileText className="w-10 h-10 text-[#E5E0DA] mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-[#4F5D75]">No notes yet. Start by entering instructions above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {notes.map((note, i) => (
              <Card key={note.id} className="border-[#E5E0DA] hover:shadow-md transition-all duration-300 animate-row" style={{ animationDelay: `${i * 40}ms` }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] font-bold rounded-full px-2 py-0.5 border-0 ${
                        note.source === 'ai' ? 'bg-[#E07A5F]/20 text-[#E07A5F]' :
                        note.source === 'ocr' ? 'bg-[#81B29A]/20 text-[#81B29A]' :
                        'bg-[#D4A373]/20 text-[#D4A373]'
                      }`}>
                        {note.source === 'ai' ? 'AI' : note.source === 'ocr' ? 'OCR' : 'MANUAL'}
                      </Badge>
                      <span className="text-[10px] text-[#4F5D75]">{formatDate(note.created_at)}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-[#4F5D75] hover:text-red-600" onClick={() => handleDelete(note.id)} data-testid={`delete-note-${note.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-[#2D3142] whitespace-pre-wrap leading-relaxed line-clamp-4">{note.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
