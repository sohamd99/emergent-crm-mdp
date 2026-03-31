#!/usr/bin/env python3
"""
BillFlow GST Billing App - Backend API Testing (Iteration 3)
Focus: Voice-to-text feature + existing functionality verification
"""

import requests
import sys
import json
import io
import wave
import struct
import tempfile
import os
from datetime import datetime

class BillFlowAPITester:
    def __init__(self, base_url="https://audio-notes-crm.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_endpoint(self, method, endpoint, expected_status=200, data=None, files=None, timeout=30):
        """Test a single endpoint"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=timeout)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)
            elif method == 'PATCH':
                response = requests.patch(url, headers=headers, timeout=timeout)
            
            success = response.status_code == expected_status
            return success, response.json() if success and response.content else {}, response.status_code
            
        except requests.exceptions.Timeout:
            return False, {"error": "Request timeout"}, 0
        except Exception as e:
            return False, {"error": str(e)}, 0

    def create_test_audio_file(self, duration_seconds=2, sample_rate=16000):
        """Create a test audio file for voice-to-text testing"""
        # Generate a simple sine wave audio file
        frames = []
        for i in range(int(duration_seconds * sample_rate)):
            # Generate a 440Hz sine wave (A note)
            value = int(32767 * 0.3 * (i % (sample_rate // 440)) / (sample_rate // 440))
            frames.append(struct.pack('<h', value))
        
        # Create temporary WAV file
        temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
        with wave.open(temp_file.name, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(b''.join(frames))
        
        return temp_file.name

    def test_dashboard(self):
        """Test dashboard endpoint"""
        success, data, status = self.test_endpoint('GET', 'dashboard')
        if success and 'stats' in data:
            self.log_test("Dashboard API", True)
            return True
        else:
            self.log_test("Dashboard API", False, f"Status: {status}")
            return False

    def test_customers_crud(self):
        """Test customers CRUD operations"""
        # Create customer
        customer_data = {
            "name": f"Test Customer {datetime.now().strftime('%H%M%S')}",
            "email": "test@example.com",
            "phone": "9876543210",
            "gstin": "27ABCDE1234F1Z5",
            "address": "Test Address",
            "city": "Mumbai",
            "state": "Maharashtra",
            "state_code": "27",
            "pincode": "400001"
        }
        
        success, data, status = self.test_endpoint('POST', 'customers', 200, customer_data)
        if success and 'id' in data:
            customer_id = data['id']
            self.log_test("Create Customer", True)
            
            # Get customers list
            success, data, status = self.test_endpoint('GET', 'customers')
            if success and isinstance(data, list):
                self.log_test("Get Customers List", True)
                return customer_id
            else:
                self.log_test("Get Customers List", False, f"Status: {status}")
                return None
        else:
            self.log_test("Create Customer", False, f"Status: {status}")
            return None

    def test_notes_crud(self):
        """Test notes CRUD operations"""
        # Create manual note
        note_data = {
            "content": f"Test note created at {datetime.now().isoformat()}",
            "source": "manual"
        }
        
        success, data, status = self.test_endpoint('POST', 'notes', 200, note_data)
        if success and 'id' in data:
            note_id = data['id']
            self.log_test("Create Manual Note", True)
            
            # Get notes list
            success, data, status = self.test_endpoint('GET', 'notes')
            if success and isinstance(data, list):
                self.log_test("Get Notes List", True)
                return note_id
            else:
                self.log_test("Get Notes List", False, f"Status: {status}")
                return None
        else:
            self.log_test("Create Manual Note", False, f"Status: {status}")
            return None

    def test_ai_parse_notes(self):
        """Test AI parse notes endpoint"""
        test_content = "Sharma ji needs 10 laptops at Rs.50000 each. Deliver to Pune office."
        
        success, data, status = self.test_endpoint('POST', 'ai/parse-notes', 200, {
            "content": test_content,
            "source": "ai"
        })
        
        if success and 'parsed' in data:
            parsed = data['parsed']
            if 'customer' in parsed and 'items' in parsed and 'actions' in parsed:
                self.log_test("AI Parse Notes", True)
                return data
            else:
                self.log_test("AI Parse Notes", False, "Missing required fields in parsed response")
                return None
        else:
            self.log_test("AI Parse Notes", False, f"Status: {status}")
            return None

    def test_voice_to_text(self):
        """Test the new voice-to-text endpoint"""
        print("\n🎤 Testing Voice-to-Text Feature...")
        
        # Test 1: Valid audio file
        audio_file_path = self.create_test_audio_file(duration_seconds=3)
        
        try:
            with open(audio_file_path, 'rb') as audio_file:
                files = {'file': ('test_audio.wav', audio_file, 'audio/wav')}
                success, data, status = self.test_endpoint('POST', 'ai/voice-to-text', 200, files=files, timeout=60)
                
                if success:
                    if 'success' in data and 'text' in data and 'language' in data:
                        self.log_test("Voice-to-Text Valid Audio", True, f"Response: {data}")
                    else:
                        self.log_test("Voice-to-Text Valid Audio", False, f"Missing fields in response: {data}")
                else:
                    self.log_test("Voice-to-Text Valid Audio", False, f"Status: {status}, Response: {data}")
        
        except Exception as e:
            self.log_test("Voice-to-Text Valid Audio", False, f"Exception: {str(e)}")
        
        finally:
            # Clean up temp file
            if os.path.exists(audio_file_path):
                os.unlink(audio_file_path)
        
        # Test 2: Short audio (OpenAI Whisper can handle short audio, so this is expected to work)
        short_audio_path = self.create_test_audio_file(duration_seconds=0.5)
        
        try:
            with open(short_audio_path, 'rb') as audio_file:
                files = {'file': ('short_audio.wav', audio_file, 'audio/wav')}
                success, data, status = self.test_endpoint('POST', 'ai/voice-to-text', 200, files=files, timeout=30)
                
                if success and 'success' in data:
                    self.log_test("Voice-to-Text Short Audio", True, f"Handled short audio: {data.get('text', '')[:50]}...")
                else:
                    self.log_test("Voice-to-Text Short Audio", False, f"Failed to process short audio: {data}")
        
        except Exception as e:
            self.log_test("Voice-to-Text Short Audio", False, f"Exception: {str(e)}")
        
        finally:
            # Clean up temp file
            if os.path.exists(short_audio_path):
                os.unlink(short_audio_path)
        
        # Test 3: Invalid file type (should handle gracefully)
        try:
            # Create a text file disguised as audio
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file.write(b"This is not audio data")
                temp_file.flush()
                
                with open(temp_file.name, 'rb') as fake_audio:
                    files = {'file': ('fake_audio.wav', fake_audio, 'audio/wav')}
                    success, data, status = self.test_endpoint('POST', 'ai/voice-to-text', 200, files=files, timeout=30)
                    
                    if success and 'success' in data and data['success'] == False:
                        self.log_test("Voice-to-Text Invalid File Error Handling", True, "Correctly handled invalid file")
                    else:
                        self.log_test("Voice-to-Text Invalid File Error Handling", False, f"Should have handled invalid file: {data}")
                
                os.unlink(temp_file.name)
        
        except Exception as e:
            self.log_test("Voice-to-Text Invalid File Error Handling", False, f"Exception: {str(e)}")

    def test_ai_execute_plan(self):
        """Test AI execute plan endpoint"""
        # Simple test plan
        test_plan = {
            "customer": {
                "existing_id": "",
                "name": "Test AI Customer",
                "phone": "9876543210",
                "email": "ai@test.com",
                "city": "Mumbai",
                "state": "Maharashtra"
            },
            "items": [
                {
                    "existing_id": "",
                    "product_name": "Test Product",
                    "quantity": 2,
                    "rate": 1000,
                    "gst_rate": 18,
                    "unit": "NOS",
                    "hsn_code": "1234"
                }
            ],
            "actions": ["invoice"],
            "supply_type": "intra",
            "due_date_days": 30,
            "notes": "Test AI execution",
            "terms": "Payment within 30 days"
        }
        
        success, data, status = self.test_endpoint('POST', 'ai/execute-plan', 200, test_plan)
        
        if success and 'created' in data:
            created_items = data['created']
            if len(created_items) > 0:
                self.log_test("AI Execute Plan", True, f"Created {len(created_items)} documents")
                return data
            else:
                self.log_test("AI Execute Plan", False, "No documents created")
                return None
        else:
            self.log_test("AI Execute Plan", False, f"Status: {status}")
            return None

    def run_comprehensive_test(self):
        """Run all tests"""
        print("🚀 Starting BillFlow Backend API Testing (Iteration 3)")
        print("=" * 60)
        
        # Test core functionality
        print("\n📊 Testing Core Functionality...")
        self.test_dashboard()
        customer_id = self.test_customers_crud()
        note_id = self.test_notes_crud()
        
        # Test AI features
        print("\n🤖 Testing AI Features...")
        ai_parse_result = self.test_ai_parse_notes()
        ai_execute_result = self.test_ai_execute_plan()
        
        # Test NEW voice-to-text feature
        self.test_voice_to_text()
        
        # Test other endpoints quickly
        print("\n🔍 Testing Other Endpoints...")
        
        # Products
        success, _, _ = self.test_endpoint('GET', 'products')
        self.log_test("Get Products", success)
        
        # Settings
        success, _, _ = self.test_endpoint('GET', 'settings')
        self.log_test("Get Settings", success)
        
        # Invoices
        success, _, _ = self.test_endpoint('GET', 'invoices')
        self.log_test("Get Invoices", success)
        
        # Quotations
        success, _, _ = self.test_endpoint('GET', 'quotations')
        self.log_test("Get Quotations", success)
        
        # Challans
        success, _, _ = self.test_endpoint('GET', 'challans')
        self.log_test("Get Challans", success)
        
        # E-way Bills
        success, _, _ = self.test_endpoint('GET', 'eway-bills')
        self.log_test("Get E-way Bills", success)
        
        # Notifications
        success, _, _ = self.test_endpoint('GET', 'notifications')
        self.log_test("Get Notifications", success)
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📈 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"🎯 Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check details above.")
            return 1

def main():
    tester = BillFlowAPITester()
    return tester.run_comprehensive_test()

if __name__ == "__main__":
    sys.exit(main())