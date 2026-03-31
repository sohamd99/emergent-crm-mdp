import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatCurrency, formatDate, amountInWords } from "@/utils/helpers";

export default function InvoicePreview({ data, onClose, docType = "TAX INVOICE" }) {
  const { customer, company, items, subtotal, total_cgst, total_sgst, total_igst, round_off, total, invoice_number, quote_number, challan_number, date, due_date, valid_until, supply_type, notes, terms } = data;
  const docNumber = invoice_number || quote_number || challan_number || "-";

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<html><head><title>${docType} - ${docNumber}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 20px; color: #2D3142; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
        th { background: #f5f5f0; font-weight: 600; }
        .header { text-align: center; border-bottom: 2px solid #2D3142; padding-bottom: 10px; margin-bottom: 15px; }
        .total-row td { font-weight: 700; background: #f5f5f0; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .no-border td { border: none; }
        h2 { margin: 0; font-size: 18px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
        .meta-box { border: 1px solid #ccc; padding: 10px; border-radius: 4px; }
        .meta-box h4 { margin: 0 0 5px; font-size: 11px; text-transform: uppercase; color: #888; }
        .footer { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 15px; }
        .sig { text-align: right; margin-top: 60px; }
        @media print { body { margin: 10px; } }
      </style></head><body>${document.getElementById("invoice-print-area")?.innerHTML || ""}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4 no-print">
        <h2 className="text-lg font-bold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>{docType} Preview</h2>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="bg-[#81B29A] hover:bg-[#6fa388] text-white" data-testid="print-invoice-button">
            <Printer className="w-4 h-4 mr-2" /> Print / PDF
          </Button>
          {onClose && <Button variant="outline" onClick={onClose} className="border-[#E5E0DA]">Close</Button>}
        </div>
      </div>

      <div id="invoice-print-area" className="invoice-preview bg-white border border-[#E5E0DA] rounded-lg p-8">
        {/* Header */}
        <div className="text-center border-b-2 border-[#2D3142] pb-4 mb-4">
          <h2 className="text-xl font-bold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>{docType}</h2>
        </div>

        {/* Company Info */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-[#2D3142]">{company?.name || "Your Company Name"}</h3>
          <p className="text-xs text-[#4F5D75]">{company?.address || ""}{company?.city ? `, ${company.city}` : ""}{company?.state ? `, ${company.state}` : ""}{company?.pincode ? ` - ${company.pincode}` : ""}</p>
          {company?.gstin && <p className="text-xs font-semibold text-[#4F5D75] mt-1">GSTIN: {company.gstin}</p>}
          {company?.phone && <p className="text-xs text-[#4F5D75]">Phone: {company.phone} | Email: {company.email || ""}</p>}
        </div>

        {/* Doc Details + Customer */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-[#E5E0DA] rounded p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4A373] mb-1">{docType.includes("INVOICE") ? "Invoice" : docType.includes("QUOTATION") ? "Quotation" : "Document"} Details</p>
            <p className="text-sm"><span className="font-semibold">No:</span> {docNumber}</p>
            <p className="text-sm"><span className="font-semibold">Date:</span> {formatDate(date)}</p>
            {due_date && <p className="text-sm"><span className="font-semibold">Due:</span> {formatDate(due_date)}</p>}
            {valid_until && <p className="text-sm"><span className="font-semibold">Valid Until:</span> {formatDate(valid_until)}</p>}
            <p className="text-sm"><span className="font-semibold">Supply:</span> {supply_type === "intra" ? "Intra-State" : "Inter-State"}</p>
          </div>
          <div className="border border-[#E5E0DA] rounded p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4A373] mb-1">Bill To</p>
            <p className="text-sm font-semibold">{customer?.name || "-"}</p>
            <p className="text-xs text-[#4F5D75]">{customer?.address || ""}{customer?.city ? `, ${customer.city}` : ""}</p>
            <p className="text-xs text-[#4F5D75]">{customer?.state || ""}{customer?.pincode ? ` - ${customer.pincode}` : ""}</p>
            {customer?.gstin && <p className="text-xs font-semibold mt-1">GSTIN: {customer.gstin}</p>}
            {customer?.phone && <p className="text-xs text-[#4F5D75]">Ph: {customer.phone}</p>}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr className="bg-[#F4F3F0]">
              <th className="border border-[#E5E0DA] p-2 text-xs text-center w-8">Sr</th>
              <th className="border border-[#E5E0DA] p-2 text-xs">Description</th>
              <th className="border border-[#E5E0DA] p-2 text-xs text-center">HSN</th>
              <th className="border border-[#E5E0DA] p-2 text-xs text-center">Qty</th>
              <th className="border border-[#E5E0DA] p-2 text-xs text-center">Unit</th>
              <th className="border border-[#E5E0DA] p-2 text-xs text-right">Rate</th>
              <th className="border border-[#E5E0DA] p-2 text-xs text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(items || []).map((it, i) => (
              <tr key={i}>
                <td className="border border-[#E5E0DA] p-2 text-xs text-center">{i + 1}</td>
                <td className="border border-[#E5E0DA] p-2 text-xs font-medium">{it.product_name}{it.description ? ` - ${it.description}` : ""}</td>
                <td className="border border-[#E5E0DA] p-2 text-xs text-center font-mono">{it.hsn_code || "-"}</td>
                <td className="border border-[#E5E0DA] p-2 text-xs text-center">{it.quantity}</td>
                <td className="border border-[#E5E0DA] p-2 text-xs text-center">{it.unit}</td>
                <td className="border border-[#E5E0DA] p-2 text-xs text-right">{formatCurrency(it.rate)}</td>
                <td className="border border-[#E5E0DA] p-2 text-xs text-right font-medium">{formatCurrency(it.taxable_amount || (it.quantity * it.rate))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-4">
          <div className="w-72 border border-[#E5E0DA] rounded">
            <div className="flex justify-between p-2 text-sm border-b border-[#E5E0DA]">
              <span className="text-[#4F5D75]">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {supply_type === "intra" ? (
              <>
                <div className="flex justify-between p-2 text-sm border-b border-[#E5E0DA]">
                  <span className="text-[#4F5D75]">CGST</span>
                  <span>{formatCurrency(total_cgst)}</span>
                </div>
                <div className="flex justify-between p-2 text-sm border-b border-[#E5E0DA]">
                  <span className="text-[#4F5D75]">SGST</span>
                  <span>{formatCurrency(total_sgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between p-2 text-sm border-b border-[#E5E0DA]">
                <span className="text-[#4F5D75]">IGST</span>
                <span>{formatCurrency(total_igst)}</span>
              </div>
            )}
            {round_off !== 0 && (
              <div className="flex justify-between p-2 text-sm border-b border-[#E5E0DA]">
                <span className="text-[#4F5D75]">Round Off</span>
                <span>{round_off > 0 ? '+' : ''}{formatCurrency(round_off)}</span>
              </div>
            )}
            <div className="flex justify-between p-2 text-sm font-bold bg-[#F4F3F0]">
              <span className="text-[#2D3142]">TOTAL</span>
              <span className="text-[#E07A5F]">Rs. {formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="bg-[#F4F3F0] p-3 rounded text-sm mb-4">
          <span className="font-semibold text-[#2D3142]">Amount in words: </span>
          <span className="text-[#4F5D75]">{amountInWords(total)}</span>
        </div>

        {/* Bank Details */}
        {company?.bank_name && (
          <div className="border border-[#E5E0DA] rounded p-3 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#D4A373] mb-2">Bank Details</p>
            <div className="grid grid-cols-2 gap-1 text-xs text-[#4F5D75]">
              <p><span className="font-semibold">Bank:</span> {company.bank_name}</p>
              <p><span className="font-semibold">A/C No:</span> {company.account_number}</p>
              <p><span className="font-semibold">IFSC:</span> {company.ifsc_code}</p>
              <p><span className="font-semibold">Branch:</span> {company.branch}</p>
            </div>
          </div>
        )}

        {/* Terms & Notes */}
        {(notes || terms) && (
          <div className="border-t border-[#E5E0DA] pt-3 mb-4">
            {terms && <div className="mb-2"><p className="text-[10px] font-bold uppercase tracking-wider text-[#D4A373]">Terms & Conditions</p><p className="text-xs text-[#4F5D75] whitespace-pre-wrap">{terms}</p></div>}
            {notes && <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#D4A373]">Notes</p><p className="text-xs text-[#4F5D75] whitespace-pre-wrap">{notes}</p></div>}
          </div>
        )}

        {/* Signature */}
        <div className="flex justify-end mt-8">
          <div className="text-center">
            <p className="text-xs text-[#4F5D75] mb-8">For {company?.name || "Your Company"}</p>
            <div className="border-t border-[#2D3142] pt-2">
              <p className="text-xs font-semibold text-[#2D3142]">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
