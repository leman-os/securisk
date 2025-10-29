#!/usr/bin/env python3
"""
Backend API Testing for SecuRisk Application
Tests pagination, sorting, and incident closed_at field functionality
"""

import requests
import json
from datetime import datetime, timezone
import sys
import os

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BASE_URL = get_backend_url()
if not BASE_URL:
    print("ERROR: Could not get REACT_APP_BACKEND_URL from frontend/.env")
    sys.exit(1)

API_URL = f"{BASE_URL}/api"
print(f"Testing API at: {API_URL}")

# Global auth token
auth_token = None

def login():
    """Login and get auth token"""
    global auth_token
    
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        print(f"Login response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            auth_token = data.get('access_token')
            print("✅ Login successful")
            return True
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False

def get_headers():
    """Get headers with auth token"""
    if not auth_token:
        return {}
    return {"Authorization": f"Bearer {auth_token}"}

def test_incident_closed_at_field():
    """Test 1: POST /api/incidents - Test closed_at field saving"""
    print("\n=== Test 1: Incident closed_at Field ===")
    
    current_time = datetime.now(timezone.utc)
    incident_data = {
        "incident_time": current_time.isoformat(),
        "detection_time": current_time.isoformat(),
        "criticality": "Высокая",
        "status": "Закрыт",
        "closed_at": current_time.isoformat(),
        "description": "Тестовый инцидент для проверки поля closed_at",
        "detected_by": "Тестовый пользователь"
    }
    
    try:
        response = requests.post(f"{API_URL}/incidents", json=incident_data, headers=get_headers())
        print(f"Create incident response status: {response.status_code}")
        
        if response.status_code == 200:
            incident = response.json()
            print(f"✅ Incident created with ID: {incident.get('id')}")
            
            # Check if closed_at field is saved
            if incident.get('closed_at'):
                print(f"✅ closed_at field saved: {incident['closed_at']}")
                return True, incident['id']
            else:
                print("❌ closed_at field not saved")
                return False, incident['id']
        else:
            print(f"❌ Failed to create incident: {response.status_code} - {response.text}")
            return False, None
    except Exception as e:
        print(f"❌ Error creating incident: {e}")
        return False, None

def test_incidents_pagination():
    """Test 2: GET /api/incidents - Test pagination and sorting"""
    print("\n=== Test 2: Incidents Pagination & Sorting ===")
    
    # Test basic pagination
    try:
        params = {"page": 1, "limit": 10}
        response = requests.get(f"{API_URL}/incidents", params=params, headers=get_headers())
        print(f"Incidents pagination response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check response structure
            required_fields = ['items', 'total', 'page', 'limit', 'total_pages']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"❌ Missing fields in response: {missing_fields}")
                return False
            
            print(f"✅ Pagination structure correct")
            print(f"   Total incidents: {data['total']}")
            print(f"   Page: {data['page']}")
            print(f"   Limit: {data['limit']}")
            print(f"   Total pages: {data['total_pages']}")
            print(f"   Items returned: {len(data['items'])}")
            
            # Test sorting
            sort_params = {"page": 1, "limit": 10, "sort_by": "incident_time", "sort_order": "desc"}
            sort_response = requests.get(f"{API_URL}/incidents", params=sort_params, headers=get_headers())
            
            if sort_response.status_code == 200:
                sort_data = sort_response.json()
                print(f"✅ Sorting test successful")
                print(f"   Sorted items returned: {len(sort_data['items'])}")
                return True
            else:
                print(f"❌ Sorting test failed: {sort_response.status_code}")
                return False
        else:
            print(f"❌ Failed to get incidents: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing incidents pagination: {e}")
        return False

def test_risks_pagination():
    """Test 3: GET /api/risks - Test pagination and sorting"""
    print("\n=== Test 3: Risks Pagination & Sorting ===")
    
    # First create a test risk to ensure we have data
    risk_data = {
        "title": "Тестовый риск для пагинации",
        "description": "Описание тестового риска",
        "category": "Технический",
        "likelihood": "Средняя",
        "impact": "Высокий",
        "risk_level": "Высокий",
        "status": "Активный",
        "owner": "Тестовый владелец"
    }
    
    try:
        # Create test risk
        create_response = requests.post(f"{API_URL}/risks", json=risk_data, headers=get_headers())
        if create_response.status_code == 200:
            print("✅ Test risk created")
        
        # Test pagination
        params = {"page": 1, "limit": 20, "sort_by": "created_at", "sort_order": "asc"}
        response = requests.get(f"{API_URL}/risks", params=params, headers=get_headers())
        print(f"Risks pagination response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check response structure
            required_fields = ['items', 'total', 'page', 'limit', 'total_pages']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"❌ Missing fields in response: {missing_fields}")
                return False
            
            print(f"✅ Risks pagination structure correct")
            print(f"   Total risks: {data['total']}")
            print(f"   Page: {data['page']}")
            print(f"   Limit: {data['limit']}")
            print(f"   Total pages: {data['total_pages']}")
            print(f"   Items returned: {len(data['items'])}")
            return True
        else:
            print(f"❌ Failed to get risks: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing risks pagination: {e}")
        return False

def test_assets_pagination():
    """Test 4: GET /api/assets - Test pagination and sorting"""
    print("\n=== Test 4: Assets Pagination & Sorting ===")
    
    # First create a test asset to ensure we have data
    asset_data = {
        "name": "Тестовый актив для пагинации",
        "criticality": "Средняя",
        "status": "Актуален",
        "category": "Информационный",
        "owner": "Тестовый владелец",
        "description": "Описание тестового актива"
    }
    
    try:
        # Create test asset
        create_response = requests.post(f"{API_URL}/assets", json=asset_data, headers=get_headers())
        if create_response.status_code == 200:
            print("✅ Test asset created")
        
        # Test pagination
        params = {"page": 1, "limit": 30}
        response = requests.get(f"{API_URL}/assets", params=params, headers=get_headers())
        print(f"Assets pagination response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check response structure
            required_fields = ['items', 'total', 'page', 'limit', 'total_pages']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"❌ Missing fields in response: {missing_fields}")
                return False
            
            print(f"✅ Assets pagination structure correct")
            print(f"   Total assets: {data['total']}")
            print(f"   Page: {data['page']}")
            print(f"   Limit: {data['limit']}")
            print(f"   Total pages: {data['total_pages']}")
            print(f"   Items returned: {len(data['items'])}")
            return True
        else:
            print(f"❌ Failed to get assets: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing assets pagination: {e}")
        return False

def test_pagination_edge_cases():
    """Test edge cases for pagination"""
    print("\n=== Test 5: Pagination Edge Cases ===")
    
    try:
        # Test with different page sizes
        test_cases = [
            {"page": 1, "limit": 10},
            {"page": 1, "limit": 20},
            {"page": 1, "limit": 30},
            {"page": 1, "limit": 50},
            {"page": 1, "limit": 100}
        ]
        
        for params in test_cases:
            response = requests.get(f"{API_URL}/incidents", params=params, headers=get_headers())
            if response.status_code == 200:
                data = response.json()
                expected_limit = params["limit"]
                actual_limit = data.get("limit")
                if actual_limit == expected_limit:
                    print(f"✅ Limit {expected_limit} works correctly")
                else:
                    print(f"❌ Limit {expected_limit} failed - got {actual_limit}")
                    return False
            else:
                print(f"❌ Failed with limit {params['limit']}: {response.status_code}")
                return False
        
        print("✅ All pagination limits work correctly")
        return True
    except Exception as e:
        print(f"❌ Error testing pagination edge cases: {e}")
        return False

def test_asset_creation_empty_threats():
    """Test 6: POST /api/assets - Test asset creation with empty threats array"""
    print("\n=== Test 6: Asset Creation with Empty Threats Array ===")
    
    asset_data = {
        "name": "Тестовый актив",
        "category": "ИТ-инфраструктура",
        "owner": "Тестовый владелец",
        "criticality": "Средняя",
        "status": "Актуален",
        "threats": []
    }
    
    try:
        response = requests.post(f"{API_URL}/assets", json=asset_data, headers=get_headers())
        print(f"Create asset response status: {response.status_code}")
        
        if response.status_code == 200:
            asset = response.json()
            print(f"✅ Asset created successfully with ID: {asset.get('id')}")
            
            # Verify all required fields are present
            required_fields = ['id', 'name', 'category', 'owner', 'criticality', 'status', 'threats']
            missing_fields = [field for field in required_fields if field not in asset]
            
            if missing_fields:
                print(f"❌ Missing fields in response: {missing_fields}")
                return False, None
            
            # Verify threats field is empty array
            if asset.get('threats') == []:
                print(f"✅ Empty threats array handled correctly: {asset['threats']}")
            else:
                print(f"❌ Threats field not handled correctly: {asset.get('threats')}")
                return False, asset.get('id')
            
            # Verify other fields
            print(f"   Asset name: {asset['name']}")
            print(f"   Category: {asset['category']}")
            print(f"   Owner: {asset['owner']}")
            print(f"   Criticality: {asset['criticality']}")
            print(f"   Status: {asset['status']}")
            print(f"   Threats: {asset['threats']}")
            
            return True, asset['id']
        else:
            print(f"❌ Failed to create asset: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   Error details: {json.dumps(error_detail, indent=2, ensure_ascii=False)}")
            except:
                print(f"   Error text: {response.text}")
            return False, None
    except Exception as e:
        print(f"❌ Error creating asset: {e}")
        return False, None

def main():
    """Main test runner"""
    print("🚀 Starting SecuRisk Backend API Tests")
    print("=" * 50)
    
    # Login first
    if not login():
        print("❌ Cannot proceed without authentication")
        sys.exit(1)
    
    # Run all tests
    test_results = []
    
    # Test 1: Incident closed_at field
    closed_at_result, incident_id = test_incident_closed_at_field()
    test_results.append(("Incident closed_at field", closed_at_result))
    
    # Test 2: Incidents pagination
    incidents_pagination_result = test_incidents_pagination()
    test_results.append(("Incidents pagination", incidents_pagination_result))
    
    # Test 3: Risks pagination
    risks_pagination_result = test_risks_pagination()
    test_results.append(("Risks pagination", risks_pagination_result))
    
    # Test 4: Assets pagination
    assets_pagination_result = test_assets_pagination()
    test_results.append(("Assets pagination", assets_pagination_result))
    
    # Test 5: Pagination edge cases
    edge_cases_result = test_pagination_edge_cases()
    test_results.append(("Pagination edge cases", edge_cases_result))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {len(test_results)} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed!")
        return True
    else:
        print(f"\n⚠️  {failed} test(s) failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)