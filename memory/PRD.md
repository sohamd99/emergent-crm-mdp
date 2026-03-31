# BillFlow - Business Management & GST Billing Suite

## Original Problem Statement
Create an app where the boss talks on call and the assistant feeds notes into the software (manual + OCR). The app supports: GST Invoicing (Tally format), Quotation, Delivery Challan, E-way Bill Generation/Deletion/Editing, Mock WhatsApp Reminders/Notifications, and future Payment Gateway.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Sonner toasts
- **Backend**: FastAPI (Python) + Motor (async MongoDB driver)
- **Database**: MongoDB
- **OCR**: pytesseract + Pillow (server-side Tesseract OCR)
- **Theme**: Light, Organic & Earthy (Terracotta + Moss Green)

## User Personas
1. **Boss**: Gives verbal instructions via phone call
2. **Assistant**: Enters notes (manual/OCR), creates invoices, quotations, challans, e-way bills

## Core Requirements (Static)
- Notes entry (manual + OCR scan)
- GST Invoice generation (Tally-style, CGST+SGST / IGST)
- Quotation generation
- Delivery Challan generation
- E-way Bill generation (one-click from invoice), editing, deletion
- Mock WhatsApp notifications on every status change
- Customer and Product catalog management
- Dashboard with business overview

## What's Been Implemented (Feb 2026)
- [x] Full backend with CRUD for all entities (customers, products, notes, invoices, quotations, challans, e-way bills)
- [x] OCR endpoint for image-to-text extraction
- [x] GST calculation engine (intra-state CGST+SGST, inter-state IGST)
- [x] Auto-numbering (INV-XXXX, QT-XXXX, DC-XXXX, EWB-XXXX)
- [x] Tally-style invoice preview with print/PDF
- [x] One-click e-way bill generation from invoice (prefill from invoice+customer+company)
- [x] Mock WhatsApp notifications (Sonner toasts + MongoDB storage)
- [x] Company settings management
- [x] Dashboard with stats, recent invoices, notifications feed
- [x] All frontend pages with full CRUD capabilities
- [x] Responsive sidebar navigation
- [x] **AI Command Center** (OpenAI GPT-4.1 via Emergent LLM key)
  - Rough notes → AI parsing → structured data extraction
  - Auto-creates/matches customers and products
  - One-click creation of Invoice + Quotation + Challan + E-Way Bill
  - Editable AI plan before execution
  - WhatsApp notifications at every step
- [x] 100% backend, frontend, and AI integration tests passing

## Prioritized Backlog
### P0 (Critical - Next Phase)
- Authentication (Passkeys, JWT) - user requested for 2nd update
- Custom invoice format (user will share final Tally format)

### P1 (High Priority)
- Payment Gateway integration
- Real WhatsApp API (Twilio) integration
- PDF file generation and download (currently uses browser print)
- WordPress/WooCommerce POS integration

### P2 (Medium Priority)
- Invoice email sending
- Inventory tracking
- Multi-user access control
- Recurring invoices
- Payment reminders automation

## Next Tasks
1. Implement authentication (passkeys + JWT)
2. Add custom invoice format per user's Tally template
3. Integrate real WhatsApp API (Twilio)
4. Add Payment Gateway (Stripe/Razorpay)
5. PDF generation (server-side)
