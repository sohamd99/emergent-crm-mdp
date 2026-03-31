import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/utils/helpers";

// Style variations - picked based on estimate ID hash
const STYLES = [
  { headerBg: "#D9E2F3", borderColor: "#B4C6E7", font: "Calibri, sans-serif", headerLabels: ["Sr No", "Particulars", "Amount"], totalLabel: "Total", numStyle: "num" },
  { headerBg: "#F3F3F3", borderColor: "#DADADA", font: "Arial, sans-serif", headerLabels: ["#", "Description", "Value (Rs.)"], totalLabel: "Grand Total", numStyle: "alpha" },
  { headerBg: "#E2EFDA", borderColor: "#A9D18E", font: "Segoe UI, sans-serif", headerLabels: ["S.No", "Item Details", "Cost"], totalLabel: "Net Amount", numStyle: "padded" },
  { headerBg: "#FCE4D6", borderColor: "#F4B183", font: "Verdana, sans-serif", headerLabels: ["No.", "Details", "Amt."], totalLabel: "Sum Total", numStyle: "roman" },
  { headerBg: "#D6DCE4", borderColor: "#9DA5B0", font: "Tahoma, sans-serif", headerLabels: ["Sl", "Line Item", "Rate (Rs.)"], totalLabel: "TOTAL", numStyle: "dash" },
];

