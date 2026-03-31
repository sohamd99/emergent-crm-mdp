import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/helpers";

export default function MDPQuotation({ data, onClose }) {
  const { customer, company, items, total, quote_number, date, pax, subject } = data;

  const eventCost = items?.find(i => (i.product_name || "").toLowerCase().includes("event")) || items?.[0];
  const miscItem = items?.find(i => (i.product_name || "").toLowerCase().includes("miscel"));
  const serviceItem = items?.find(i => (i.product_name || "").toLowerCase().includes("service"));

  const eventAmount = eventCost ? (eventCost.taxable_amount || eventCost.quantity * eventCost.rate) : 0;
  const miscAmount = miscItem ? (miscItem.taxable_amount || miscItem.quantity * miscItem.rate) : 0;
  const serviceAmount = serviceItem ? (serviceItem.taxable_amount || serviceItem.quantity * serviceItem.rate) : 0;
  const grandTotal = eventAmount + miscAmount + serviceAmount;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<html><head><title>Quotation - ${quote_number}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 30px 40px; color: #1a1a2e; font-size: 13px; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid #1a1a2e; padding-bottom: 15px; margin-bottom: 25px; }
        .services-list { font-size: 11px; color: #555; }
        .services-list div { margin-bottom: 2px; }
        .company-right { text-align: right; }
        .company-name { font-size: 18px; font-weight: 700; color: #1a1a2e; letter-spacing: 1px; }
        .company-addr { font-size: 10px; color: #555; max-width: 320px; margin-top: 4px; }
        .company-contact { font-size: 11px; color: #333; margin-top: 4px; }
        .to-section { margin-bottom: 20px; }
        .to-label { font-weight: 600; }
        .date-line { float: right; font-weight: 500; }
        .subject { font-weight: 600; margin: 15px 0; font-size: 14px; }
        .intro { color: #555; margin-bottom: 15px; }
        .pax { font-weight: 600; margin-bottom: 15px; font-size: 14px; }
        .cost-table { width: 100%; margin: 20px 0; }
        .cost-table td { padding: 8px 0; }
        .cost-table .label { font-weight: 500; }
        .cost-table .amount { text-align: right; font-weight: 500; font-family: monospace; font-size: 14px; }
        .total-row td { border-top: 2px solid #1a1a2e; font-weight: 700; font-size: 15px; padding-top: 10px; }
        .note-section { margin-top: 25px; padding: 12px 0; border-top: 1px solid #ddd; }
        .note-title { font-weight: 700; margin-bottom: 5px; }
        .note-item { color: #555; margin-bottom: 3px; }
        .closing { margin-top: 30px; color: #555; }
        .signature { margin-top: 50px; }
        .sig-name { font-weight: 700; font-size: 14px; }
        .sig-company { font-weight: 600; font-size: 12px; color: #333; }
        .sig-city { font-size: 12px; color: #555; }
        @media print { body { padding: 20px 30px; } }
      </style></head><body>${document.getElementById("mdp-quotation-area")?.innerHTML || ""}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4 no-print">
        <h2 className="text-lg font-bold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>MDP Quotation Preview</h2>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="bg-[#81B29A] hover:bg-[#6fa388] text-white" data-testid="print-quotation-button">
            <Printer className="w-4 h-4 mr-2" /> Print / PDF
          </Button>
          {onClose && <Button variant="outline" onClick={onClose} className="border-[#E5E0DA]">Close</Button>}
        </div>
      </div>

      <div id="mdp-quotation-area" className="bg-white border border-[#E5E0DA] rounded-lg p-8" style={{ fontFamily: 'Inter, sans-serif', color: '#1a1a2e', lineHeight: '1.6' }}>
        {/* Header */}
        <div className="flex justify-between items-start border-b-[3px] border-[#1a1a2e] pb-4 mb-6">
          <div className="text-[11px] text-[#555]">
            <div className="flex items-center gap-1 mb-0.5"><span className="w-1.5 h-1.5 bg-[#1a1a2e] rounded-full inline-block"></span> All Kinds of Services</div>
            <div className="flex items-center gap-1 mb-0.5"><span className="w-1.5 h-1.5 bg-[#1a1a2e] rounded-full inline-block"></span> Corporate Promotional Items</div>
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#1a1a2e] rounded-full inline-block"></span> Gifts & Stationary</div>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-bold tracking-wider text-[#1a1a2e]" style={{ letterSpacing: '1px' }}>
              {company?.name || "MDP SERVICES & TRADE LINKS"}
            </h1>
            <p className="text-[10px] text-[#555] max-w-[320px] mt-1 text-right">
              {company?.address || "Ground Floor, C.S.N.631, Flat No.2, Muktai Apartment, Gaon Bhag, Visawa Chowk"}, {company?.city || "Sangli"} (MH) {company?.pincode || "416416"}.(INDIA)
            </p>
            <p className="text-[11px] text-[#333] mt-1">
              <span className="inline-block w-2.5 h-2.5 bg-[#1a1a2e] rounded-sm mr-1" style={{ fontSize: '8px' }}></span>
              {company?.phone || "+91 80 87 06 01"}
            </p>
            <p className="text-[11px] text-[#333]">{company?.email || "services.mdpsng@gmail.com"}</p>
          </div>
        </div>

        {/* To + Date */}
        <div className="mb-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-sm">To,</p>
              <p className="font-medium text-sm">{customer?.name || "-"},</p>
              <p className="text-sm text-[#555]">{customer?.address ? `${customer.address}, ` : ""}{customer?.city || ""}</p>
            </div>
            <div className="text-right">
              <p className="text-sm"><span className="font-semibold">Date:</span> {formatDate(date)}</p>
            </div>
          </div>
        </div>

        {/* Subject */}
        <p className="font-semibold text-sm mb-5">
          Sub: Quotation for {subject || "Event"}
        </p>

        {/* Intro */}
        <div className="text-sm text-[#555] mb-5">
          <p>As per our telephonic discussion,</p>
          <p>Enclosing herewith our best rates as follows:</p>
        </div>

        {/* PAX */}
        {pax > 0 && (
          <p className="font-semibold text-sm mb-5">
            PAX – {pax} Nos.
          </p>
        )}

        {/* Cost Table */}
        <table className="w-full mb-6">
          <tbody>
            <tr>
              <td className="py-2 text-sm font-medium w-2/3">Event Cost</td>
              <td className="py-2 text-sm font-medium text-right font-mono">{formatCurrency(eventAmount)}</td>
            </tr>
            {miscAmount > 0 && (
              <tr>
                <td className="py-2 text-sm font-medium">Miscellaneous</td>
                <td className="py-2 text-sm font-medium text-right font-mono">{formatCurrency(miscAmount)}</td>
              </tr>
            )}
            {serviceAmount > 0 && (
              <tr>
                <td className="py-2 text-sm font-medium">Service Charges</td>
                <td className="py-2 text-sm font-medium text-right font-mono">{formatCurrency(serviceAmount)}</td>
              </tr>
            )}
            <tr className="border-t-2 border-[#1a1a2e]">
              <td className="py-3 text-[15px] font-bold">Total</td>
              <td className="py-3 text-[15px] font-bold text-right font-mono">{formatCurrency(grandTotal || total)}</td>
            </tr>
          </tbody>
        </table>

        {/* Please Note */}
        <div className="border-t border-[#ddd] pt-4 mb-6">
          <p className="font-bold text-sm mb-2">Please Note:</p>
          <p className="text-sm text-[#555]">GST 18 % will be the additional.</p>
          <p className="text-sm text-[#555]">Payment: 30 Days from the date of Tax Invoice</p>
        </div>

        {/* Closing */}
        <div className="text-sm text-[#555] mb-12">
          <p>Awaiting your favourable reply</p>
          <p>With best regards</p>
        </div>

        {/* Signature */}
        <div>
          <p className="text-sm font-bold">PRACHI R</p>
          <p className="text-xs font-semibold text-[#333]">{company?.name || "MDP SERVICES & TRADE LINKS"}</p>
          <p className="text-xs text-[#555]">{company?.city?.toUpperCase() || "SANGLI"}</p>
        </div>
      </div>
    </div>
  );
}
