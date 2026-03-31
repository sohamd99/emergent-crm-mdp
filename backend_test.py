import requests
import sys
import json
from datetime import datetime

class BillFlowAPITester:
    def __init__(self, base_url="https://audio-notes-crm.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.text}")
                except:
                    pass

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_dashboard(self):
        """Test dashboard endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard",
            200
        )
        if success and 'stats' in response:
            print(f"   📊 Total customers: {response['stats'].get('total_customers', 0)}")
            print(f"   📊 Total invoices: {response['stats'].get('total_invoices', 0)}")
            print(f"   📊 Total revenue: Rs.{response['stats'].get('total_revenue', 0)}")
        return success

    def test_customers_crud(self):
        """Test customer CRUD operations"""
        # Create customer
        customer_data = {
            "name": "Test Customer API",
            "email": "test@example.com",
            "phone": "9876543210",
            "gstin": "22AAAAA0000A1Z5",
            "address": "Test Address",
            "city": "Mumbai",
            "state": "Maharashtra",
            "state_code": "27",
            "pincode": "400001"
        }
        
        success, response = self.run_test(
            "Create Customer",
            "POST",
            "customers",
            200,
            data=customer_data
        )
        
        if success and 'id' in response:
            customer_id = response['id']
            self.test_data['customer_id'] = customer_id
            print(f"   👤 Created customer: {customer_id}")
            
            # Get customers list
            success, _ = self.run_test(
                "Get Customers List",
                "GET",
                "customers",
                200
            )
            
            # Get specific customer
            success, _ = self.run_test(
                "Get Customer by ID",
                "GET",
                f"customers/{customer_id}",
                200
            )
            
            # Update customer
            updated_data = {**customer_data, "name": "Updated Test Customer"}
            success, _ = self.run_test(
                "Update Customer",
                "PUT",
                f"customers/{customer_id}",
                200,
                data=updated_data
            )
            
            return True
        return False

    def test_products_crud(self):
        """Test product CRUD operations"""
        product_data = {
            "name": "Test Laptop",
            "hsn_code": "8471",
            "unit": "NOS",
            "rate": 50000,
            "gst_rate": 18,
            "description": "High-end laptop for testing"
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        if success and 'id' in response:
            product_id = response['id']
            self.test_data['product_id'] = product_id
            print(f"   📦 Created product: {product_id}")
            
            # Get products list
            success, _ = self.run_test(
                "Get Products List",
                "GET",
                "products",
                200
            )
            
            # Update product
            updated_data = {**product_data, "rate": 55000}
            success, _ = self.run_test(
                "Update Product",
                "PUT",
                f"products/{product_id}",
                200,
                data=updated_data
            )
            
            return True
        return False

    def test_notes_crud(self):
        """Test notes CRUD operations"""
        note_data = {
            "content": "This is a test note from API testing",
            "source": "manual"
        }
        
        success, response = self.run_test(
            "Create Note",
            "POST",
            "notes",
            200,
            data=note_data
        )
        
        if success and 'id' in response:
            note_id = response['id']
            self.test_data['note_id'] = note_id
            print(f"   📝 Created note: {note_id}")
            
            # Get notes list
            success, _ = self.run_test(
                "Get Notes List",
                "GET",
                "notes",
                200
            )
            
            # Update note
            updated_data = {"content": "Updated test note content", "source": "manual"}
            success, _ = self.run_test(
                "Update Note",
                "PUT",
                f"notes/{note_id}",
                200,
                data=updated_data
            )
            
            return True
        return False

    def test_invoices_crud(self):
        """Test invoice CRUD operations"""
        if 'customer_id' not in self.test_data:
            print("❌ Cannot test invoices - no customer created")
            return False
            
        invoice_data = {
            "customer_id": self.test_data['customer_id'],
            "date": "2024-01-15",
            "due_date": "2024-02-15",
            "supply_type": "intra",
            "notes": "Test invoice notes",
            "terms": "Payment within 30 days",
            "items": [
                {
                    "product_name": "Test Product",
                    "description": "Test product description",
                    "hsn_code": "8471",
                    "quantity": 2,
                    "unit": "NOS",
                    "rate": 25000,
                    "gst_rate": 18
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Invoice",
            "POST",
            "invoices",
            200,
            data=invoice_data
        )
        
        if success and 'id' in response:
            invoice_id = response['id']
            self.test_data['invoice_id'] = invoice_id
            print(f"   🧾 Created invoice: {invoice_id}")
            print(f"   💰 Invoice total: Rs.{response.get('total', 0)}")
            
            # Get invoices list
            success, _ = self.run_test(
                "Get Invoices List",
                "GET",
                "invoices",
                200
            )
            
            # Get specific invoice with customer details
            success, _ = self.run_test(
                "Get Invoice by ID",
                "GET",
                f"invoices/{invoice_id}",
                200
            )
            
            # Update invoice status
            success, _ = self.run_test(
                "Update Invoice Status",
                "PATCH",
                f"invoices/{invoice_id}/status?status=paid",
                200
            )
            
            return True
        return False

    def test_quotations_crud(self):
        """Test quotation CRUD operations"""
        if 'customer_id' not in self.test_data:
            print("❌ Cannot test quotations - no customer created")
            return False
            
        quotation_data = {
            "customer_id": self.test_data['customer_id'],
            "date": "2024-01-15",
            "valid_until": "2024-02-15",
            "supply_type": "intra",
            "notes": "Test quotation notes",
            "terms": "Valid for 30 days",
            "items": [
                {
                    "product_name": "Test Service",
                    "description": "Test service description",
                    "hsn_code": "9983",
                    "quantity": 1,
                    "unit": "NOS",
                    "rate": 15000,
                    "gst_rate": 18
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Quotation",
            "POST",
            "quotations",
            200,
            data=quotation_data
        )
        
        if success and 'id' in response:
            quotation_id = response['id']
            self.test_data['quotation_id'] = quotation_id
            print(f"   📋 Created quotation: {quotation_id}")
            
            # Get quotations list
            success, _ = self.run_test(
                "Get Quotations List",
                "GET",
                "quotations",
                200
            )
            
            # Get specific quotation
            success, _ = self.run_test(
                "Get Quotation by ID",
                "GET",
                f"quotations/{quotation_id}",
                200
            )
            
            return True
        return False

    def test_delivery_challans(self):
        """Test delivery challan operations"""
        if 'customer_id' not in self.test_data:
            print("❌ Cannot test challans - no customer created")
            return False
            
        challan_data = {
            "customer_id": self.test_data['customer_id'],
            "date": "2024-01-15",
            "invoice_id": self.test_data.get('invoice_id', ''),
            "vehicle_number": "MH01AB1234",
            "transport_mode": "Road",
            "notes": "Test delivery challan",
            "items": [
                {
                    "product_name": "Test Item",
                    "description": "Test item for delivery",
                    "hsn_code": "8471",
                    "quantity": 1,
                    "unit": "NOS",
                    "rate": 10000
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Delivery Challan",
            "POST",
            "challans",
            200,
            data=challan_data
        )
        
        if success and 'id' in response:
            challan_id = response['id']
            self.test_data['challan_id'] = challan_id
            print(f"   🚛 Created challan: {challan_id}")
            
            # Get challans list
            success, _ = self.run_test(
                "Get Challans List",
                "GET",
                "challans",
                200
            )
            
            return True
        return False

    def test_eway_bills(self):
        """Test e-way bill operations"""
        if 'invoice_id' not in self.test_data:
            print("❌ Cannot test e-way bills - no invoice created")
            return False
            
        # Test prefill endpoint
        success, response = self.run_test(
            "E-way Bill Prefill",
            "GET",
            f"eway-bills/prefill/{self.test_data['invoice_id']}",
            200
        )
        
        eway_data = {
            "invoice_id": self.test_data['invoice_id'],
            "from_place": "Mumbai",
            "from_state": "Maharashtra",
            "from_pincode": "400001",
            "to_place": "Pune",
            "to_state": "Maharashtra",
            "to_pincode": "411001",
            "vehicle_number": "MH01AB1234",
            "vehicle_type": "Regular",
            "transport_mode": "Road",
            "transporter_id": "TRANS123",
            "distance": 150
        }
        
        success, response = self.run_test(
            "Create E-way Bill",
            "POST",
            "eway-bills",
            200,
            data=eway_data
        )
        
        if success and 'id' in response:
            eway_id = response['id']
            self.test_data['eway_id'] = eway_id
            print(f"   🛣️ Created e-way bill: {eway_id}")
            
            # Get e-way bills list
            success, _ = self.run_test(
                "Get E-way Bills List",
                "GET",
                "eway-bills",
                200
            )
            
            return True
        return False

    def test_notifications(self):
        """Test notifications endpoint"""
        success, response = self.run_test(
            "Get Notifications",
            "GET",
            "notifications",
            200
        )
        
        if success:
            print(f"   🔔 Found {len(response)} notifications")
        return success

    def test_settings(self):
        """Test company settings"""
        # Get settings
        success, response = self.run_test(
            "Get Company Settings",
            "GET",
            "settings",
            200
        )
        
        if success:
            # Update settings
            settings_data = {
                "name": "Test Company Ltd",
                "address": "123 Test Street",
                "city": "Mumbai",
                "state": "Maharashtra",
                "state_code": "27",
                "pincode": "400001",
                "gstin": "27AAAAA0000A1Z5",
                "pan": "AAAAA0000A",
                "phone": "022-12345678",
                "email": "info@testcompany.com",
                "bank_name": "Test Bank",
                "account_number": "1234567890",
                "ifsc_code": "TEST0001234",
                "branch": "Test Branch"
            }
            
            success, _ = self.run_test(
                "Update Company Settings",
                "PUT",
                "settings",
                200,
                data=settings_data
            )
            
        return success

    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete in reverse order of creation
        if 'eway_id' in self.test_data:
            self.run_test("Delete E-way Bill", "DELETE", f"eway-bills/{self.test_data['eway_id']}", 200)
        
        if 'challan_id' in self.test_data:
            self.run_test("Delete Challan", "DELETE", f"challans/{self.test_data['challan_id']}", 200)
            
        if 'quotation_id' in self.test_data:
            self.run_test("Delete Quotation", "DELETE", f"quotations/{self.test_data['quotation_id']}", 200)
            
        if 'invoice_id' in self.test_data:
            self.run_test("Delete Invoice", "DELETE", f"invoices/{self.test_data['invoice_id']}", 200)
            
        if 'note_id' in self.test_data:
            self.run_test("Delete Note", "DELETE", f"notes/{self.test_data['note_id']}", 200)
            
        if 'product_id' in self.test_data:
            self.run_test("Delete Product", "DELETE", f"products/{self.test_data['product_id']}", 200)
            
        if 'customer_id' in self.test_data:
            self.run_test("Delete Customer", "DELETE", f"customers/{self.test_data['customer_id']}", 200)

def main():
    print("🚀 Starting BillFlow API Testing...")
    print("=" * 50)
    
    tester = BillFlowAPITester()
    
    # Test all endpoints
    tests = [
        ("Dashboard", tester.test_dashboard),
        ("Company Settings", tester.test_settings),
        ("Customers CRUD", tester.test_customers_crud),
        ("Products CRUD", tester.test_products_crud),
        ("Notes CRUD", tester.test_notes_crud),
        ("Invoices CRUD", tester.test_invoices_crud),
        ("Quotations CRUD", tester.test_quotations_crud),
        ("Delivery Challans", tester.test_delivery_challans),
        ("E-way Bills", tester.test_eway_bills),
        ("Notifications", tester.test_notifications),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Cleanup
    tester.cleanup_test_data()
    
    # Print results
    print(f"\n{'='*50}")
    print(f"📊 FINAL RESULTS")
    print(f"{'='*50}")
    print(f"✅ Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"📈 Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed test categories:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n🎉 All test categories passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())