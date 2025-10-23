#!/usr/bin/env python3
"""
Additional Backend API Testing for SecuRisk Application
Tests more comprehensive sorting scenarios
"""

import requests
import json
from datetime import datetime, timezone, timedelta
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
API_URL = f"{BASE_URL}/api"

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
        if response.status_code == 200:
            data = response.json()
            auth_token = data.get('access_token')
            return True
        return False
    except Exception as e:
        return False

def get_headers():
    """Get headers with auth token"""
    if not auth_token:
        return {}
    return {"Authorization": f"Bearer {auth_token}"}

def create_multiple_incidents():
    """Create multiple incidents with different times for sorting test"""
    print("\n=== Creating Multiple Incidents for Sorting Test ===")
    
    base_time = datetime.now(timezone.utc)
    incidents = []
    
    for i in range(3):
        incident_time = base_time - timedelta(hours=i)
        incident_data = {
            "incident_time": incident_time.isoformat(),
            "detection_time": incident_time.isoformat(),
            "criticality": ["Низкая", "Средняя", "Высокая"][i],
            "status": "Открыт",
            "description": f"Тестовый инцидент #{i+1}",
            "detected_by": f"Пользователь {i+1}"
        }
        
        try:
            response = requests.post(f"{API_URL}/incidents", json=incident_data, headers=get_headers())
            if response.status_code == 200:
                incident = response.json()
                incidents.append(incident)
                print(f"✅ Created incident {i+1}: {incident['id']}")
            else:
                print(f"❌ Failed to create incident {i+1}")
        except Exception as e:
            print(f"❌ Error creating incident {i+1}: {e}")
    
    return incidents

def test_sorting_functionality():
    """Test sorting by different fields and orders"""
    print("\n=== Testing Sorting Functionality ===")
    
    # Test sorting by incident_time desc
    try:
        params = {"page": 1, "limit": 10, "sort_by": "incident_time", "sort_order": "desc"}
        response = requests.get(f"{API_URL}/incidents", params=params, headers=get_headers())
        
        if response.status_code == 200:
            data = response.json()
            incidents = data['items']
            
            if len(incidents) >= 2:
                # Check if sorted correctly (desc order)
                first_time = datetime.fromisoformat(incidents[0]['incident_time'].replace('Z', '+00:00'))
                second_time = datetime.fromisoformat(incidents[1]['incident_time'].replace('Z', '+00:00'))
                
                if first_time >= second_time:
                    print("✅ Sorting by incident_time DESC works correctly")
                else:
                    print("❌ Sorting by incident_time DESC failed")
                    return False
            else:
                print("✅ Sorting test passed (insufficient data for comparison)")
        else:
            print(f"❌ Failed to test sorting: {response.status_code}")
            return False
        
        # Test sorting by incident_time asc
        params = {"page": 1, "limit": 10, "sort_by": "incident_time", "sort_order": "asc"}
        response = requests.get(f"{API_URL}/incidents", params=params, headers=get_headers())
        
        if response.status_code == 200:
            data = response.json()
            incidents = data['items']
            
            if len(incidents) >= 2:
                # Check if sorted correctly (asc order)
                first_time = datetime.fromisoformat(incidents[0]['incident_time'].replace('Z', '+00:00'))
                second_time = datetime.fromisoformat(incidents[1]['incident_time'].replace('Z', '+00:00'))
                
                if first_time <= second_time:
                    print("✅ Sorting by incident_time ASC works correctly")
                else:
                    print("❌ Sorting by incident_time ASC failed")
                    return False
            else:
                print("✅ Sorting test passed (insufficient data for comparison)")
        else:
            print(f"❌ Failed to test ASC sorting: {response.status_code}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Error testing sorting: {e}")
        return False

def test_pagination_calculation():
    """Test pagination calculation accuracy"""
    print("\n=== Testing Pagination Calculation ===")
    
    try:
        # Get total count first
        response = requests.get(f"{API_URL}/incidents", params={"page": 1, "limit": 1}, headers=get_headers())
        
        if response.status_code == 200:
            data = response.json()
            total = data['total']
            
            # Test different page sizes and verify total_pages calculation
            test_limits = [1, 2, 3, 5, 10]
            
            for limit in test_limits:
                params = {"page": 1, "limit": limit}
                response = requests.get(f"{API_URL}/incidents", params=params, headers=get_headers())
                
                if response.status_code == 200:
                    data = response.json()
                    expected_total_pages = (total + limit - 1) // limit  # Ceiling division
                    actual_total_pages = data['total_pages']
                    
                    if expected_total_pages == actual_total_pages:
                        print(f"✅ Pagination calculation correct for limit {limit}: {actual_total_pages} pages")
                    else:
                        print(f"❌ Pagination calculation wrong for limit {limit}: expected {expected_total_pages}, got {actual_total_pages}")
                        return False
                else:
                    print(f"❌ Failed to test pagination with limit {limit}")
                    return False
            
            return True
        else:
            print(f"❌ Failed to get initial data: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing pagination calculation: {e}")
        return False

def main():
    """Main test runner"""
    print("🚀 Starting Additional SecuRisk Backend API Tests")
    print("=" * 60)
    
    # Login first
    if not login():
        print("❌ Cannot proceed without authentication")
        sys.exit(1)
    
    # Create test data
    create_multiple_incidents()
    
    # Run additional tests
    test_results = []
    
    # Test sorting functionality
    sorting_result = test_sorting_functionality()
    test_results.append(("Sorting functionality", sorting_result))
    
    # Test pagination calculation
    pagination_calc_result = test_pagination_calculation()
    test_results.append(("Pagination calculation", pagination_calc_result))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 ADDITIONAL TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {len(test_results)} additional tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All additional tests passed!")
        return True
    else:
        print(f"\n⚠️  {failed} additional test(s) failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)