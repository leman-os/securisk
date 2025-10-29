#!/usr/bin/env python3
"""
Specific test for asset creation with empty threats array
Tests the exact scenario requested by the user
"""

import requests
import json
import sys

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

def login_and_get_token():
    """Login and get auth token"""
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        print(f"Login response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            print("✅ Login successful")
            return token
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_asset_creation():
    """Test asset creation with empty threats array"""
    print("\n=== Тестирование создания актива с пустым массивом threats ===")
    
    # Get auth token
    token = login_and_get_token()
    if not token:
        return False
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Asset data as specified in the request
    asset_data = {
        "name": "Тестовый актив",
        "category": "ИТ-инфраструктура", 
        "owner": "Тестовый владелец",
        "criticality": "Средняя",
        "status": "Актуален",
        "threats": []
    }
    
    print(f"\nОтправляем POST запрос на /api/assets с данными:")
    print(json.dumps(asset_data, indent=2, ensure_ascii=False))
    
    try:
        response = requests.post(f"{API_URL}/assets", json=asset_data, headers=headers)
        print(f"\nОтвет сервера: HTTP {response.status_code}")
        
        if response.status_code == 200:
            asset = response.json()
            print("✅ УСПЕХ: Актив создан успешно!")
            print(f"\nДанные созданного актива:")
            print(json.dumps(asset, indent=2, ensure_ascii=False))
            
            # Проверяем что поле threats сохранилось как пустой массив
            if 'threats' in asset and asset['threats'] == []:
                print(f"\n✅ ПРОВЕРКА ПРОЙДЕНА: Поле threats корректно сохранено как пустой массив: {asset['threats']}")
                return True
            else:
                print(f"\n❌ ОШИБКА: Поле threats сохранено некорректно: {asset.get('threats')}")
                return False
                
        else:
            print("❌ ОШИБКА: Не удалось создать актив")
            print(f"Статус код: {response.status_code}")
            
            try:
                error_data = response.json()
                print("Детали ошибки:")
                print(json.dumps(error_data, indent=2, ensure_ascii=False))
            except:
                print(f"Текст ошибки: {response.text}")
            
            return False
            
    except Exception as e:
        print(f"❌ ИСКЛЮЧЕНИЕ при выполнении запроса: {e}")
        return False

def main():
    """Main function"""
    print("🚀 Тестирование создания актива через API")
    print("=" * 60)
    
    success = test_asset_creation()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 РЕЗУЛЬТАТ: Тест пройден успешно!")
        print("Backend корректно принимает пустой массив threats при создании актива.")
    else:
        print("⚠️ РЕЗУЛЬТАТ: Тест не пройден!")
        print("Обнаружены проблемы с обработкой пустого массива threats.")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)