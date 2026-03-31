from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# --- Pydantic Models ---

class CustomerCreate(BaseModel):
    name: str
    email: str = ""
    phone: str = ""
    gstin: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    state_code: str = ""
    pincode: str = ""

class ProductCreate(BaseModel):
    name: str
    hsn_code: str = ""
    unit: str = "NOS"
    rate: float = 0
    gst_rate: float = 18
    description: str = ""

class NoteCreate(BaseModel):
    content: str
    source: str = "manual"

class LineItem(BaseModel):
    product_name: str = ""
    description: str = ""
    hsn_code: str = ""
    quantity: float = 1
    unit: str = "NOS"
    rate: float = 0
    gst_rate: float = 18

class InvoiceCreate(BaseModel):
    customer_id: str
    date: str
    due_date: str = ""
    items: List[LineItem]
    supply_type: str = "intra"
    notes: str = ""
    terms: str = ""

class QuotationCreate(BaseModel):
    customer_id: str
    date: str
    valid_until: str = ""
    items: List[LineItem]
    supply_type: str = "intra"
    notes: str = ""
    terms: str = ""

class ChallanCreate(BaseModel):
    customer_id: str
    date: str
    invoice_id: str = ""
    items: List[LineItem]
    vehicle_number: str = ""
    transport_mode: str = "Road"
    notes: str = ""

class EwayBillCreate(BaseModel):
    invoice_id: str = ""
    from_place: str = ""
    from_state: str = ""
    from_pincode: str = ""
    to_place: str = ""
    to_state: str = ""
    to_pincode: str = ""
    vehicle_number: str = ""
    vehicle_type: str = "Regular"
    transport_mode: str = "Road"
    transporter_id: str = ""
    distance: float = 0

class CompanySettings(BaseModel):
    name: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    state_code: str = ""
    pincode: str = ""
    gstin: str = ""
    pan: str = ""
    phone: str = ""
    email: str = ""
    bank_name: str = ""
    account_number: str = ""
    ifsc_code: str = ""
    branch: str = ""

# --- Helpers ---

async def get_next_number(counter_type, prefix):
    result = await db.counters.find_one_and_update(
        {"type": counter_type},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=True
    )
    return f"{prefix}-{result['value']:04d}"

def calc_totals(items, supply_type):
    calculated = []
    subtotal = total_cgst = total_sgst = total_igst = 0
    for item in items:
        taxable = round(item.quantity * item.rate, 2)
        subtotal += taxable
        if supply_type == "intra":
            cgst = round(taxable * item.gst_rate / 200, 2)
            sgst = cgst
            igst = 0
        else:
            cgst = sgst = 0
            igst = round(taxable * item.gst_rate / 100, 2)
        total_cgst += cgst
        total_sgst += sgst
        total_igst += igst
        calculated.append({
            **item.model_dump(),
            "taxable_amount": taxable,
            "cgst": cgst, "sgst": sgst, "igst": igst,
            "total": round(taxable + cgst + sgst + igst, 2)
        })
    grand = round(subtotal + total_cgst + total_sgst + total_igst, 2)
    return {
        "items": calculated,
        "subtotal": round(subtotal, 2),
        "total_cgst": round(total_cgst, 2),
        "total_sgst": round(total_sgst, 2),
        "total_igst": round(total_igst, 2),
        "round_off": round(round(grand) - grand, 2),
        "total": round(grand)
    }

def clean(doc):
    return {k: v for k, v in doc.items() if k != "_id"}

