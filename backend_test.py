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

# ==================== NEW ENDPOINT TESTS ====================

def test_settings_asset_categories():
    """Test 7: Settings - asset_categories endpoints"""
    print("\n=== Test 7: Settings Asset Categories ===")
    
    try:
        # Test GET /api/settings - check asset_categories field
        print("Testing GET /api/settings...")
        response = requests.get(f"{API_URL}/settings", headers=get_headers())
        print(f"GET settings response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to get settings: {response.text}")
            return False
        
        settings = response.json()
        if 'asset_categories' not in settings:
            print("❌ asset_categories field not found in settings")
            return False
        
        print(f"✅ asset_categories found: {settings['asset_categories']}")
        
        # Test PUT /api/settings - update asset_categories
        print("Testing PUT /api/settings...")
        new_categories = ["Новая категория", "Тестовая категория", "Сервер"]
        update_data = {"asset_categories": new_categories}
        
        response = requests.put(f"{API_URL}/settings", json=update_data, headers=get_headers())
        print(f"PUT settings response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to update settings: {response.text}")
            return False
        
        updated_settings = response.json()
        if updated_settings.get('asset_categories') == new_categories:
            print(f"✅ asset_categories updated successfully: {updated_settings['asset_categories']}")
            return True
        else:
            print(f"❌ asset_categories not updated correctly: {updated_settings.get('asset_categories')}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing settings asset categories: {e}")
        return False

def test_user_management():
    """Test 8: User Management endpoints"""
    print("\n=== Test 8: User Management ===")
    
    try:
        # Test GET /api/users
        print("Testing GET /api/users...")
        response = requests.get(f"{API_URL}/users", headers=get_headers())
        print(f"GET users response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to get users: {response.text}")
            return False
        
        users = response.json()
        if not users:
            print("❌ No users found")
            return False
        
        # Find first non-admin user
        target_user = None
        for user in users:
            if user.get('role') != 'Администратор':
                target_user = user
                break
        
        if not target_user:
            print("❌ No non-admin user found for testing")
            return False
        
        user_id = target_user['id']
        print(f"✅ Found test user: {target_user['username']} (ID: {user_id})")
        
        # Test PUT /api/users/{user_id} - update user
        print("Testing PUT /api/users/{user_id}...")
        update_data = {
            "full_name": "Updated Test Name",
            "role": "Инженер ИБ"
        }
        
        response = requests.put(f"{API_URL}/users/{user_id}", json=update_data, headers=get_headers())
        print(f"PUT user response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to update user: {response.text}")
            return False
        
        updated_user = response.json()
        if (updated_user.get('full_name') == "Updated Test Name" and 
            updated_user.get('role') == "Инженер ИБ"):
            print(f"✅ User updated successfully: {updated_user['full_name']}, {updated_user['role']}")
        else:
            print(f"❌ User not updated correctly")
            return False
        
        # Test POST /api/users/{user_id}/change-password - admin changing user password
        print("Testing POST /api/users/{user_id}/change-password...")
        password_data = {"new_password": "newpass123"}
        
        response = requests.post(f"{API_URL}/users/{user_id}/change-password", 
                               json=password_data, headers=get_headers())
        print(f"Change password response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Password changed successfully: {result.get('message')}")
            return True
        else:
            print(f"❌ Failed to change password: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing user management: {e}")
        return False

def test_wiki_pages():
    """Test 9: Wiki Pages endpoints"""
    print("\n=== Test 9: Wiki Pages ===")
    
    created_page_id = None
    
    try:
        # Test POST /api/wiki - create page
        print("Testing POST /api/wiki...")
        page_data = {
            "title": "Test Wiki Page",
            "content": "<p>Test content for wiki page</p>",
            "parent_id": None,
            "order": 0
        }
        
        response = requests.post(f"{API_URL}/wiki", json=page_data, headers=get_headers())
        print(f"Create wiki page response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to create wiki page: {response.text}")
            return False
        
        created_page = response.json()
        created_page_id = created_page.get('id')
        print(f"✅ Wiki page created with ID: {created_page_id}")
        
        # Test GET /api/wiki - get all pages
        print("Testing GET /api/wiki...")
        response = requests.get(f"{API_URL}/wiki", headers=get_headers())
        print(f"GET wiki pages response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to get wiki pages: {response.text}")
            return False
        
        pages = response.json()
        print(f"✅ Retrieved {len(pages)} wiki pages")
        
        # Test GET /api/wiki/{page_id} - get specific page
        print("Testing GET /api/wiki/{page_id}...")
        response = requests.get(f"{API_URL}/wiki/{created_page_id}", headers=get_headers())
        print(f"GET specific wiki page response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to get specific wiki page: {response.text}")
            return False
        
        page = response.json()
        print(f"✅ Retrieved specific wiki page: {page.get('title')}")
        
        # Test PUT /api/wiki/{page_id} - update page
        print("Testing PUT /api/wiki/{page_id}...")
        update_data = {
            "title": "Updated Wiki Title",
            "content": "<p>Updated wiki content</p>"
        }
        
        response = requests.put(f"{API_URL}/wiki/{created_page_id}", 
                              json=update_data, headers=get_headers())
        print(f"Update wiki page response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to update wiki page: {response.text}")
            return False
        
        updated_page = response.json()
        if (updated_page.get('title') == "Updated Wiki Title" and 
            "<p>Updated wiki content</p>" in updated_page.get('content', '')):
            print(f"✅ Wiki page updated successfully")
        else:
            print(f"❌ Wiki page not updated correctly")
            return False
        
        # Test DELETE /api/wiki/{page_id} - delete page
        print("Testing DELETE /api/wiki/{page_id}...")
        response = requests.delete(f"{API_URL}/wiki/{created_page_id}", headers=get_headers())
        print(f"Delete wiki page response status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ Wiki page deleted successfully")
            return True
        else:
            print(f"❌ Failed to delete wiki page: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing wiki pages: {e}")
        return False

