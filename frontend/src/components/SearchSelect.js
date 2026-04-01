import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function SearchSelect({ value, displayValue, onSelect, options, placeholder, minChars = 3, renderOption }) {
  const [query, setQuery] = useState(displayValue || "");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => { setQuery(displayValue || ""); }, [displayValue]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.length >= minChars
    ? options.filter(o => {
        const q = query.toLowerCase();
        return (o.name || "").toLowerCase().includes(q) ||
               (o.code || "").toLowerCase().includes(q) ||
               (o.phone || "").toLowerCase().includes(q) ||
               (o.sku || "").toLowerCase().includes(q) ||
               (o.hsn_code || "").toLowerCase().includes(q) ||
               (o.city || "").toLowerCase().includes(q);
      }).slice(0, 15)
    : [];

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4F5D75]" />
        <Input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { if (query.length >= minChars) setOpen(true); }}
          placeholder={placeholder || "Type 3+ chars to search..."}
          className="pl-8 bg-[#F9F8F6] border-[#E5E0DA] text-sm"
          data-testid="search-select-input"
        />
      </div>
      {open && query.length >= minChars && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-[#E5E0DA] rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.length > 0 ? filtered.map(o => (
            <div
              key={o.id}
              onClick={() => { onSelect(o); setQuery(o.name || o.label || ""); setOpen(false); }}
              className="px-3 py-2 hover:bg-[#F4F3F0] cursor-pointer text-sm flex items-center justify-between transition-colors"
              data-testid={`search-option-${o.id}`}
            >
              <div>
                <span className="font-medium text-[#2D3142]">{o.name || o.label}</span>
                {o.city && <span className="text-xs text-[#4F5D75] ml-1.5">- {o.city}</span>}
                {o.phone && <span className="text-xs text-[#4F5D75] ml-1.5">({o.phone})</span>}
              </div>
              <span className="text-[10px] font-mono text-[#D4A373] font-bold">{o.customer_code || o.sku || ""}</span>
            </div>
          )) : (
            <div className="px-3 py-3 text-xs text-[#4F5D75] text-center">
              No matches found for "{query}"
            </div>
          )}
        </div>
      )}
      {query.length > 0 && query.length < minChars && open && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-[#E5E0DA] rounded-lg shadow-lg px-3 py-2 text-xs text-[#4F5D75]">
          Type {minChars - query.length} more character{minChars - query.length > 1 ? "s" : ""} to search...
        </div>
      )}
    </div>
  );
}
