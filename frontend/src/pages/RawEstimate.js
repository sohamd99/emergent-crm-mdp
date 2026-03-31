import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/helpers";

export default function RawEstimate({ data, onClose }) {
  const { customer, items, total, estimate_number, date, pax, subject } = data;

  const handlePrint = () => {
    const pw = window.open("", "_blank");
    pw.document.write(`<html><head><title>Estimate - ${estimate_number}</title>
      <style>
        body { font-family: 'Courier New', monospace; margin: 30px 40px; color: #222; font-size: 13px; line-height: 1.8; }
        h2 { text-align: center; font-size: 20px; letter-spacing: 4px; margin-bottom: 25px; border-bottom: 2px solid #222; padding-bottom: 10px; }
        .meta { margin-bottom: 20px; }
        .meta p { margin: 2px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px 12px; text-align: left; }
        th { border-bottom: 2px solid #222; font-weight: 700; }
        td { border-bottom: 1px solid #ddd; }
        .amount { text-align: right; font-weight: 500; }
        .total-row td { border-top: 2px solid #222; border-bottom: 2px solid #222; font-weight: 700; font-size: 15px; }
        .note { margin-top: 20px; font-size: 12px; color: #555; }
        @media print { body { margin: 20px; } }
      </style></head><body>${document.getElementById("raw-estimate-area")?.innerHTML || ""}</body></html>`);
    pw.document.close();
    pw.print();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4 no-print">
        <h2 className="text-lg font-bold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>Raw Estimate</h2>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="bg-[#81B29A] hover:bg-[#6fa388] text-white" data-testid="print-estimate-button">
            <Printer className="w-4 h-4 mr-2" /> Print / PDF
          </Button>
          {onClose && <Button variant="outline" onClick={onClose} className="border-[#E5E0DA]">Close</Button>}
        </div>
      </div>

      <div id="raw-estimate-area" className="bg-white border border-[#E5E0DA] rounded-lg p-8" style={{ fontFamily: "'Courier New', monospace", color: '#222', lineHeight: '1.8' }}>
        {/* Title */}
        <h2 className="text-center text-xl font-bold tracking-[4px] border-b-2 border-[#222] pb-3 mb-6">
          ESTIMATE
        </h2>

        {/* Meta */}
        <div className="flex justify-between mb-5">
          <div>
            <p className="text-sm"><span className="font-bold">Ref:</span> {estimate_number}</p>
            <p className="text-sm"><span className="font-bold">Date:</span> {formatDate(date)}</p>
          </div>
        </div>

        {/* To */}
        <div className="mb-4">
          <p className="text-sm"><span className="font-bold">To:</span> {customer?.name || "-"}</p>
          {customer?.city && <p className="text-sm pl-8">{customer.city}{customer?.state ? `, ${customer.state}` : ""}</p>}
        </div>

        {/* Subject */}
        {subject && (
          <p className="text-sm mb-4"><span className="font-bold">For:</span> {subject}</p>
        )}

        {/* PAX */}
        {pax > 0 && (
          <p className="text-sm mb-4"><span className="font-bold">PAX:</span> {pax} Nos.</p>
        )}

        {/* Items Table */}
        <table className="w-full mb-6" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="text-left py-2 border-b-2 border-[#222] text-xs w-10">Sr.</th>
              <th className="text-left py-2 border-b-2 border-[#222] text-xs">Description</th>
              <th className="text-right py-2 border-b-2 border-[#222] text-xs w-32">Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {(items || []).map((it, i) => (
              <tr key={i}>
                <td className="py-2 border-b border-[#eee] text-sm">{i + 1}.</td>
                <td className="py-2 border-b border-[#eee] text-sm">{it.product_name}{it.description ? ` - ${it.description}` : ""}</td>
                <td className="py-2 border-b border-[#eee] text-sm text-right font-mono">{formatCurrency(it.taxable_amount || it.quantity * it.rate)}</td>
              </tr>
            ))}
            <tr>
              <td className="py-3 border-t-2 border-b-2 border-[#222]" colSpan={2}>
                <span className="font-bold text-sm">Total</span>
              </td>
              <td className="py-3 border-t-2 border-b-2 border-[#222] text-right font-bold text-base font-mono">
                {formatCurrency(total || (items || []).reduce((s, it) => s + (it.taxable_amount || it.quantity * it.rate), 0))}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Note */}
        <p className="text-xs text-[#888] mt-4">* GST extra as applicable.</p>
        <p className="text-xs text-[#888]">* This is a rough estimate and subject to change.</p>
      </div>
    </div>
  );
}
