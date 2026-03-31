import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/utils/helpers";

const DATE_FMTS = [
  (d) => { const p = d.split("-"); return `${p[2]}.${p[1]}.${p[0]}`; },
  (d) => { const p = d.split("-"); return `${p[2]}/${p[1]}/${p[0]}`; },
  (d) => { const p = d.split("-"); return `${p[2]}-${p[1]}-${p[0]}`; },
  (d) => { const dt = new Date(d); const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; return `${dt.getDate()} ${m[dt.getMonth()]} ${dt.getFullYear()}`; },
];
const TOTAL_LABELS = ["TOTAL", "Total", "Grand Total", "NET TOTAL", "Sum Total"];
const NOTES_SET = [
  ["* Taxes extra as applicable", "* Subject to final confirmation"],
  ["* GST additional as applicable", "* Rates may vary"],
  ["* Plus applicable taxes", "* Approximate figures"],
  ["* Tax not included above", "* Valid for 7 days"],
  ["* Exclusive of GST", "* Subject to change"],
];

function hash(s) { let h=0; for(let i=0;i<s.length;i++) h=((h<<5)-h+s.charCodeAt(i))|0; return Math.abs(h); }

export default function RawEstimate({ data, onClose }) {
  const { customer, items, total, estimate_number, date } = data;
  const h = hash(estimate_number || "x");
  const dateFn = DATE_FMTS[h % DATE_FMTS.length];
  const totalLabel = TOTAL_LABELS[h % TOTAL_LABELS.length];
  const notes = NOTES_SET[h % NOTES_SET.length];
  const fDate = date ? dateFn(date) : "";
  const fTotal = total || (items||[]).reduce((s,it)=>s+(it.taxable_amount||(it.quantity||1)*(it.rate||0)),0);

  const bdr = "1px solid #ACACAC";
  const rh = { border: bdr, background: "#F6F6F6", padding: "0 4px", textAlign: "center", fontSize: "11px", color: "#555", width: "32px", minWidth: "32px", fontFamily: "Calibri, sans-serif", height: "21px", verticalAlign: "middle" };
  const colH = { border: bdr, background: "#F6F6F6", padding: "0", textAlign: "center", fontSize: "11px", color: "#555", fontFamily: "Calibri, sans-serif", height: "21px", verticalAlign: "middle" };
  const dc = { border: bdr, background: "#fff", padding: "2px 6px", fontSize: "11px", fontFamily: "Calibri, sans-serif", height: "21px", verticalAlign: "middle", color: "#000" };
  const dcR = { ...dc, textAlign: "right" };
  const dcB = { ...dc, fontWeight: 700 };
  const dcBR = { ...dcR, fontWeight: 700 };
  const empty = { ...dc };

  const itemsList = items || [];
  let rn = 0;
  const R = () => { rn++; return rn; };

  const handlePrint = () => {
    const pw = window.open("", "_blank");
    pw.document.write(`<html><head><title>${estimate_number||"Estimate"}</title><style>
      body{margin:0;padding:0;font-family:Calibri,sans-serif;font-size:11px;color:#000}
      table{border-collapse:collapse;width:100%}
      td{border:1px solid #ACACAC;height:21px;padding:2px 6px;vertical-align:middle}
      .rh{background:#F6F6F6;text-align:center;color:#555;width:32px;padding:0 4px}
      .ch{background:#F6F6F6;text-align:center;color:#555}
      .r{text-align:right}.b{font-weight:700}
      .n{font-size:10px;color:#888;font-style:italic;border:none}
      @media print{@page{margin:6mm}body{margin:0}}
    </style></head><body>${document.getElementById("excel-est")?.innerHTML||""}</body></html>`);
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

      <div id="excel-est" style={{background:"#fff"}}>
        <table style={{borderCollapse:"collapse",width:"100%",fontFamily:"Calibri, sans-serif",fontSize:"11px",color:"#000"}}>
          {/* Column headers row */}
          <thead>
            <tr>
              <td style={{...colH, width:"32px"}}></td>
              <td style={{...colH, width:"70px"}}>A</td>
              <td style={{...colH}}>B</td>
              <td style={{...colH, width:"50px"}}>C</td>
              <td style={{...colH, width:"130px"}}>D</td>
            </tr>
          </thead>
          <tbody>
            {/* Row: Date */}
            <tr>
              <td style={rh}>{R()}</td>
              <td style={dcB}>Date</td>
              <td style={dc}>{fDate}</td>
              <td style={empty}>&nbsp;</td>
              <td style={empty}>&nbsp;</td>
            </tr>
            {/* Row: To */}
            <tr>
              <td style={rh}>{R()}</td>
              <td style={dcB}>To</td>
              <td style={dc}>{customer?.name||""}{customer?.city?`, ${customer.city}`:""}</td>
              <td style={empty}>&nbsp;</td>
              <td style={empty}>&nbsp;</td>
            </tr>
            {/* Blank separator */}
            <tr>
              <td style={rh}>{R()}</td>
              <td style={empty}>&nbsp;</td>
              <td style={empty}>&nbsp;</td>
              <td style={empty}>&nbsp;</td>
              <td style={empty}>&nbsp;</td>
            </tr>
            {/* Table header */}
            <tr>
              <td style={rh}>{R()}</td>
              <td style={dcB}>Sr</td>
              <td style={dcB}>Particulars</td>
              <td style={empty}>&nbsp;</td>
              <td style={dcBR}>Amount (Rs.)</td>
            </tr>
            {/* Items */}
            {itemsList.map((it, i) => (
              <tr key={i}>
                <td style={rh}>{R()}</td>
                <td style={{...dc, textAlign:"center"}}>{i+1}</td>
                <td style={dc}>{it.product_name}{it.description?` - ${it.description}`:""}</td>
                <td style={empty}>&nbsp;</td>
                <td style={dcR}>{formatCurrency(it.taxable_amount||(it.quantity||1)*(it.rate||0))}</td>
              </tr>
            ))}
            {/* Total */}
            <tr>
              <td style={rh}>{R()}</td>
              <td style={empty}>&nbsp;</td>
              <td style={dcBR}>{totalLabel}</td>
              <td style={empty}>&nbsp;</td>
              <td style={dcBR}>{formatCurrency(fTotal)}</td>
            </tr>
            {/* Blank */}
            <tr>
              <td style={rh}>{R()}</td>
              <td style={empty}>&nbsp;</td>
              <td style={empty}>&nbsp;</td>
              <td style={empty}>&nbsp;</td>
              <td style={empty}>&nbsp;</td>
            </tr>
            {/* Notes */}
            {notes.map((n, i) => (
              <tr key={`n-${i}`}>
                <td style={rh}>{R()}</td>
                <td style={empty}>&nbsp;</td>
                <td style={{...dc, fontSize:"10px", color:"#888", fontStyle:"italic"}} colSpan={3}>{n}</td>
              </tr>
            ))}
            {/* Trailing empties */}
            {[0,1,2,3].map(i => (
              <tr key={`t-${i}`}>
                <td style={{...rh, color:"#ccc"}}>{R()}</td>
                <td style={empty}>&nbsp;</td>
                <td style={empty}>&nbsp;</td>
                <td style={empty}>&nbsp;</td>
                <td style={empty}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