async def mock_whatsapp(notif_type, entity_type, entity_id, message, phone=""):
    doc = {
        "id": str(uuid.uuid4()),
        "type": notif_type, "entity_type": entity_type,
        "entity_id": entity_id, "message": message,
        "phone": phone, "status": "sent", "channel": "whatsapp_mock",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(doc)

# --- Dashboard ---
@api_router.get("/dashboard")
async def get_dashboard():
    stats = {
        "total_customers": await db.customers.count_documents({}),
        "total_invoices": await db.invoices.count_documents({}),
        "total_quotations": await db.quotations.count_documents({}),
        "total_challans": await db.delivery_challans.count_documents({}),
        "total_eway_bills": await db.eway_bills.count_documents({}),
        "paid_invoices": await db.invoices.count_documents({"status": "paid"}),
        "pending_invoices": await db.invoices.count_documents({"status": {"$in": ["sent", "draft"]}}),
        "overdue_invoices": await db.invoices.count_documents({"status": "overdue"}),
    }
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    rev = await db.invoices.aggregate(pipeline).to_list(1)
    stats["total_revenue"] = rev[0]["total"] if rev else 0

    recent_invoices = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    recent_notes = await db.notes.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    notifications = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    return {"stats": stats, "recent_invoices": recent_invoices, "recent_notes": recent_notes, "notifications": notifications}

# --- Company Settings ---
@api_router.get("/settings")
async def get_settings():
    s = await db.settings.find_one({"type": "company"}, {"_id": 0})
    if not s:
        default = CompanySettings().model_dump()
        default["type"] = "company"
        await db.settings.insert_one(default)
        return clean(default)
    return s

@api_router.put("/settings")
async def update_settings(data: CompanySettings):
    upd = data.model_dump()
    upd["type"] = "company"
    await db.settings.update_one({"type": "company"}, {"$set": upd}, upsert=True)
    return await db.settings.find_one({"type": "company"}, {"_id": 0})

# --- Customers ---
@api_router.get("/customers")
async def get_customers():
    return await db.customers.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.get("/customers/{cid}")
async def get_customer(cid: str):
    c = await db.customers.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Customer not found")
    return c

@api_router.post("/customers")
async def create_customer(data: CustomerCreate):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.customers.insert_one(doc)
    return clean(doc)

@api_router.put("/customers/{cid}")
async def update_customer(cid: str, data: CustomerCreate):
    await db.customers.update_one({"id": cid}, {"$set": data.model_dump()})
    return await db.customers.find_one({"id": cid}, {"_id": 0})

@api_router.delete("/customers/{cid}")
async def delete_customer(cid: str):
    await db.customers.delete_one({"id": cid})
    return {"message": "Deleted"}

# --- Products ---
@api_router.get("/products")
async def get_products():
    return await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.post("/products")
async def create_product(data: ProductCreate):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.products.insert_one(doc)
    return clean(doc)

@api_router.put("/products/{pid}")
async def update_product(pid: str, data: ProductCreate):
    await db.products.update_one({"id": pid}, {"$set": data.model_dump()})
    return await db.products.find_one({"id": pid}, {"_id": 0})

@api_router.delete("/products/{pid}")
async def delete_product(pid: str):
    await db.products.delete_one({"id": pid})
    return {"message": "Deleted"}

# --- Notes ---
@api_router.get("/notes")
async def get_notes():
    return await db.notes.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.post("/notes")
async def create_note(data: NoteCreate):
    doc = {"id": str(uuid.uuid4()), **data.model_dump(), "created_at": datetime.now(timezone.utc).isoformat()}
    await db.notes.insert_one(doc)
    await mock_whatsapp("note_created", "note", doc["id"], f"New note: {data.content[:60]}")
    return clean(doc)

@api_router.post("/notes/ocr")
async def ocr_note(file: UploadFile = File(...)):
    try:
        import pytesseract
        from PIL import Image
        contents = await file.read()
        img = Image.open(io.BytesIO(contents))
        text = pytesseract.image_to_string(img).strip()
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        text = f"(OCR processing failed: {str(e)})"
    if not text:
        text = "(No text could be extracted from image)"
    doc = {"id": str(uuid.uuid4()), "content": text, "source": "ocr", "filename": file.filename, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.notes.insert_one(doc)
    await mock_whatsapp("ocr_done", "note", doc["id"], f"OCR note: {text[:60]}")
    return clean(doc)

@api_router.put("/notes/{nid}")
async def update_note(nid: str, data: NoteCreate):
    await db.notes.update_one({"id": nid}, {"$set": {"content": data.content}})
    return await db.notes.find_one({"id": nid}, {"_id": 0})

@api_router.delete("/notes/{nid}")
async def delete_note(nid: str):
    await db.notes.delete_one({"id": nid})
    return {"message": "Deleted"}

# --- Invoices ---
@api_router.get("/invoices")
async def get_invoices():
    return await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.get("/invoices/{iid}")
async def get_invoice(iid: str):
    inv = await db.invoices.find_one({"id": iid}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    if inv.get("customer_id"):
        inv["customer"] = await db.customers.find_one({"id": inv["customer_id"]}, {"_id": 0})
    settings = await db.settings.find_one({"type": "company"}, {"_id": 0})
    inv["company"] = settings
    return inv

@api_router.post("/invoices")
async def create_invoice(data: InvoiceCreate):
    num = await get_next_number("invoice", "INV")
    totals = calc_totals(data.items, data.supply_type)
    doc = {
        "id": str(uuid.uuid4()), "invoice_number": num,
        "customer_id": data.customer_id, "date": data.date, "due_date": data.due_date,
        "supply_type": data.supply_type, **totals,
        "amount_paid": 0, "status": "draft",
        "notes": data.notes, "terms": data.terms,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invoices.insert_one(doc)
    c = await db.customers.find_one({"id": data.customer_id}, {"_id": 0})
    cname = c["name"] if c else "Customer"
    await mock_whatsapp("invoice_created", "invoice", doc["id"], f"Invoice {num} for {cname} - Rs.{totals['total']}")
    return clean(doc)

@api_router.put("/invoices/{iid}")
async def update_invoice(iid: str, data: InvoiceCreate):
    totals = calc_totals(data.items, data.supply_type)
    upd = {"customer_id": data.customer_id, "date": data.date, "due_date": data.due_date,
           "supply_type": data.supply_type, **totals, "notes": data.notes, "terms": data.terms}
    await db.invoices.update_one({"id": iid}, {"$set": upd})
    return await db.invoices.find_one({"id": iid}, {"_id": 0})

@api_router.patch("/invoices/{iid}/status")
async def update_invoice_status(iid: str, status: str = Query(...)):
    await db.invoices.update_one({"id": iid}, {"$set": {"status": status}})
    inv = await db.invoices.find_one({"id": iid}, {"_id": 0})
    await mock_whatsapp("status_change", "invoice", iid, f"Invoice {inv.get('invoice_number','')} status: {status}")
    return inv

@api_router.delete("/invoices/{iid}")
async def delete_invoice(iid: str):
    await db.invoices.delete_one({"id": iid})
    return {"message": "Deleted"}

# --- Quotations ---
@api_router.get("/quotations")
async def get_quotations():
    return await db.quotations.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.get("/quotations/{qid}")
async def get_quotation(qid: str):
    q = await db.quotations.find_one({"id": qid}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Quotation not found")
    if q.get("customer_id"):
        q["customer"] = await db.customers.find_one({"id": q["customer_id"]}, {"_id": 0})
    settings = await db.settings.find_one({"type": "company"}, {"_id": 0})
    q["company"] = settings
    return q

@api_router.post("/quotations")
async def create_quotation(data: QuotationCreate):
    num = await get_next_number("quotation", "QT")
    totals = calc_totals(data.items, data.supply_type)
    doc = {
        "id": str(uuid.uuid4()), "quote_number": num,
        "customer_id": data.customer_id, "date": data.date, "valid_until": data.valid_until,
        "supply_type": data.supply_type, **totals,
        "status": "draft", "notes": data.notes, "terms": data.terms,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.quotations.insert_one(doc)
    c = await db.customers.find_one({"id": data.customer_id}, {"_id": 0})
    cname = c["name"] if c else "Customer"
    await mock_whatsapp("quotation_created", "quotation", doc["id"], f"Quotation {num} for {cname} - Rs.{totals['total']}")
    return clean(doc)

@api_router.put("/quotations/{qid}")
async def update_quotation(qid: str, data: QuotationCreate):
    totals = calc_totals(data.items, data.supply_type)
    upd = {"customer_id": data.customer_id, "date": data.date, "valid_until": data.valid_until,
           "supply_type": data.supply_type, **totals, "notes": data.notes, "terms": data.terms}
    await db.quotations.update_one({"id": qid}, {"$set": upd})
    return await db.quotations.find_one({"id": qid}, {"_id": 0})

@api_router.patch("/quotations/{qid}/status")
async def update_quotation_status(qid: str, status: str = Query(...)):
    await db.quotations.update_one({"id": qid}, {"$set": {"status": status}})
    q = await db.quotations.find_one({"id": qid}, {"_id": 0})
    await mock_whatsapp("status_change", "quotation", qid, f"Quotation {q.get('quote_number','')} status: {status}")
    return q

@api_router.delete("/quotations/{qid}")
async def delete_quotation(qid: str):
    await db.quotations.delete_one({"id": qid})
    return {"message": "Deleted"}

# --- Delivery Challans ---
@api_router.get("/challans")
async def get_challans():
    return await db.delivery_challans.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.get("/challans/{chid}")
async def get_challan(chid: str):
    ch = await db.delivery_challans.find_one({"id": chid}, {"_id": 0})
    if not ch:
        raise HTTPException(404, "Challan not found")
    if ch.get("customer_id"):
        ch["customer"] = await db.customers.find_one({"id": ch["customer_id"]}, {"_id": 0})
    return ch

@api_router.post("/challans")
async def create_challan(data: ChallanCreate):
    num = await get_next_number("challan", "DC")
    items_data = [{"product_name": i.product_name, "description": i.description, "hsn_code": i.hsn_code,
                   "quantity": i.quantity, "unit": i.unit, "rate": i.rate} for i in data.items]
    doc = {
        "id": str(uuid.uuid4()), "challan_number": num,
        "customer_id": data.customer_id, "date": data.date,
        "invoice_id": data.invoice_id, "items": items_data,
        "vehicle_number": data.vehicle_number, "transport_mode": data.transport_mode,
        "status": "pending", "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.delivery_challans.insert_one(doc)
    c = await db.customers.find_one({"id": data.customer_id}, {"_id": 0})
    cname = c["name"] if c else "Customer"
    await mock_whatsapp("challan_created", "challan", doc["id"], f"Delivery Challan {num} for {cname}")
    return clean(doc)

@api_router.patch("/challans/{chid}/status")
async def update_challan_status(chid: str, status: str = Query(...)):
    await db.delivery_challans.update_one({"id": chid}, {"$set": {"status": status}})
    ch = await db.delivery_challans.find_one({"id": chid}, {"_id": 0})
    await mock_whatsapp("status_change", "challan", chid, f"Challan {ch.get('challan_number','')} status: {status}")
    return ch

@api_router.delete("/challans/{chid}")
async def delete_challan(chid: str):
    await db.delivery_challans.delete_one({"id": chid})
    return {"message": "Deleted"}

# --- E-way Bills ---
@api_router.get("/eway-bills")
async def get_eway_bills():
    return await db.eway_bills.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.get("/eway-bills/prefill/{invoice_id}")
async def prefill_eway_bill(invoice_id: str):
    inv = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    customer = await db.customers.find_one({"id": inv.get("customer_id", "")}, {"_id": 0})
    settings = await db.settings.find_one({"type": "company"}, {"_id": 0})
    return {"invoice": inv, "customer": customer, "company": settings}

@api_router.post("/eway-bills")
async def create_eway_bill(data: EwayBillCreate):
    num = await get_next_number("eway_bill", "EWB")
    invoice = None
    if data.invoice_id:
        invoice = await db.invoices.find_one({"id": data.invoice_id}, {"_id": 0})
    doc = {
        "id": str(uuid.uuid4()), "eway_bill_number": num,
        "invoice_id": data.invoice_id,
        "invoice_number": invoice.get("invoice_number", "") if invoice else "",
        "invoice_total": invoice.get("total", 0) if invoice else 0,
        "from_place": data.from_place, "from_state": data.from_state, "from_pincode": data.from_pincode,
        "to_place": data.to_place, "to_state": data.to_state, "to_pincode": data.to_pincode,
        "vehicle_number": data.vehicle_number, "vehicle_type": data.vehicle_type,
        "transport_mode": data.transport_mode, "transporter_id": data.transporter_id,
        "distance": data.distance, "status": "active",
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.eway_bills.insert_one(doc)
    await mock_whatsapp("eway_created", "eway_bill", doc["id"], f"E-Way Bill {num} generated")
    return clean(doc)

@api_router.put("/eway-bills/{eid}")
async def update_eway_bill(eid: str, data: EwayBillCreate):
    upd = data.model_dump()
    await db.eway_bills.update_one({"id": eid}, {"$set": upd})
    return await db.eway_bills.find_one({"id": eid}, {"_id": 0})

@api_router.patch("/eway-bills/{eid}/status")
async def update_eway_status(eid: str, status: str = Query(...)):
    await db.eway_bills.update_one({"id": eid}, {"$set": {"status": status}})
    ewb = await db.eway_bills.find_one({"id": eid}, {"_id": 0})
    await mock_whatsapp("status_change", "eway_bill", eid, f"E-Way Bill {ewb.get('eway_bill_number','')} status: {status}")
    return ewb

@api_router.delete("/eway-bills/{eid}")
async def delete_eway_bill(eid: str):
    await db.eway_bills.delete_one({"id": eid})
    return {"message": "Deleted"}

# --- Notifications ---
@api_router.get("/notifications")
async def get_notifications():
    return await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)

# --- Setup ---
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