const DATE_FORMATS = [
  (d) => { const p = d.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; },
  (d) => { const p = d.split("-"); return `${p[2]}-${p[1]}-${p[0]}`; },
  (d) => { const dt = new Date(d); const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${dt.getDate()} ${m[dt.getMonth()]} ${dt.getFullYear()}`; },
  (d) => { const dt = new Date(d); const m = ["January","February","March","April","May","June","July","August","September","October","November","December"]; return `${m[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; },
  (d) => { const p = d.split("-"); return `${p[2]}.${p[1]}.${p[0]}`; },
];

const PAX_LABELS = ["PAX", "No. of Persons", "Heads", "Pax Count", "Attendees"];
const FOR_LABELS = ["Re", "Subject", "For", "Regarding", "Event"];
const NOTE_LINES = [
  ["* Taxes extra as applicable", "* Subject to final confirmation"],
  ["* GST additional", "* Rates may vary"],
  ["* Plus applicable taxes", "* Terms subject to discussion"],
  ["* Tax not included", "* Valid for 7 days"],
  ["* Exclusive of GST", "* Approximate figures"],
];

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getRowNum(idx, style) {
  const n = idx + 1;
  if (style === "alpha") return String.fromCharCode(96 + n);
  if (style === "padded") return String(n).padStart(2, "0");
  if (style === "roman") { const r = ["i","ii","iii","iv","v","vi","vii","viii","ix","x"]; return r[idx] || String(n); }
  if (style === "dash") return `${n})`;
  return String(n);
}

export default function RawEstimate({ data, onClose }) {
  const { customer, items, total, estimate_number, date, pax, subject } = data;
  const seed = hashCode(estimate_number || "est");
  const style = STYLES[seed % STYLES.length];
  const dateFmt = DATE_FORMATS[seed % DATE_FORMATS.length];
  const paxLabel = PAX_LABELS[seed % PAX_LABELS.length];
  const forLabel = FOR_LABELS[seed % FOR_LABELS.length];
  const noteLines = NOTE_LINES[seed % NOTE_LINES.length];

  const formattedDate = date ? dateFmt(date) : "-";
  const calcTotal = (items || []).reduce((s, it) => s + (it.taxable_amount || (it.quantity || 1) * (it.rate || 0)), 0);

  const handlePrint = () => {
    const pw = window.open("", "_blank");
    pw.document.write(`<html><head><title>${estimate_number}</title>
      <style>
        body { font-family: ${style.font}; margin: 25px; color: #222; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid ${style.borderColor}; padding: 7px 10px; }
        th { background: ${style.headerBg}; font-weight: 600; font-size: 11px; }
        .r { text-align: right; }
        .total td { font-weight: 700; background: ${style.headerBg}; }
        .meta { margin-bottom: 15px; font-size: 12px; }
        .meta td { border: none; padding: 2px 8px; }
        .note { margin-top: 12px; font-size: 10px; color: #888; }
        @media print { body { margin: 15px; } }
      </style></head><body>${document.getElementById("spreadsheet-estimate")?.innerHTML || ""}</body></html>`);
    pw.document.close();
    pw.print();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4 no-print">
        <h2 className="text-lg font-bold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>Estimate Preview</h2>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="bg-[#81B29A] hover:bg-[#6fa388] text-white" data-testid="print-estimate-button">
            <Printer className="w-4 h-4 mr-2" /> Print / PDF
          </Button>
          {onClose && <Button variant="outline" onClick={onClose} className="border-[#E5E0DA]">Close</Button>}
        </div>
      </div>

      <div id="spreadsheet-estimate" className="bg-white border border-[#ccc] rounded" style={{ fontFamily: style.font, color: '#222', fontSize: '12px' }}>
        {/* Spreadsheet-style header bar */}
        <div style={{ background: '#F0F0F0', borderBottom: `1px solid ${style.borderColor}`, padding: '4px 10px', fontSize: '10px', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
          <span>{estimate_number}</span>
          <span>{formattedDate}</span>
        </div>

        <div style={{ padding: '16px' }}>
          {/* Meta info as simple cells */}
          <table style={{ width: '50%', marginBottom: '14px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ border: 'none', padding: '2px 0', fontWeight: 600, width: '80px', fontSize: '11px', color: '#555' }}>Date</td>
                <td style={{ border: 'none', padding: '2px 8px', fontSize: '12px' }}>{formattedDate}</td>
              </tr>
              <tr>
                <td style={{ border: 'none', padding: '2px 0', fontWeight: 600, fontSize: '11px', color: '#555' }}>To</td>
                <td style={{ border: 'none', padding: '2px 8px', fontSize: '12px' }}>{customer?.name || "-"}{customer?.city ? `, ${customer.city}` : ""}</td>
              </tr>
              {subject && (
                <tr>
                  <td style={{ border: 'none', padding: '2px 0', fontWeight: 600, fontSize: '11px', color: '#555' }}>{forLabel}</td>
                  <td style={{ border: 'none', padding: '2px 8px', fontSize: '12px' }}>{subject}</td>
                </tr>
              )}
              {pax > 0 && (
                <tr>
                  <td style={{ border: 'none', padding: '2px 0', fontWeight: 600, fontSize: '11px', color: '#555' }}>{paxLabel}</td>
                  <td style={{ border: 'none', padding: '2px 8px', fontSize: '12px' }}>{pax}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Main spreadsheet table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: `1px solid ${style.borderColor}`, background: style.headerBg, padding: '8px 10px', textAlign: 'center', fontWeight: 600, fontSize: '11px', width: '50px' }}>
                  {style.headerLabels[0]}
                </th>
                <th style={{ border: `1px solid ${style.borderColor}`, background: style.headerBg, padding: '8px 10px', textAlign: 'left', fontWeight: 600, fontSize: '11px' }}>
                  {style.headerLabels[1]}
                </th>
                <th style={{ border: `1px solid ${style.borderColor}`, background: style.headerBg, padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontSize: '11px', width: '140px' }}>
                  {style.headerLabels[2]}
                </th>
              </tr>
            </thead>
            <tbody>
              {(items || []).map((it, i) => (
                <tr key={i}>
                  <td style={{ border: `1px solid ${style.borderColor}`, padding: '7px 10px', textAlign: 'center', fontSize: '12px', color: '#555' }}>
                    {getRowNum(i, style.numStyle)}
                  </td>
                  <td style={{ border: `1px solid ${style.borderColor}`, padding: '7px 10px', fontSize: '12px' }}>
                    {it.product_name}{it.description ? ` - ${it.description}` : ""}
                  </td>
                  <td style={{ border: `1px solid ${style.borderColor}`, padding: '7px 10px', textAlign: 'right', fontSize: '12px', fontFamily: 'Consolas, monospace' }}>
                    {formatCurrency(it.taxable_amount || (it.quantity || 1) * (it.rate || 0))}
                  </td>
                </tr>
              ))}
              {/* Empty rows for spreadsheet feel */}
              {Array.from({ length: Math.max(0, 3 - (items || []).length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td style={{ border: `1px solid ${style.borderColor}`, padding: '7px 10px', color: '#ccc', textAlign: 'center', fontSize: '12px' }}>&nbsp;</td>
                  <td style={{ border: `1px solid ${style.borderColor}`, padding: '7px 10px' }}>&nbsp;</td>
                  <td style={{ border: `1px solid ${style.borderColor}`, padding: '7px 10px' }}>&nbsp;</td>
                </tr>
              ))}
              {/* Total row */}
              <tr>
                <td style={{ border: `1px solid ${style.borderColor}`, background: style.headerBg, padding: '8px 10px' }}></td>
                <td style={{ border: `1px solid ${style.borderColor}`, background: style.headerBg, padding: '8px 10px', fontWeight: 700, fontSize: '12px', textAlign: 'right' }}>
                  {style.totalLabel}
                </td>
                <td style={{ border: `1px solid ${style.borderColor}`, background: style.headerBg, padding: '8px 10px', fontWeight: 700, fontSize: '13px', textAlign: 'right', fontFamily: 'Consolas, monospace' }}>
                  {formatCurrency(total || calcTotal)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Notes - small, generic */}
          <div style={{ marginTop: '12px', fontSize: '10px', color: '#999' }}>
            {noteLines.map((line, i) => <p key={i} style={{ margin: '1px 0' }}>{line}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}