def test_registries():
    """Test 10: Registries endpoints"""
    print("\n=== Test 10: Registries ===")
    
    created_registry_id = None
    created_record_id = None
    
    try:
        # Test POST /api/registries - create registry
        print("Testing POST /api/registries...")
        registry_data = {
            "name": "Test Registry",
            "description": "Test description for registry",
            "columns": [
                {"id": "col1", "name": "Name", "column_type": "text", "order": 0},
                {"id": "col2", "name": "Count", "column_type": "number", "order": 1},
                {"id": "col3", "name": "ID", "column_type": "id", "order": 2}
            ]
        }
        
        response = requests.post(f"{API_URL}/registries", json=registry_data, headers=get_headers())
        print(f"Create registry response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to create registry: {response.text}")
            return False
        
        created_registry = response.json()
        created_registry_id = created_registry.get('id')
        print(f"✅ Registry created with ID: {created_registry_id}")
        
        # Test GET /api/registries - get all registries
        print("Testing GET /api/registries...")
        response = requests.get(f"{API_URL}/registries", headers=get_headers())
        print(f"GET registries response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to get registries: {response.text}")
            return False
        
        registries = response.json()
        print(f"✅ Retrieved {len(registries)} registries")
        
        # Test POST /api/registries/{registry_id}/records - create record
        print("Testing POST /api/registries/{registry_id}/records...")
        record_data = {
            "data": {
                "col1": "Test Record Name",
                "col2": "42"
                # col3 should be auto-generated as ID type
            }
        }
        
        response = requests.post(f"{API_URL}/registries/{created_registry_id}/records", 
                               json=record_data, headers=get_headers())
        print(f"Create registry record response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to create registry record: {response.text}")
            return False
        
        created_record = response.json()
        created_record_id = created_record.get('id')
        print(f"✅ Registry record created with ID: {created_record_id}")
        
        # Check if col3 was auto-generated
        record_data_response = created_record.get('data', {})
        if 'col3' in record_data_response and record_data_response['col3']:
            print(f"✅ Auto-generated ID field (col3): {record_data_response['col3']}")
        else:
            print(f"❌ Auto-generated ID field (col3) not created")
            return False
        
        # Test GET /api/registries/{registry_id}/records - get records
        print("Testing GET /api/registries/{registry_id}/records...")
        response = requests.get(f"{API_URL}/registries/{created_registry_id}/records", 
                              headers=get_headers())
        print(f"GET registry records response status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Failed to get registry records: {response.text}")
            return False
        
        records = response.json()
        print(f"✅ Retrieved {len(records)} registry records")
        
        # Test GET /api/registries/{registry_id}/export - export CSV
        print("Testing GET /api/registries/{registry_id}/export...")
        response = requests.get(f"{API_URL}/registries/{created_registry_id}/export", 
                              headers=get_headers())
        print(f"Export registry response status: {response.status_code}")
        
        if response.status_code == 200:
            # Check if response is CSV format
            content_type = response.headers.get('content-type', '')
            if 'csv' in content_type.lower() or 'text' in content_type.lower():
                print(f"✅ Registry exported successfully as CSV")
                print(f"   Content-Type: {content_type}")
                # Show first few lines of CSV
                csv_content = response.text
                lines = csv_content.split('\n')[:3]  # First 3 lines
                for i, line in enumerate(lines):
                    if line.strip():
                        print(f"   Line {i+1}: {line}")
                return True
            else:
                print(f"❌ Export not in CSV format. Content-Type: {content_type}")
                return False
        else:
            print(f"❌ Failed to export registry: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing registries: {e}")
        return False

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
    
    # EXISTING TESTS
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
    
    # Test 6: Asset creation with empty threats
    asset_creation_result, asset_id = test_asset_creation_empty_threats()
    test_results.append(("Asset creation with empty threats", asset_creation_result))
    
    # NEW ENDPOINT TESTS
    print("\n" + "=" * 50)
    print("🆕 TESTING NEW ENDPOINTS")
    print("=" * 50)
    
    # Test 7: Settings asset categories
    settings_result = test_settings_asset_categories()
    test_results.append(("Settings asset categories", settings_result))
    
    # Test 8: User management
    user_mgmt_result = test_user_management()
    test_results.append(("User management", user_mgmt_result))
    
    # Test 9: Wiki pages
    wiki_result = test_wiki_pages()
    test_results.append(("Wiki pages", wiki_result))
    
    # Test 10: Registries
    registries_result = test_registries()
    test_results.append(("Registries", registries_result))
    
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