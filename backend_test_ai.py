#!/usr/bin/env python3

import requests
import json
import time
import sys
from datetime import datetime

class AIFeaturesTester:
    def __init__(self, base_url="https://audio-notes-crm.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
        
        self.results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def test_ai_parse_notes(self):
        """Test AI parse notes endpoint"""
        print("\n🔍 Testing AI Parse Notes Endpoint...")
        
        # Test data - rough business notes
        test_notes = "Sharma ji called, needs 50 laptops at Rs.45,000 each. Deliver to Pune office, vehicle MH12AB1234. Also send quotation for 100 monitors at Rs.12,000."
        
        try:
            url = f"{self.base_url}/api/ai/parse-notes"
            headers = {'Content-Type': 'application/json'}
            data = {"content": test_notes, "source": "ai"}
            
            print(f"Sending request to: {url}")
            print(f"Request data: {json.dumps(data, indent=2)}")
            
            # AI endpoint may take 5-10 seconds
            response = requests.post(url, json=data, headers=headers, timeout=30)
            
            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"Response data: {json.dumps(result, indent=2)}")
                
                # Validate response structure
                if "note_id" in result and "parsed" in result:
                    parsed = result["parsed"]
                    
                    # Check if AI parsed the data correctly
                    if "customer" in parsed and "items" in parsed and "actions" in parsed:
                        # Check customer extraction
                        customer = parsed.get("customer", {})
                        if customer.get("name"):
                            self.log_result("AI Parse Notes - Customer extraction", True, f"Extracted customer: {customer.get('name')}")
                        else:
                            self.log_result("AI Parse Notes - Customer extraction", False, "No customer name extracted")
                        
                        # Check items extraction
                        items = parsed.get("items", [])
                        if len(items) > 0:
                            self.log_result("AI Parse Notes - Items extraction", True, f"Extracted {len(items)} items")
                            for i, item in enumerate(items):
                                if item.get("product_name") and item.get("quantity") and item.get("rate"):
                                    self.log_result(f"AI Parse Notes - Item {i+1} details", True, f"{item.get('product_name')}: {item.get('quantity')} x Rs.{item.get('rate')}")
                                else:
                                    self.log_result(f"AI Parse Notes - Item {i+1} details", False, "Missing product details")
                        else:
                            self.log_result("AI Parse Notes - Items extraction", False, "No items extracted")
                        
                        # Check actions
                        actions = parsed.get("actions", [])
                        if len(actions) > 0:
                            self.log_result("AI Parse Notes - Actions extraction", True, f"Suggested actions: {', '.join(actions)}")
                        else:
                            self.log_result("AI Parse Notes - Actions extraction", False, "No actions suggested")
                        
                        # Check delivery details
                        delivery = parsed.get("delivery", {})
                        if delivery.get("vehicle_number"):
                            self.log_result("AI Parse Notes - Delivery extraction", True, f"Vehicle: {delivery.get('vehicle_number')}")
                        
                        # Overall success
                        self.log_result("AI Parse Notes - Overall", True, "AI successfully parsed the notes")
                        return result
                    else:
                        self.log_result("AI Parse Notes - Structure", False, "Missing required fields in parsed data")
                        return None
                else:
                    self.log_result("AI Parse Notes - Response format", False, "Invalid response format")
                    return None
            else:
                self.log_result("AI Parse Notes - HTTP Status", False, f"Status {response.status_code}: {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            self.log_result("AI Parse Notes - Timeout", False, "Request timed out (>30s)")
            return None
        except Exception as e:
            self.log_result("AI Parse Notes - Exception", False, str(e))
            return None

    def test_ai_execute_plan(self, parsed_plan=None):
        """Test AI execute plan endpoint"""
        print("\n🔍 Testing AI Execute Plan Endpoint...")
        
        # Use provided plan or create a test plan
        if not parsed_plan:
            parsed_plan = {
                "customer": {
                    "existing_id": "",
                    "name": "Test Customer AI",
                    "phone": "9876543210",
                    "email": "test@example.com",
                    "city": "Mumbai",
                    "state": "Maharashtra"
                },
                "items": [
                    {
                        "existing_id": "",
                        "product_name": "Test Laptop",
                        "quantity": 2,
                        "rate": 45000,
                        "gst_rate": 18,
                        "unit": "NOS",
                        "hsn_code": "8471"
                    }
                ],
                "delivery": {
                    "vehicle_number": "MH12AB1234",
                    "transport_mode": "Road",
                    "to_city": "Pune",
                    "to_state": "Maharashtra"
                },
                "actions": ["invoice", "quotation", "delivery_challan"],
                "supply_type": "intra",
                "notes": "Test AI execution",
                "terms": "Payment within 30 days"
            }
        
        try:
            url = f"{self.base_url}/api/ai/execute-plan"
            headers = {'Content-Type': 'application/json'}
            
            print(f"Sending request to: {url}")
            print(f"Request data: {json.dumps(parsed_plan, indent=2)}")
            
            response = requests.post(url, json=parsed_plan, headers=headers, timeout=30)
            
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"Response data: {json.dumps(result, indent=2)}")
                
                # Check if documents were created
                created = result.get("created", [])
                errors = result.get("errors", [])
                
                if len(created) > 0:
                    self.log_result("AI Execute Plan - Documents created", True, f"Created {len(created)} documents")
                    
                    # Check each created document
                    for doc in created:
                        doc_type = doc.get("type", "unknown")
                        doc_number = doc.get("number", "N/A")
                        doc_id = doc.get("id", "N/A")
                        
                        if doc_type and doc_number and doc_id:
                            self.log_result(f"AI Execute Plan - {doc_type.title()}", True, f"Created {doc_number} (ID: {doc_id})")
                        else:
                            self.log_result(f"AI Execute Plan - {doc_type.title()}", False, "Missing document details")
                    
                    self.log_result("AI Execute Plan - Overall", True, "Successfully executed AI plan")
                    return result
                else:
                    if len(errors) > 0:
                        self.log_result("AI Execute Plan - Errors", False, f"Errors: {', '.join(errors)}")
                    else:
                        self.log_result("AI Execute Plan - No documents", False, "No documents were created")
                    return None
            else:
                self.log_result("AI Execute Plan - HTTP Status", False, f"Status {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            self.log_result("AI Execute Plan - Exception", False, str(e))
            return None

    def test_dashboard_stats_update(self):
        """Test if dashboard stats are updated after AI creates documents"""
        print("\n🔍 Testing Dashboard Stats Update...")
        
        try:
            url = f"{self.base_url}/api/dashboard"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                stats = data.get("stats", {})
                
                # Check if stats contain expected fields
                expected_fields = ["total_customers", "total_invoices", "total_quotations", "total_challans", "total_eway_bills", "total_revenue"]
                
                for field in expected_fields:
                    if field in stats:
                        self.log_result(f"Dashboard Stats - {field}", True, f"Value: {stats[field]}")
                    else:
                        self.log_result(f"Dashboard Stats - {field}", False, "Field missing")
                
                # Check notifications
                notifications = data.get("notifications", [])
                if len(notifications) > 0:
                    self.log_result("Dashboard Stats - Notifications", True, f"Found {len(notifications)} notifications")
                    
                    # Check for AI-related notifications
                    ai_notifications = [n for n in notifications if "AI" in n.get("message", "")]
                    if len(ai_notifications) > 0:
                        self.log_result("Dashboard Stats - AI Notifications", True, f"Found {len(ai_notifications)} AI notifications")
                    else:
                        self.log_result("Dashboard Stats - AI Notifications", False, "No AI notifications found")
                else:
                    self.log_result("Dashboard Stats - Notifications", False, "No notifications found")
                
                self.log_result("Dashboard Stats - Overall", True, "Dashboard API working")
                return True
            else:
                self.log_result("Dashboard Stats - HTTP Status", False, f"Status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Dashboard Stats - Exception", False, str(e))
            return False

    def test_notes_history(self):
        """Test notes history endpoint"""
        print("\n🔍 Testing Notes History...")
        
        try:
            url = f"{self.base_url}/api/notes"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                notes = response.json()
                
                if isinstance(notes, list):
                    self.log_result("Notes History - Format", True, f"Retrieved {len(notes)} notes")
                    
                    # Check for AI notes
                    ai_notes = [n for n in notes if n.get("source") == "ai"]
                    manual_notes = [n for n in notes if n.get("source") == "manual"]
                    ocr_notes = [n for n in notes if n.get("source") == "ocr"]
                    
                    self.log_result("Notes History - AI Notes", len(ai_notes) > 0, f"Found {len(ai_notes)} AI notes")
                    self.log_result("Notes History - Manual Notes", len(manual_notes) >= 0, f"Found {len(manual_notes)} manual notes")
                    self.log_result("Notes History - OCR Notes", len(ocr_notes) >= 0, f"Found {len(ocr_notes)} OCR notes")
                    
                    # Check note structure
                    if len(notes) > 0:
                        sample_note = notes[0]
                        required_fields = ["id", "content", "source", "created_at"]
                        
                        for field in required_fields:
                            if field in sample_note:
                                self.log_result(f"Notes History - {field} field", True, "Present")
                            else:
                                self.log_result(f"Notes History - {field} field", False, "Missing")
                    
                    self.log_result("Notes History - Overall", True, "Notes API working")
                    return True
                else:
                    self.log_result("Notes History - Format", False, "Response is not a list")
                    return False
            else:
                self.log_result("Notes History - HTTP Status", False, f"Status {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Notes History - Exception", False, str(e))
            return False

    def run_all_tests(self):
        """Run all AI feature tests"""
        print("🚀 Starting AI Features Testing...")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test 1: AI Parse Notes
        parsed_result = self.test_ai_parse_notes()
        
        # Test 2: AI Execute Plan (use result from parse if available)
        if parsed_result and "parsed" in parsed_result:
            self.test_ai_execute_plan(parsed_result["parsed"])
        else:
            self.test_ai_execute_plan()
        
        # Test 3: Dashboard Stats
        self.test_dashboard_stats_update()
        
        # Test 4: Notes History
        self.test_notes_history()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All AI features are working correctly!")
            return 0
        else:
            print("⚠️  Some AI features need attention")
            return 1

def main():
    tester = AIFeaturesTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())