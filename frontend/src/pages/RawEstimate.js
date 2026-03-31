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
  const { customer, items, total, estimate_number, date, pax, subject } = data;
  const h = hash(estimate_number || "x");
  const dateFn = DATE_FMTS[h % DATE_FMTS.length];
  const totalLabel = TOTAL_LABELS[h % TOTAL_LABELS.length];
  const notes = NOTES_SET[h % NOTES_SET.length];
  const fDate = date ? dateFn(date) : "";
  const fTotal = total || (items||[]).reduce((s,it)=>s+(it.taxable_amount||(it.quantity||1)*(it.rate||0)),0);

  // Exact border helpers
  const bm = "1.5px solid #000"; // medium
  const bt = "1px solid #000";   // thin

  const printCSS = `
    body{margin:20px 30px;font-family:Arial,sans-serif;font-size:10pt;color:#000}
    table{border-collapse:collapse;width:100%}
    .bm{border:1.5px solid #000}.bt{border:1px solid #000}
    .bl-m{border-left:1.5px solid #000}.br-m{border-right:1.5px solid #000}
    .bt-m{border-top:1.5px solid #000}.bb-m{border-bottom:1.5px solid #000}
    .bl-t{border-left:1px solid #000}.br-t{border-right:1px solid #000}
    .bt-t{border-top:1px solid #000}.bb-t{border-bottom:1px solid #000}
    .b{font-weight:700}.r{text-align:right}.c{text-align:center}.l{text-align:left}
    td{padding:4px 6px;font-size:10pt;vertical-align:middle}
    .note{font-size:9pt;color:#333;padding:3px 6px}
    @media print{@page{margin:10mm}body{margin:0}}
  `;

  const handlePrint = () => {
    const pw = window.open("", "_blank");
    pw.document.write(`<html><head><title>${estimate_number||"Estimate"}</title><style>${printCSS}</style></head><body>${document.getElementById("excel-est")?.innerHTML||""}</body></html>`);
    pw.document.close();
    pw.print();
  };

  const itemsList = items || [];

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
        <table style={{borderCollapse:"collapse",fontFamily:"Arial, sans-serif",fontSize:"10pt",color:"#000",width:"100%"}}>
          <colgroup>
            <col style={{width:"40px"}} />
            <col style={{width:"260px"}} />
            <col style={{width:"160px"}} />
            <col style={{width:"150px"}} />
          </colgroup>
          <tbody>
            {/* Row 1: Date */}
            <tr>
              <td style={{borderTop:bm,borderBottom:bt,borderLeft:bm,borderRight:bt,fontWeight:700,padding:"5px 6px",fontSize:"10pt"}}>Date</td>
              <td colSpan={3} style={{borderTop:bm,borderBottom:bt,borderLeft:bt,borderRight:bm,padding:"5px 6px",fontSize:"10pt"}}>{fDate}</td>
            </tr>
            {/* Row 2: To */}
            <tr>
              <td style={{borderTop:bt,borderBottom:bt,borderLeft:bm,borderRight:bt,fontWeight:700,padding:"5px 6px",fontSize:"10pt"}}>To</td>
              <td colSpan={3} style={{borderTop:bt,borderBottom:bt,borderLeft:bt,borderRight:bm,padding:"5px 6px",fontSize:"10pt"}}>{customer?.name||""}{customer?.city?`, ${customer.city}`:""}</td>
            </tr>
            {/* Row 3: Subject */}
            <tr>
              <td style={{borderTop:bt,borderBottom:bt,borderLeft:bm,borderRight:bt,fontWeight:700,padding:"5px 6px",fontSize:"10pt"}}>Subject</td>
              <td colSpan={3} style={{borderTop:bt,borderBottom:bt,borderLeft:bt,borderRight:bm,padding:"5px 6px",fontSize:"10pt"}}>{subject||""}</td>
            </tr>
            {/* Row 4: PAX */}
            <tr>
              <td style={{borderTop:bt,borderBottom:bt,borderLeft:bm,borderRight:bt,fontWeight:700,padding:"5px 6px",fontSize:"10pt"}}>PAX</td>
              <td colSpan={3} style={{borderTop:bt,borderBottom:bt,borderLeft:bt,borderRight:bm,padding:"5px 6px",fontSize:"10pt"}}>{pax||""}</td>
            </tr>
            {/* Row 5: Empty */}
            <tr><td style={{height:"10px",border:"none"}} colSpan={4}></td></tr>
            {/* Row 6: Table Header */}
            <tr>
              <td style={{borderTop:bm,borderBottom:bm,borderLeft:bm,borderRight:bt,fontWeight:700,textAlign:"center",padding:"5px 6px",fontSize:"10pt"}}>Sr</td>
              <td style={{borderTop:bm,borderBottom:bm,borderLeft:bt,borderRight:bt,fontWeight:700,textAlign:"left",padding:"5px 6px",fontSize:"10pt"}}>Description</td>
              <td style={{borderTop:bm,borderBottom:bm,borderLeft:bt,borderRight:bt,padding:"5px 6px",fontSize:"10pt"}}></td>
              <td style={{borderTop:bm,borderBottom:bm,borderLeft:bt,borderRight:bm,fontWeight:700,textAlign:"right",padding:"5px 6px",fontSize:"10pt"}}>Amount (Rs.)</td>
            </tr>
            {/* Item Rows */}
            {itemsList.map((it, i) => {
              const isLast = i === itemsList.length - 1;
              const bbStyle = isLast ? bm : bt;
              return (
                <tr key={i}>
                  <td style={{borderTop:bt,borderBottom:bbStyle,borderLeft:bm,borderRight:bt,textAlign:"center",padding:"5px 6px",fontSize:"10pt"}}>{i+1}</td>
                  <td style={{borderTop:bt,borderBottom:bbStyle,borderLeft:bt,borderRight:bt,textAlign:"left",padding:"5px 6px",fontSize:"10pt"}}>{it.product_name}{it.description?` - ${it.description}`:""}</td>
                  <td style={{borderTop:bt,borderBottom:bbStyle,borderLeft:bt,borderRight:bt,padding:"5px 6px",fontSize:"10pt"}}></td>
                  <td style={{borderTop:bt,borderBottom:bbStyle,borderLeft:bt,borderRight:bm,textAlign:"right",padding:"5px 6px",fontSize:"10pt",fontFamily:"Arial, sans-serif"}}>{formatCurrency(it.taxable_amount||(it.quantity||1)*(it.rate||0))}</td>
                </tr>
              );
            })}
            {/* TOTAL Row (A:C merged) */}
            <tr>
              <td colSpan={3} style={{borderTop:bt,borderBottom:bm,borderLeft:bm,borderRight:bt,fontWeight:700,textAlign:"right",padding:"5px 6px",fontSize:"10pt"}}>{totalLabel}</td>
              <td style={{borderTop:bm,borderBottom:bm,borderLeft:bt,borderRight:bm,fontWeight:700,textAlign:"right",padding:"5px 6px",fontSize:"10pt",fontFamily:"Arial, sans-serif"}}>{formatCurrency(fTotal)}</td>
            </tr>
            {/* Empty row */}
            <tr><td style={{height:"10px",border:"none"}} colSpan={4}></td></tr>
            {/* Notes */}
            {notes.map((n, i) => (
              <tr key={`n-${i}`}>
                <td style={{border:"none"}}></td>
                <td colSpan={3} style={{border:"none",fontSize:"9pt",color:"#333",padding:"2px 6px"}}>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
