import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Trash2, FileText, Camera } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/utils/helpers";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const fetchNotes = () => axios.get(`${API}/notes`).then(r => setNotes(r.data)).catch(() => toast.error("Failed to load notes"));

  useEffect(() => { fetchNotes(); }, []);

  const handleSave = async () => {
    if (!content.trim()) return toast.error("Please enter some content");
    setSaving(true);
    try {
      await axios.post(`${API}/notes`, { content, source: "manual" });
      toast("WhatsApp Alert", { description: "New note has been saved", className: "whatsapp-toast" });
      setContent("");
      fetchNotes();
    } catch { toast.error("Failed to save note"); }
    finally { setSaving(false); }
  };

  const handleOCR = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post(`${API}/notes/ocr`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast("WhatsApp Alert", { description: `OCR extracted: ${res.data.content?.slice(0, 60)}...`, className: "whatsapp-toast" });
      fetchNotes();
    } catch { toast.error("OCR processing failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/notes/${id}`);
      toast.success("Note deleted");
      fetchNotes();
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 page-enter" data-testid="notes-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>Notes</h1>
        <p className="text-sm text-[#4F5D75] mt-1">Capture notes manually or via OCR scan</p>
      </div>

      {/* Input Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Entry */}
        <Card className="border-[#E5E0DA]" data-testid="manual-note-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#2D3142] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#D4A373]" strokeWidth={1.5} />
              Manual Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              data-testid="note-textarea"
              placeholder="Type your notes here... (e.g., boss's instructions from the call)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[180px] bg-[#F9F8F6] border-[#E5E0DA] focus:ring-2 focus:ring-[#81B29A] focus:border-[#81B29A] resize-none"
            />
            <Button
              data-testid="save-note-button"
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#E07A5F] hover:bg-[#C96D55] text-white font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Note"}
            </Button>
          </CardContent>
        </Card>

        {/* OCR Upload */}
        <Card className="border-[#E5E0DA]" data-testid="ocr-note-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#2D3142] flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#81B29A]" strokeWidth={1.5} />
              OCR Scan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-[#E5E0DA] rounded-xl p-8 text-center hover:border-[#81B29A] transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-10 h-10 text-[#4F5D75] mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[#2D3142] mb-1">
                {uploading ? "Processing image..." : "Click to upload image"}
              </p>
              <p className="text-xs text-[#4F5D75]">Supports JPG, PNG, BMP, TIFF</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleOCR}
                data-testid="ocr-file-input"
              />
            </div>
            {uploading && (
              <div className="mt-4 p-3 rounded-lg bg-[#81B29A]/10 text-sm text-[#81B29A] text-center font-medium">
                Extracting text from image...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes List */}
      <div>
        <h2 className="text-lg font-semibold text-[#2D3142] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
          All Notes ({notes.length})
        </h2>
        {notes.length === 0 ? (
          <Card className="border-[#E5E0DA]">
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 text-[#E5E0DA] mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-[#4F5D75]">No notes yet. Start by adding one above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note, i) => (
              <Card
                key={note.id}
                className="border-[#E5E0DA] hover:shadow-md hover:-translate-y-1 transition-all duration-300 animate-row"
                style={{ animationDelay: `${i * 60}ms` }}
                data-testid={`note-card-${note.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-[10px] font-bold rounded-full px-2 py-0.5 border-0 ${note.source === 'ocr' ? 'bg-[#81B29A]/20 text-[#81B29A]' : 'bg-[#D4A373]/20 text-[#D4A373]'}`}>
                        {note.source === 'ocr' ? 'OCR' : 'MANUAL'}
                      </Badge>
                      <span className="text-[10px] text-[#4F5D75]">{formatDate(note.created_at)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#4F5D75] hover:text-red-600"
                      onClick={() => handleDelete(note.id)}
                      data-testid={`delete-note-${note.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-sm text-[#2D3142] whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  {note.filename && <p className="text-[10px] text-[#4F5D75] mt-2">Source: {note.filename}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
