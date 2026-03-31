import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/utils/helpers";

const DATE_FMTS = [
  (d) => { const p = d.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; },
  (d) => { const p = d.split("-"); return `${p[2]}-${p[1]}-${p[0]}`; },
  (d) => { const dt = new Date(d); const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${dt.getDate()} ${m[dt.getMonth()]} ${dt.getFullYear()}`; },
  (d) => { const p = d.split("-"); return `${p[2]}.${p[1]}.${p[0]}`; },
];
const TOTAL_LABELS = ["Total", "Grand Total", "Net Total", "TOTAL", "Sum"];
const NUM_STYLES = [
  (i) => String(i + 1),
  (i) => String(i + 1).padStart(2, "0"),
  (i) => String.fromCharCode(97 + i),
  (i) => ["i","ii","iii","iv","v","vi","vii","viii","ix","x"][i] || String(i+1),
  (i) => `${i+1})`,
];
const NOTES = [
  ["Taxes extra as applicable","Subject to final confirmation"],
  ["GST additional","Rates may vary"],
  ["Plus applicable taxes","Approximate figures"],
  ["Tax not included","Valid for 7 days"],
  ["Exclusive of GST","Subject to change"],
];

function hash(s) { let h=0; for(let i=0;i<s.length;i++) h=((h<<5)-h+s.charCodeAt(i))|0; return Math.abs(h); }

export default function RawEstimate({ data, onClose }) {
  const { customer, items, total, estimate_number, date, pax, subject } = data;
  const h = hash(estimate_number || "x");
  const dateFn = DATE_FMTS[h % DATE_FMTS.length];
  const totalLabel = TOTAL_LABELS[h % TOTAL_LABELS.length];
  const numFn = NUM_STYLES[h % NUM_STYLES.length];
  const noteSet = NOTES[h % NOTES.length];
  const fDate = date ? dateFn(date) : "";
  const fTotal = total || (items||[]).reduce((s,it)=>s+(it.taxable_amount||(it.quantity||1)*(it.rate||0)),0);

  // Excel exact styles
  const bdr = "1px solid #D4D4D4";
  const rh = { borderRight: bdr, borderBottom: bdr, background: "#F6F6F6", padding: "0 4px", textAlign: "center", fontSize: "11px", color: "#555", width: "32px", minWidth: "32px", fontFamily: "Calibri, sans-serif", height: "21px", verticalAlign: "middle" };
  const ch = { borderRight: bdr, borderBottom: bdr, background: "#F6F6F6", padding: "0", textAlign: "center", fontSize: "11px", color: "#555", fontFamily: "Calibri, sans-serif", height: "21px", verticalAlign: "middle" };
  const dc = { borderRight: bdr, borderBottom: bdr, background: "#FFFFFF", padding: "1px 6px", fontSize: "11px", fontFamily: "Calibri, sans-serif", height: "21px", verticalAlign: "middle", color: "#000" };
  const dcR = { ...dc, textAlign: "right" };

  // Build rows
  const rows = [];
  rows.push(["Date", fDate, "", ""]);
  rows.push(["To", `${customer?.name||""}${customer?.city?", "+customer.city:""}`, "", ""]);
  if (subject) rows.push(["Subject", subject, "", ""]);
  if (pax > 0) rows.push(["PAX", String(pax), "", ""]);
  rows.push(["", "", "", ""]); // blank separator
  rows.push(["Sr", "Description", "", "Amount"]); // header row
  const headerIdx = rows.length - 1;
  (items||[]).forEach((it, i) => {
    rows.push([numFn(i), it.product_name+(it.description?` - ${it.description}`:""), "", formatCurrency(it.taxable_amount||(it.quantity||1)*(it.rate||0))]);
  });
  // pad to at least 3 item rows
  const padCount = Math.max(0, 3 - (items||[]).length);
  for (let i = 0; i < padCount; i++) rows.push(["","","",""]);
  const totalIdx = rows.length;
  rows.push(["", "", totalLabel, formatCurrency(fTotal)]); // total
  rows.push(["","","",""]); // blank
  noteSet.forEach(n => rows.push(["*", n, "", ""]));
  // trailing empties
  for (let i = 0; i < 4; i++) rows.push(["","","",""]);

  const handlePrint = () => {
    const pw = window.open("", "_blank");
    pw.document.write(`<html><head><title>${estimate_number||"Estimate"}</title><style>
      body{margin:0;padding:0;font-family:Calibri,sans-serif;font-size:11px;color:#000}
      table{border-collapse:collapse;width:100%}
      td{border-right:1px solid #D4D4D4;border-bottom:1px solid #D4D4D4;height:21px;padding:1px 6px;vertical-align:middle}
      .rh{background:#F6F6F6;text-align:center;color:#555;width:32px;padding:0 4px}
      .ch{background:#F6F6F6;text-align:center;color:#555}
      .r{text-align:right}
      .b{font-weight:600}
      .n{color:#888;font-size:10px;font-style:italic}
      @media print{@page{margin:6mm}body{margin:0}}
    </style></head><body>${document.getElementById("excel-estimate")?.innerHTML||""}</body></html>`);
    pw.document.close();
    pw.print();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4 no-print">
        <h2 className="text-lg font-bold text-[#2D3142]" style={{fontFamily:'Manrope,sans-serif'}}>Estimate</h2>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="bg-[#81B29A] hover:bg-[#6fa388] text-white" data-testid="print-estimate-button">
            <Printer className="w-4 h-4 mr-2" /> Print / PDF
          </Button>
          {onClose && <Button variant="outline" onClick={onClose} className="border-[#E5E0DA]">Close</Button>}
        </div>
      </div>

      <div id="excel-estimate" style={{background:"#fff"}}>
        <table style={{borderCollapse:"collapse",width:"100%",borderLeft:bdr,borderTop:bdr}}>
          {/* Column headers: [corner] A B C D */}
          <thead>
            <tr>
              <td style={{...rh,borderTop:"none",borderLeft:"none"}}></td>
              <td style={{...ch,width:"100px"}}>A</td>
              <td style={{...ch}}>B</td>
              <td style={{...ch,width:"50px"}}>C</td>
              <td style={{...ch,width:"130px"}}>D</td>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isHeader = i === headerIdx;
              const isTotal = i === totalIdx;
              const isNote = row[0] === "*";
              return (
                <tr key={i}>
                  <td style={rh}>{i + 1}</td>
                  <td style={{...dc, fontWeight: isHeader||isTotal?"600":"400", color: isNote?"#888":"#000", fontSize: isNote?"10px":"11px", fontStyle: isNote?"italic":"normal"}}>{row[0]}</td>
                  <td style={{...dc, fontWeight: isHeader?"600":"400", color: isNote?"#888":"#000", fontSize: isNote?"10px":"11px", fontStyle: isNote?"italic":"normal"}}>{row[1]}</td>
                  <td style={{...dcR, fontWeight: isTotal?"600":"400"}}>{row[2]}</td>
                  <td style={{...dcR, fontWeight: isHeader||isTotal?"600":"400"}}>{row[3]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
