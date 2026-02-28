#!/usr/bin/env python3
"""
SecuRisk License Generator — только для внутреннего использования вендора.
НИКОГДА не передавать клиенту.

Использование:
    python gen_license.py <SERVER_ID> <EXPIRE_DATE>

    SERVER_ID   — 32-символьный hex, отображается в разделе Настройки > Лицензирование
    EXPIRE_DATE — дата истечения в формате YYYY-MM-DD

Пример:
    python gen_license.py a1b2c3d4e5f6... 2026-12-31
"""

import hashlib
import sys
from datetime import datetime, timezone

# ============================================================
# СЕКРЕТНАЯ СОЛЬ — должна совпадать с LICENSE_SALT в server.py
# Задайте через переменную окружения SR_LICENSE_SALT или здесь
# ============================================================
import os
SECRET_SALT = os.environ.get("SR_LICENSE_SALT", "sr-commercial-salt-2025")


def generate_key(machine_id: str, expire_date: str) -> str:
    """
    Генерирует лицензионный ключ для конкретного сервера.

    Формат ключа: YYYY-MM-DD.<sha256_hex>
    Бэкенд проверяет: SHA256(machine_id|expire_date|SECRET_SALT) == key_hash
    """
    # Проверяем формат даты
    try:
        datetime.strptime(expire_date, "%Y-%m-%d")
    except ValueError:
        raise ValueError(f"Неверный формат даты: {expire_date!r}. Используйте YYYY-MM-DD.")

    raw_str = f"{machine_id}|{expire_date}|{SECRET_SALT}"
    key_hash = hashlib.sha256(raw_str.encode()).hexdigest()
    return f"{expire_date}.{key_hash}"


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)

    machine_id = sys.argv[1].strip()
    expire_date = sys.argv[2].strip()

    if len(machine_id) != 32:
        print(f"[ОШИБКА] SERVER_ID должен быть 32 символа. Получено: {len(machine_id)}")
        sys.exit(1)

    license_key = generate_key(machine_id, expire_date)

    print("=" * 60)
    print(f"  Server ID   : {machine_id}")
    print(f"  Действует до: {expire_date}")
    print(f"  Ключ        : {license_key}")
    print("=" * 60)
    print("Передайте строку 'Ключ' клиенту для активации в настройках.")


if __name__ == "__main__":
    main()
