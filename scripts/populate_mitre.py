#!/usr/bin/env python3
"""
Populate MITRE ATT&CK techniques database
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import uuid

# MITRE ATT&CK techniques (sample subset)
MITRE_TECHNIQUES = [
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1566.001",
        "name": "Phishing: Spearphishing Attachment",
        "tactic": "Initial Access",
        "description": "Adversaries may send spearphishing emails with a malicious attachment in an attempt to gain access to victim systems."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1078",
        "name": "Valid Accounts",
        "tactic": "Persistence",
        "description": "Adversaries may obtain and abuse credentials of existing accounts as a means of gaining Initial Access, Persistence, Privilege Escalation, or Defense Evasion."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1190",
        "name": "Exploit Public-Facing Application",
        "tactic": "Initial Access",
        "description": "Adversaries may attempt to take advantage of a weakness in an Internet-facing computer or program using software, data, or commands."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1059.001",
        "name": "Command and Scripting Interpreter: PowerShell",
        "tactic": "Execution",
        "description": "Adversaries may abuse PowerShell commands and scripts for execution."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1003",
        "name": "OS Credential Dumping",
        "tactic": "Credential Access",
        "description": "Adversaries may attempt to dump credentials to obtain account login and credential material."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1087",
        "name": "Account Discovery",
        "tactic": "Discovery",
        "description": "Adversaries may attempt to get a listing of accounts on a system or within an environment."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1021.001",
        "name": "Remote Services: Remote Desktop Protocol",
        "tactic": "Lateral Movement",
        "description": "Adversaries may use Remote Desktop Protocol (RDP) to move laterally within a network."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1486",
        "name": "Data Encrypted for Impact",
        "tactic": "Impact",
        "description": "Adversaries may encrypt data on target systems or on large numbers of systems in a network to interrupt availability."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1071.001",
        "name": "Application Layer Protocol: Web Protocols",
        "tactic": "Command and Control",
        "description": "Adversaries may communicate using application layer protocols associated with web traffic."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1567",
        "name": "Exfiltration Over Web Service",
        "tactic": "Exfiltration",
        "description": "Adversaries may use an existing, legitimate external Web service to exfiltrate data."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1562.001",
        "name": "Impair Defenses: Disable or Modify Tools",
        "tactic": "Defense Evasion",
        "description": "Adversaries may modify and/or disable security tools to avoid possible detection."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1098",
        "name": "Account Manipulation",
        "tactic": "Persistence",
        "description": "Adversaries may manipulate accounts to maintain access to victim systems."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1548",
        "name": "Abuse Elevation Control Mechanism",
        "tactic": "Privilege Escalation",
        "description": "Adversaries may circumvent mechanisms designed to control elevate privileges."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1133",
        "name": "External Remote Services",
        "tactic": "Initial Access",
        "description": "Adversaries may leverage external-facing remote services to initially access and/or persist within a network."
    },
    {
        "id": str(uuid.uuid4()),
        "technique_id": "T1110",
        "name": "Brute Force",
        "tactic": "Credential Access",
        "description": "Adversaries may use brute force techniques to gain access to accounts."
    }
]

async def populate_mitre():
    """Populate MITRE ATT&CK database"""
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if already populated
    existing_count = await db.mitre_attack.count_documents({})
    if existing_count > 0:
        print(f"MITRE ATT&CK database already has {existing_count} techniques. Skipping...")
        return
    
    # Insert techniques
    print(f"Inserting {len(MITRE_TECHNIQUES)} MITRE ATT&CK techniques...")
    result = await db.mitre_attack.insert_many(MITRE_TECHNIQUES)
    print(f"✅ Successfully inserted {len(result.inserted_ids)} techniques")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(populate_mitre())
