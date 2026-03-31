import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, Users, FileCheck, Truck, Route, IndianRupee, Clock, AlertTriangle, MessageCircle } from "lucide-react";
import { formatCurrency, formatDate, getStatusColor } from "@/utils/helpers";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/dashboard`).then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-[#4F5D75]">Loading dashboard...</div>;
  if (!data) return <div className="p-8 text-center text-[#4F5D75]">Failed to load dashboard</div>;

  const { stats, recent_invoices, recent_notes, notifications } = data;

  const statCards = [
    { label: "Total Revenue", value: `Rs. ${formatCurrency(stats.total_revenue)}`, icon: IndianRupee, color: "text-[#E07A5F]", bg: "bg-[#E07A5F]/10" },
    { label: "Invoices", value: stats.total_invoices, icon: Receipt, color: "text-[#81B29A]", bg: "bg-[#81B29A]/10" },
    { label: "Customers", value: stats.total_customers, icon: Users, color: "text-[#D4A373]", bg: "bg-[#D4A373]/10" },
    { label: "Quotations", value: stats.total_quotations, icon: FileCheck, color: "text-[#4F5D75]", bg: "bg-[#4F5D75]/10" },
    { label: "Challans", value: stats.total_challans, icon: Truck, color: "text-[#81B29A]", bg: "bg-[#81B29A]/10" },
    { label: "E-Way Bills", value: stats.total_eway_bills, icon: Route, color: "text-[#E07A5F]", bg: "bg-[#E07A5F]/10" },
    { label: "Pending", value: stats.pending_invoices, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Overdue", value: stats.overdue_invoices, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="p-6 md:p-8 space-y-8 page-enter" data-testid="dashboard-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Dashboard
        </h1>
        <p className="text-sm text-[#4F5D75] mt-1">Business overview at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-grid">
        {statCards.map((s, i) => (
          <Card key={i} className="border-[#E5E0DA] hover:shadow-md hover:-translate-y-1 transition-all duration-300" style={{ animationDelay: `${i * 60}ms` }}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs font-medium text-[#4F5D75] uppercase tracking-wide">{s.label}</p>
                <p className="text-lg font-bold text-[#2D3142]">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <Card className="lg:col-span-2 border-[#E5E0DA]" data-testid="recent-invoices-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {recent_invoices.length === 0 ? (
              <p className="text-sm text-[#4F5D75] text-center py-6">No invoices yet</p>
            ) : (
              <div className="space-y-3">
                {recent_invoices.map((inv, i) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-[#F9F8F6] animate-row" style={{ animationDelay: `${i * 80}ms` }}>
                    <div>
                      <p className="text-sm font-semibold text-[#2D3142]">{inv.invoice_number}</p>
                      <p className="text-xs text-[#4F5D75]">{formatDate(inv.date)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${getStatusColor(inv.status)} text-xs font-bold rounded-full px-3 py-1 border-0`}>
                        {inv.status}
                      </Badge>
                      <span className="text-sm font-bold text-[#2D3142]">Rs. {formatCurrency(inv.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Notifications Feed */}
        <Card className="border-[#E5E0DA]" data-testid="notifications-feed">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-[#2D3142] flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              <MessageCircle className="w-5 h-5 text-[#25D366]" strokeWidth={1.5} />
              WhatsApp Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-[#4F5D75] text-center py-6">No notifications yet</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {notifications.map((n, i) => (
                  <div key={n.id} className="p-3 rounded-lg bg-[#f0fdf4] border-l-4 border-[#25D366] animate-row" style={{ animationDelay: `${i * 60}ms` }}>
                    <p className="text-xs font-medium text-[#2D3142]">{n.message}</p>
                    <p className="text-[10px] text-[#4F5D75] mt-1">{formatDate(n.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Notes */}
      {recent_notes.length > 0 && (
        <Card className="border-[#E5E0DA]" data-testid="recent-notes-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-[#2D3142]" style={{ fontFamily: 'Manrope, sans-serif' }}>Recent Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recent_notes.map((note, i) => (
                <div key={note.id} className="p-4 rounded-lg bg-[#F9F8F6] border border-[#E5E0DA] animate-row" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`text-[10px] font-bold rounded-full px-2 py-0.5 border-0 ${note.source === 'ocr' ? 'bg-[#81B29A]/20 text-[#81B29A]' : 'bg-[#D4A373]/20 text-[#D4A373]'}`}>
                      {note.source === 'ocr' ? 'OCR' : 'MANUAL'}
                    </Badge>
                    <span className="text-[10px] text-[#4F5D75]">{formatDate(note.created_at)}</span>
                  </div>
                  <p className="text-sm text-[#2D3142] line-clamp-3">{note.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
