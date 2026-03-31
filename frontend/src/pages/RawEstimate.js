import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/utils/helpers";

const STYLES = [
  { headerBg: "#D9E2F3", borderColor: "#8DB4E2", font: "Calibri, sans-serif", colA: "A", colB: "B", colC: "C", colD: "D", totalLabel: "Total", numStyle: "num" },
  { headerBg: "#E2EFDA", borderColor: "#A9D18E", font: "Arial, sans-serif", colA: "A", colB: "B", colC: "C", colD: "D", totalLabel: "Grand Total", numStyle: "padded" },
  { headerBg: "#FCE4D6", borderColor: "#F4B183", font: "Segoe UI, sans-serif", colA: "A", colB: "B", colC: "C", colD: "D", totalLabel: "Net Total", numStyle: "alpha" },
  { headerBg: "#D6DCE4", borderColor: "#9DA5B0", font: "Verdana, sans-serif", colA: "A", colB: "B", colC: "C", colD: "D", totalLabel: "TOTAL", numStyle: "dash" },
  { headerBg: "#DDEBF7", borderColor: "#5B9BD5", font: "Tahoma, sans-serif", colA: "A", colB: "B", colC: "C", colD: "D", totalLabel: "Sum", numStyle: "roman" },
];

const DATE_FORMATS = [
  (d) => { const p = d.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; },
  (d) => { const p = d.split("-"); return `${p[2]}-${p[1]}-${p[0]}`; },
  (d) => { const dt = new Date(d); const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${dt.getDate()} ${m[dt.getMonth()]} ${dt.getFullYear()}`; },
  (d) => { const p = d.split("-"); return `${p[2]}.${p[1]}.${p[0]}`; },
  (d) => { const dt = new Date(d); const m = ["January","February","March","April","May","June","July","August","September","October","November","December"]; return `${m[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`; },
];

const FOOTER_NOTES = [
  ["Taxes extra as applicable", "Subject to final confirmation"],
  ["GST additional", "Rates may vary"],
  ["Plus applicable taxes", "Terms subject to discussion"],
  ["Tax not included", "Valid for 7 days"],
  ["Exclusive of GST", "Approximate figures"],
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
  const s = STYLES[seed % STYLES.length];
  const dateFmt = DATE_FORMATS[seed % DATE_FORMATS.length];
  const notes = FOOTER_NOTES[seed % FOOTER_NOTES.length];
  const formattedDate = date ? dateFmt(date) : "-";
  const calcTotal = (items || []).reduce((sum, it) => sum + (it.taxable_amount || (it.quantity || 1) * (it.rate || 0)), 0);
  const finalTotal = total || calcTotal;

  const cell = { border: `1px solid ${s.borderColor}`, padding: '6px 10px', fontSize: '12px', verticalAlign: 'middle' };
  const hCell = { ...cell, background: s.headerBg, fontWeight: 700, fontSize: '11px', textAlign: 'center', color: '#333' };
  const colHead = { ...cell, background: '#F2F2F2', fontWeight: 600, fontSize: '10px', textAlign: 'center', color: '#666', padding: '3px 10px' };

  // Build all rows for full spreadsheet
  const metaRows = [];
  metaRows.push({ a: "Date", b: formattedDate });
  metaRows.push({ a: "To", b: `${customer?.name || "-"}${customer?.city ? ", " + customer.city : ""}` });
  if (subject) metaRows.push({ a: "Subject", b: subject });
  if (pax > 0) metaRows.push({ a: "PAX", b: String(pax) });
  metaRows.push({ a: "", b: "" }); // blank row separator

  const itemRows = (items || []).map((it, i) => ({
    num: getRowNum(i, s.numStyle),
    desc: it.product_name + (it.description ? ` - ${it.description}` : ""),
    amt: it.taxable_amount || (it.quantity || 1) * (it.rate || 0)
  }));

  // Row counter starting from 1
  let rowNum = 1;

  const handlePrint = () => {
    const pw = window.open("", "_blank");
    pw.document.write(`<html><head><title>${estimate_number}</title>
      <style>
        body { font-family: ${s.font}; margin: 0; padding: 0; color: #222; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid ${s.borderColor}; }
        @media print { body { margin: 0; } @page { margin: 8mm; } }
      </style></head><body>${document.getElementById("sheet-estimate")?.innerHTML || ""}</body></html>`);
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

      <div id="sheet-estimate" style={{ fontFamily: s.font, color: '#222', fontSize: '12px', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          {/* Column letter headers like Excel: blank | A | B | C */}
          <thead>
            <tr>
              <td style={{ ...colHead, width: '40px', background: '#E8E8E8' }}></td>
              <td style={{ ...colHead, width: '120px' }}>{s.colA}</td>
              <td style={{ ...colHead }}>{s.colB}</td>
              <td style={{ ...colHead, width: '150px' }}>{s.colC}</td>
            </tr>
          </thead>
          <tbody>
            {/* Meta rows: Date, To, Subject, PAX */}
            {metaRows.map((row, i) => {
              const rn = rowNum++;
              return (
                <tr key={`meta-${i}`}>
                  <td style={{ ...cell, background: '#F2F2F2', textAlign: 'center', fontWeight: 600, fontSize: '10px', color: '#888', width: '40px' }}>{rn}</td>
                  <td style={{ ...cell, fontWeight: row.a ? 600 : 400, color: row.a ? '#333' : '#ccc' }}>{row.a || ""}</td>
                  <td style={{ ...cell }}>{row.b || ""}</td>
                  <td style={{ ...cell }}></td>
                </tr>
              );
            })}

            {/* Table header row */}
            {(() => { const rn = rowNum++; return (
              <tr key="item-header">
                <td style={{ ...cell, background: '#F2F2F2', textAlign: 'center', fontWeight: 600, fontSize: '10px', color: '#888' }}>{rn}</td>
                <td style={{ ...hCell }}>Sr</td>
                <td style={{ ...hCell, textAlign: 'left' }}>Description</td>
                <td style={{ ...hCell, textAlign: 'right' }}>Amount</td>
              </tr>
            );})()}

            {/* Item rows */}
            {itemRows.map((row, i) => {
              const rn = rowNum++;
              return (
                <tr key={`item-${i}`}>
                  <td style={{ ...cell, background: '#F2F2F2', textAlign: 'center', fontWeight: 600, fontSize: '10px', color: '#888' }}>{rn}</td>
                  <td style={{ ...cell, textAlign: 'center', color: '#555' }}>{row.num}</td>
                  <td style={{ ...cell }}>{row.desc}</td>
                  <td style={{ ...cell, textAlign: 'right', fontFamily: 'Consolas, "Courier New", monospace' }}>{formatCurrency(row.amt)}</td>
                </tr>
              );
            })}

            {/* Empty rows for spreadsheet feel */}
            {Array.from({ length: Math.max(0, 2 - itemRows.length) }).map((_, i) => {
              const rn = rowNum++;
              return (
                <tr key={`empty-${i}`}>
                  <td style={{ ...cell, background: '#F2F2F2', textAlign: 'center', fontWeight: 600, fontSize: '10px', color: '#888' }}>{rn}</td>
                  <td style={{ ...cell, color: '#eee' }}>&nbsp;</td>
                  <td style={{ ...cell }}>&nbsp;</td>
                  <td style={{ ...cell }}>&nbsp;</td>
                </tr>
              );
            })}

            {/* Total row */}
            {(() => { const rn = rowNum++; return (
              <tr key="total">
                <td style={{ ...cell, background: '#F2F2F2', textAlign: 'center', fontWeight: 600, fontSize: '10px', color: '#888' }}>{rn}</td>
                <td style={{ ...cell, background: s.headerBg }}></td>
                <td style={{ ...cell, background: s.headerBg, fontWeight: 700, textAlign: 'right', fontSize: '12px' }}>{s.totalLabel}</td>
                <td style={{ ...cell, background: s.headerBg, fontWeight: 700, textAlign: 'right', fontSize: '13px', fontFamily: 'Consolas, "Courier New", monospace' }}>{formatCurrency(finalTotal)}</td>
              </tr>
            );})()}

            {/* Blank row */}
            {(() => { const rn = rowNum++; return (
              <tr key="blank">
                <td style={{ ...cell, background: '#F2F2F2', textAlign: 'center', fontWeight: 600, fontSize: '10px', color: '#888' }}>{rn}</td>
                <td style={{ ...cell }}></td>
                <td style={{ ...cell }}></td>
                <td style={{ ...cell }}></td>
              </tr>
            );})()}

            {/* Note rows */}
            {notes.map((note, i) => {
              const rn = rowNum++;
              return (
                <tr key={`note-${i}`}>
                  <td style={{ ...cell, background: '#F2F2F2', textAlign: 'center', fontWeight: 600, fontSize: '10px', color: '#888' }}>{rn}</td>
                  <td style={{ ...cell, fontSize: '10px', color: '#999' }}>*</td>
                  <td style={{ ...cell, fontSize: '10px', color: '#999', fontStyle: 'italic' }} colSpan={2}>{note}</td>
                </tr>
              );
            })}

            {/* Trailing empty rows */}
            {[0, 1, 2].map((i) => {
              const rn = rowNum++;
              return (
                <tr key={`trail-${i}`}>
                  <td style={{ ...cell, background: '#F2F2F2', textAlign: 'center', fontWeight: 600, fontSize: '10px', color: '#ccc' }}>{rn}</td>
                  <td style={{ ...cell }}>&nbsp;</td>
                  <td style={{ ...cell }}>&nbsp;</td>
                  <td style={{ ...cell }}>&nbsp;</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
