from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    full_name: str
    email: Optional[EmailStr] = None
    role: str  # "Администратор", "Инженер ИБ", "Специалист ИБ"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: Optional[EmailStr] = None
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Risk(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    risk_number: str
    title: str
    description: str
    category: str
    likelihood: str
    impact: str
    risk_level: str
    status: str
    owner: str
    treatment_measures: Optional[str] = None
    deadline: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    priority: int = Field(default=0)

class RiskCreate(BaseModel):
    risk_number: Optional[str] = None  # Auto-generated if not provided
    title: str
    description: str
    category: str
    likelihood: str
    impact: str
    risk_level: str
    status: str
    owner: str
    treatment_measures: Optional[str] = None
    deadline: Optional[str] = None

class RiskUpdate(BaseModel):
    risk_number: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    likelihood: Optional[str] = None
    impact: Optional[str] = None
    risk_level: Optional[str] = None
    status: Optional[str] = None
    owner: Optional[str] = None
    treatment_measures: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[int] = None

class Incident(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    incident_number: str  # INC00001
    incident_time: datetime  # Время инцидента
    detection_time: datetime  # Время обнаружения
    reaction_start_time: Optional[datetime] = None  # Время начала реакции
    violator: Optional[str] = None  # Нарушитель
    subject_type: Optional[str] = None  # Тип субъекта (из настроек)
    login: Optional[str] = None  # Логин
    system: Optional[str] = None  # Система (из настроек)
    incident_type: Optional[str] = None  # Тип инцидента
    detection_source: Optional[str] = None  # Источник выявления
    criticality: str  # Низкая, Средняя, Высокая
    detected_by: Optional[str] = None  # Выявил (ФИО)
    status: str  # Открыт, Закрыт
    closed_at: Optional[datetime] = None  # Время закрытия
    mtta: Optional[float] = None  # Время от инцидента до обнаружения (минуты)
    mttr: Optional[float] = None  # Время от обнаружения до начала реакции (минуты)
    mttc: Optional[float] = None  # Время от инцидента до закрытия (минуты)
    description: Optional[str] = None  # Описание
    measures: Optional[str] = None  # Меры
    is_repeat: bool = False  # Повтор
    comment: Optional[str] = None  # Комментарий
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncidentCreate(BaseModel):
    incident_number: Optional[str] = None  # Auto-generated if not provided
    incident_time: datetime
    detection_time: datetime
    reaction_start_time: Optional[datetime] = None
    violator: Optional[str] = None
    subject_type: Optional[str] = None
    login: Optional[str] = None
    system: Optional[str] = None
    incident_type: Optional[str] = None
    detection_source: Optional[str] = None
    criticality: str
    detected_by: Optional[str] = None
    status: str
    closed_at: Optional[datetime] = None  # Время закрытия
    description: Optional[str] = None
    measures: Optional[str] = None
    is_repeat: bool = False
    comment: Optional[str] = None

class IncidentUpdate(BaseModel):
    incident_number: Optional[str] = None
    incident_time: Optional[datetime] = None
    detection_time: Optional[datetime] = None
    reaction_start_time: Optional[datetime] = None
    violator: Optional[str] = None
    subject_type: Optional[str] = None
    login: Optional[str] = None
    system: Optional[str] = None
    incident_type: Optional[str] = None
    detection_source: Optional[str] = None
    criticality: Optional[str] = None
    detected_by: Optional[str] = None
    status: Optional[str] = None
    closed_at: Optional[datetime] = None
    description: Optional[str] = None
    measures: Optional[str] = None
    is_repeat: Optional[bool] = None
    comment: Optional[str] = None

class Asset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    asset_number: str  # ACT00001
    name: str  # Название актива
    category: Optional[str] = None  # Категория
    owner: Optional[str] = None  # Владелец
    criticality: str  # Низкая, Средняя, Высокая
    format: Optional[str] = None  # Формат
    location: Optional[str] = None  # Месторасположение
    rights_rw: Optional[str] = None  # Права RW
    rights_ro: Optional[str] = None  # Права RO
    classification: Optional[str] = None  # Классификация
    review_date: Optional[datetime] = None  # Дата пересмотра
    status: str  # Актуален, Не актуален
    threats: List[str] = Field(default_factory=list)  # Угрозы
    protection_measures: Optional[str] = None  # Меры защиты
    description: Optional[str] = None  # Описание
    note: Optional[str] = None  # Примечание
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssetCreate(BaseModel):
    asset_number: Optional[str] = None  # Auto-generated if not provided
    name: str
    category: Optional[str] = None
    owner: Optional[str] = None
    criticality: str
    format: Optional[str] = None
    location: Optional[str] = None
    rights_rw: Optional[str] = None
    rights_ro: Optional[str] = None
    classification: Optional[str] = None
    status: str
    threats: List[str] = Field(default_factory=list)
    protection_measures: Optional[str] = None
    description: Optional[str] = None
    note: Optional[str] = None

class AssetUpdate(BaseModel):
    asset_number: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    owner: Optional[str] = None
    criticality: Optional[str] = None
    format: Optional[str] = None
    location: Optional[str] = None
    rights_rw: Optional[str] = None
    rights_ro: Optional[str] = None
    classification: Optional[str] = None
    review_date: Optional[datetime] = None
    status: Optional[str] = None
    threats: Optional[List[str]] = None
    protection_measures: Optional[str] = None
    description: Optional[str] = None
    note: Optional[str] = None

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="settings")
    subject_types: List[str] = Field(default_factory=lambda: ["Внутренний", "Внешний", "Привилегированный"])
    systems: List[str] = Field(default_factory=lambda: ["Windows", "Linux", "MacOS", "Web-приложение"])
    threats: List[str] = Field(default_factory=lambda: ["Несанкционированный доступ", "Утечка данных", "DDoS", "Вредоносное ПО"])
    asset_statuses: List[str] = Field(default_factory=lambda: ["Актуален", "Не актуален", "В работе", "Архив"])
    threat_categories: List[str] = Field(default_factory=lambda: ["Внешний злоумышленник", "Инсайдер", "Стихийное бедствие", "Сбой оборудования"])
    threat_sources: List[str] = Field(default_factory=lambda: ["Хакер-одиночка", "Криминальная группа", "Недовольный сотрудник", "Конкурент"])
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    subject_types: Optional[List[str]] = None
    systems: Optional[List[str]] = None
    threats: Optional[List[str]] = None
    asset_statuses: Optional[List[str]] = None
    threat_categories: Optional[List[str]] = None
    threat_sources: Optional[List[str]] = None

class DashboardStats(BaseModel):
    total_risks: int
    total_incidents: int
    total_assets: int
    critical_risks: int
    open_incidents: int
    critical_assets: int
    avg_mtta: Optional[float] = None
    avg_mttr: Optional[float] = None
    avg_mttc: Optional[float] = None

class IncidentMetrics(BaseModel):
    avg_mtta: Optional[float] = None
    avg_mttr: Optional[float] = None
    avg_mttc: Optional[float] = None
    total_incidents: int
    closed_incidents: int

# ==================== THREAT MODELS ====================
class Threat(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    threat_number: str  # THR-2024-001
    category: str  # Внешний злоумышленник, Инсайдер, Стихийное бедствие, Сбой оборудования
    description: str
    source: Optional[str] = None  # Хакер-одиночка, Криминальная группа, Недовольный сотрудник
    related_vulnerability_id: Optional[str] = None  # ID уязвимости
    mitre_attack_id: Optional[str] = None  # MITRE ATT&CK ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ThreatCreate(BaseModel):
    threat_number: Optional[str] = None
    category: str
    description: str
    source: Optional[str] = None
    related_vulnerability_id: Optional[str] = None
    mitre_attack_id: Optional[str] = None

class ThreatUpdate(BaseModel):
    threat_number: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    related_vulnerability_id: Optional[str] = None
    mitre_attack_id: Optional[str] = None

# ==================== VULNERABILITY MODELS ====================
class Vulnerability(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vulnerability_number: str  # VUL-2024-001
    related_asset_id: Optional[str] = None  # ID актива
    description: str
    vulnerability_type: str
    detection_method: str
    cvss_vector: Optional[str] = None  # CVSS v3.1 Vector
    cvss_score: Optional[float] = None  # Auto-calculated
    severity: Optional[str] = None  # Auto-calculated (Critical, High, Medium, Low)
    status: str  # Обнаружена, Принята, В работе, Устранена
    discovery_date: datetime
    closure_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VulnerabilityCreate(BaseModel):
    vulnerability_number: Optional[str] = None
    related_asset_id: Optional[str] = None
    description: str
    vulnerability_type: str
    detection_method: str
    cvss_vector: Optional[str] = None
    status: str
    discovery_date: datetime
    closure_date: Optional[datetime] = None

class VulnerabilityUpdate(BaseModel):
    vulnerability_number: Optional[str] = None
    related_asset_id: Optional[str] = None
    description: Optional[str] = None
    vulnerability_type: Optional[str] = None
    detection_method: Optional[str] = None
    cvss_vector: Optional[str] = None
    status: Optional[str] = None
    discovery_date: Optional[datetime] = None
    closure_date: Optional[datetime] = None

# ==================== MITRE ATT&CK MODELS ====================
class MitreAttack(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    technique_id: str  # T1566.001
    name: str
    tactic: str
    description: str

class PaginatedThreats(BaseModel):
    items: List[Threat]
    total: int
    page: int
    limit: int
    total_pages: int

class PaginatedVulnerabilities(BaseModel):
    items: List[Vulnerability]
    total: int
    page: int
    limit: int
    total_pages: int

class PaginatedIncidents(BaseModel):
    items: List[Incident]
    total: int
    page: int
    limit: int
    total_pages: int

class PaginatedRisks(BaseModel):
    items: List[Risk]
    total: int
    page: int
    limit: int
    total_pages: int

class PaginatedAssets(BaseModel):
    items: List[Asset]
    total: int
    page: int
    limit: int
    total_pages: int

# ==================== HELPERS ====================

async def generate_incident_number() -> str:
    """Generate next incident number in format INC000001"""
    incidents = await db.incidents.find({}, {"incident_number": 1}).to_list(None)
    if not incidents:
        return "INC000001"
    
    # Extract numbers and find max
    numbers = []
    for inc in incidents:
        num_str = inc.get('incident_number', '').replace('INC', '')
        try:
            numbers.append(int(num_str))
        except ValueError:
            continue
    
    next_num = max(numbers) + 1 if numbers else 1
    return f"INC{next_num:06d}"

async def generate_asset_number() -> str:
    """Generate next asset number in format ACT000001"""
    assets = await db.assets.find({}, {"asset_number": 1}).to_list(None)
    if not assets:
        return "ACT000001"
    
    # Extract numbers and find max
    numbers = []
    for asset in assets:
        num_str = asset.get('asset_number', '').replace('ACT', '')
        try:
            numbers.append(int(num_str))
        except ValueError:
            continue
    
    next_num = max(numbers) + 1 if numbers else 1
    return f"ACT{next_num:06d}"

async def generate_risk_number() -> str:
    """Generate next risk number in format RSK000001"""
    risks = await db.risks.find({}, {"risk_number": 1}).to_list(None)
    if not risks:
        return "RSK000001"
    
    # Extract numbers and find max
    numbers = []
    for risk in risks:
        num_str = risk.get('risk_number', '').replace('RSK', '')
        try:
            numbers.append(int(num_str))
        except ValueError:
            continue
    
    next_num = max(numbers) + 1 if numbers else 1
    return f"RSK{next_num:06d}"

def calculate_incident_metrics(incident_dict: dict) -> dict:
    """Calculate MTTA, MTTR, MTTC for an incident in minutes"""
    incident_time = incident_dict.get('incident_time')
    detection_time = incident_dict.get('detection_time')
    reaction_start_time = incident_dict.get('reaction_start_time')
    closed_at = incident_dict.get('closed_at')
    
    # Parse datetime if strings and ensure timezone awareness
    if isinstance(incident_time, str):
        incident_time = datetime.fromisoformat(incident_time)
    if isinstance(detection_time, str):
        detection_time = datetime.fromisoformat(detection_time)
    if isinstance(reaction_start_time, str):
        reaction_start_time = datetime.fromisoformat(reaction_start_time)
    if isinstance(closed_at, str):
        closed_at = datetime.fromisoformat(closed_at)
    
    # Make timezone naive if needed for calculation
    if incident_time and incident_time.tzinfo:
        incident_time = incident_time.replace(tzinfo=None)
    if detection_time and detection_time.tzinfo:
        detection_time = detection_time.replace(tzinfo=None)
    if reaction_start_time and reaction_start_time.tzinfo:
        reaction_start_time = reaction_start_time.replace(tzinfo=None)
    if closed_at and closed_at.tzinfo:
        closed_at = closed_at.replace(tzinfo=None)
    
    # MTTA (время от инцидента до обнаружения) - in minutes
    if detection_time and incident_time:
        incident_dict['mtta'] = round((detection_time - incident_time).total_seconds() / 60, 2)
    
    # MTTR (время от обнаружения до начала реакции) - in minutes
    if reaction_start_time and detection_time:
        incident_dict['mttr'] = round((reaction_start_time - detection_time).total_seconds() / 60, 2)
    
    # MTTC (время от инцидента до закрытия) - in minutes
    if closed_at and incident_time:
        incident_dict['mttc'] = round((closed_at - incident_time).total_seconds() / 60, 2)
    
    return incident_dict

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_doc = await db.users.find_one({"username": username}, {"_id": 0, "password": 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        
        if isinstance(user_doc.get('created_at'), str):
            user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
        
        return User(**user_doc)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "Администратор":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=user_data.username,
        full_name=user_data.full_name,
        email=user_data.email,
        role=user_data.role
    )
    
    doc = user.model_dump()
    doc['password'] = hash_password(user_data.password)
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    return user

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"username": credentials.username})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token({"sub": user_doc['username']})
    
    user_doc.pop('password')
    user_doc.pop('_id')
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**user_doc)
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ==================== USER ENDPOINTS ====================

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "Администратор":
        raise HTTPException(status_code=403, detail="Only admins can delete users")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ==================== SETTINGS ENDPOINTS ====================

@api_router.get("/settings", response_model=Settings)
async def get_settings(current_user: User = Depends(get_current_user)):
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = Settings()
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.settings.insert_one(doc)
        return default_settings
    
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return Settings(**settings)

@api_router.put("/settings", response_model=Settings)
async def update_settings(settings_data: SettingsUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != "Администратор":
        raise HTTPException(status_code=403, detail="Only admins can update settings")
    
    update_dict = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one(
        {"id": "settings"},
        {"$set": update_dict},
        upsert=True
    )
    
    settings = await db.settings.find_one({"id": "settings"}, {"_id": 0})
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    return Settings(**settings)

# ==================== RISK ENDPOINTS ====================

@api_router.post("/risks", response_model=Risk)
async def create_risk(risk_data: RiskCreate, current_user: User = Depends(get_current_user)):
    # Auto-generate risk number if not provided
    data_dict = risk_data.model_dump()
    if not data_dict.get('risk_number'):
        data_dict['risk_number'] = await generate_risk_number()
    
    risk = Risk(**data_dict)
    doc = risk.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.risks.insert_one(doc)
    return risk

@api_router.get("/risks", response_model=PaginatedRisks)
async def get_risks(
    page: int = 1,
    limit: int = 20,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    current_user: User = Depends(get_current_user)
):
    # Calculate skip
    skip = (page - 1) * limit
    
    # Determine sort direction
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Get total count
    total = await db.risks.count_documents({})
    
    # Get paginated and sorted risks
    risks = await db.risks.find({}, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    
    for risk in risks:
        if isinstance(risk.get('created_at'), str):
            risk['created_at'] = datetime.fromisoformat(risk['created_at'])
        if isinstance(risk.get('updated_at'), str):
            risk['updated_at'] = datetime.fromisoformat(risk['updated_at'])
    
    # Calculate total pages
    total_pages = (total + limit - 1) // limit
    
    return PaginatedRisks(
        items=risks,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@api_router.get("/risks/{risk_id}", response_model=Risk)
async def get_risk(risk_id: str, current_user: User = Depends(get_current_user)):
    risk = await db.risks.find_one({"id": risk_id}, {"_id": 0})
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    if isinstance(risk.get('created_at'), str):
        risk['created_at'] = datetime.fromisoformat(risk['created_at'])
    if isinstance(risk.get('updated_at'), str):
        risk['updated_at'] = datetime.fromisoformat(risk['updated_at'])
    return Risk(**risk)

@api_router.put("/risks/{risk_id}", response_model=Risk)
async def update_risk(risk_id: str, risk_data: RiskUpdate, current_user: User = Depends(get_current_user)):
    update_dict = {k: v for k, v in risk_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.risks.update_one({"id": risk_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Risk not found")
    
    risk = await db.risks.find_one({"id": risk_id}, {"_id": 0})
    if isinstance(risk.get('created_at'), str):
        risk['created_at'] = datetime.fromisoformat(risk['created_at'])
    if isinstance(risk.get('updated_at'), str):
        risk['updated_at'] = datetime.fromisoformat(risk['updated_at'])
    return Risk(**risk)

@api_router.delete("/risks/{risk_id}")
async def delete_risk(risk_id: str, current_user: User = Depends(get_current_user)):
    result = await db.risks.delete_one({"id": risk_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Risk not found")
    return {"message": "Risk deleted"}

# ==================== INCIDENT ENDPOINTS ====================

@api_router.post("/incidents", response_model=Incident)
async def create_incident(incident_data: IncidentCreate, current_user: User = Depends(get_current_user)):
    # Auto-generate incident number if not provided
    data_dict = incident_data.model_dump()
    if not data_dict.get('incident_number'):
        data_dict['incident_number'] = await generate_incident_number()
    
    incident = Incident(**data_dict)
    doc = incident.model_dump()
    
    # Calculate metrics
    doc = calculate_incident_metrics(doc)
    
    # Removed auto-close logic - users must manually set closed_at
    
    # Update incident object with calculated metrics
    incident.mtta = doc.get('mtta')
    incident.mttr = doc.get('mttr')
    incident.mttc = doc.get('mttc')
    
    # Serialize datetimes
    doc['incident_time'] = doc['incident_time'].isoformat()
    doc['detection_time'] = doc['detection_time'].isoformat()
    if doc.get('reaction_start_time'):
        doc['reaction_start_time'] = doc['reaction_start_time'].isoformat()
    if doc.get('closed_at'):
        doc['closed_at'] = doc['closed_at'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.incidents.insert_one(doc)
    return incident

@api_router.get("/incidents", response_model=PaginatedIncidents)
async def get_incidents(
    page: int = 1,
    limit: int = 20,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    current_user: User = Depends(get_current_user)
):
    # Calculate skip
    skip = (page - 1) * limit
    
    # Determine sort direction
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Get total count
    total = await db.incidents.count_documents({})
    
    # Get paginated and sorted incidents
    incidents = await db.incidents.find({}, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    
    for incident in incidents:
        # Parse datetime fields
        for field in ['incident_time', 'detection_time', 'reaction_start_time', 'closed_at', 'created_at', 'updated_at']:
            if incident.get(field) and isinstance(incident[field], str):
                incident[field] = datetime.fromisoformat(incident[field])
    
    # Calculate total pages
    total_pages = (total + limit - 1) // limit
    
    return PaginatedIncidents(
        items=incidents,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@api_router.get("/incidents/metrics/summary", response_model=IncidentMetrics)
async def get_incident_metrics(current_user: User = Depends(get_current_user)):
    incidents = await db.incidents.find({}, {"_id": 0}).to_list(1000)
    
    total_incidents = len(incidents)
    closed_incidents = 0
    
    mtta_values = []
    mttr_values = []
    mttc_values = []
    
    for incident in incidents:
        if incident.get('mtta'):
            # Конвертируем минуты в часы
            mtta_values.append(incident['mtta'] / 60)
        if incident.get('mttr'):
            # Конвертируем минуты в часы
            mttr_values.append(incident['mttr'] / 60)
        if incident.get('mttc'):
            # Конвертируем минуты в часы
            mttc_values.append(incident['mttc'] / 60)
            closed_incidents += 1
    
    return IncidentMetrics(
        avg_mtta=round(sum(mtta_values) / len(mtta_values), 2) if mtta_values else None,
        avg_mttr=round(sum(mttr_values) / len(mttr_values), 2) if mttr_values else None,
        avg_mttc=round(sum(mttc_values) / len(mttc_values), 2) if mttc_values else None,
        total_incidents=total_incidents,
        closed_incidents=closed_incidents
    )

@api_router.get("/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str, current_user: User = Depends(get_current_user)):
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    for field in ['incident_time', 'detection_time', 'reaction_start_time', 'closed_at', 'created_at', 'updated_at']:
        if incident.get(field) and isinstance(incident[field], str):
            incident[field] = datetime.fromisoformat(incident[field])
    return Incident(**incident)

@api_router.put("/incidents/{incident_id}", response_model=Incident)
async def update_incident(incident_id: str, incident_data: IncidentUpdate, current_user: User = Depends(get_current_user)):
    current_incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    if not current_incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    update_dict = {k: v for k, v in incident_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Removed auto-close logic - users must manually set closed_at
    
    # Merge with current data for metric calculation
    merged_data = {**current_incident, **update_dict}
    merged_data = calculate_incident_metrics(merged_data)
    
    # Update metrics
    if 'mtta' in merged_data:
        update_dict['mtta'] = merged_data['mtta']
    if 'mttr' in merged_data:
        update_dict['mttr'] = merged_data['mttr']
    if 'mttc' in merged_data:
        update_dict['mttc'] = merged_data['mttc']
    
    # Serialize datetimes
    for key in ['incident_time', 'detection_time', 'reaction_start_time', 'closed_at']:
        if key in update_dict and isinstance(update_dict[key], datetime):
            update_dict[key] = update_dict[key].isoformat()
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.incidents.update_one({"id": incident_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    for field in ['incident_time', 'detection_time', 'reaction_start_time', 'closed_at', 'created_at', 'updated_at']:
        if incident.get(field) and isinstance(incident[field], str):
            incident[field] = datetime.fromisoformat(incident[field])
    return Incident(**incident)

@api_router.delete("/incidents/{incident_id}")
async def delete_incident(incident_id: str, current_user: User = Depends(get_current_user)):
    result = await db.incidents.delete_one({"id": incident_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
    return {"message": "Incident deleted"}

# ==================== ASSET ENDPOINTS ====================

@api_router.post("/assets", response_model=Asset)
async def create_asset(asset_data: AssetCreate, current_user: User = Depends(get_current_user)):
    # Auto-generate asset number if not provided
    data_dict = asset_data.model_dump()
    if not data_dict.get('asset_number'):
        data_dict['asset_number'] = await generate_asset_number()
    
    asset = Asset(**data_dict)
    doc = asset.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('review_date'):
        doc['review_date'] = doc['review_date'].isoformat()
    await db.assets.insert_one(doc)
    return asset

@api_router.get("/assets", response_model=PaginatedAssets)
async def get_assets(
    page: int = 1,
    limit: int = 20,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    current_user: User = Depends(get_current_user)
):
    # Calculate skip
    skip = (page - 1) * limit
    
    # Determine sort direction
    sort_direction = -1 if sort_order == "desc" else 1
    
    # Get total count
    total = await db.assets.count_documents({})
    
    # Get paginated and sorted assets
    assets = await db.assets.find({}, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    
    for asset in assets:
        if isinstance(asset.get('created_at'), str):
            asset['created_at'] = datetime.fromisoformat(asset['created_at'])
        if isinstance(asset.get('updated_at'), str):
            asset['updated_at'] = datetime.fromisoformat(asset['updated_at'])
        if isinstance(asset.get('review_date'), str):
            asset['review_date'] = datetime.fromisoformat(asset['review_date'])
    
    # Calculate total pages
    total_pages = (total + limit - 1) // limit
    
    return PaginatedAssets(
        items=assets,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@api_router.get("/assets/{asset_id}", response_model=Asset)
async def get_asset(asset_id: str, current_user: User = Depends(get_current_user)):
    asset = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if isinstance(asset.get('created_at'), str):
        asset['created_at'] = datetime.fromisoformat(asset['created_at'])
    if isinstance(asset.get('updated_at'), str):
        asset['updated_at'] = datetime.fromisoformat(asset['updated_at'])
    if isinstance(asset.get('review_date'), str):
        asset['review_date'] = datetime.fromisoformat(asset['review_date'])
    return Asset(**asset)

@api_router.put("/assets/{asset_id}", response_model=Asset)
async def update_asset(asset_id: str, asset_data: AssetUpdate, current_user: User = Depends(get_current_user)):
    update_dict = {k: v for k, v in asset_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Serialize datetime
    if 'review_date' in update_dict and isinstance(update_dict['review_date'], datetime):
        update_dict['review_date'] = update_dict['review_date'].isoformat()
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.assets.update_one({"id": asset_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if isinstance(asset.get('created_at'), str):
        asset['created_at'] = datetime.fromisoformat(asset['created_at'])
    if isinstance(asset.get('updated_at'), str):
        asset['updated_at'] = datetime.fromisoformat(asset['updated_at'])
    if isinstance(asset.get('review_date'), str):
        asset['review_date'] = datetime.fromisoformat(asset['review_date'])
    return Asset(**asset)

@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, current_user: User = Depends(get_current_user)):
    result = await db.assets.delete_one({"id": asset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"message": "Asset deleted"}

@api_router.post("/assets/{asset_id}/review")
async def review_asset(asset_id: str, current_user: User = Depends(get_current_user)):
    """Mark asset as reviewed"""
    update_dict = {
        'review_date': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.assets.update_one({"id": asset_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    return {"message": "Asset reviewed", "review_date": update_dict['review_date']}

# ==================== THREATS ====================

async def generate_threat_number():
    """Generate unique threat number like THR-2024-001"""
    existing = await db.threats.find({}, {"threat_number": 1, "_id": 0}).to_list(1000)
    if not existing:
        return "THR-2024-001"
    
    numbers = []
    for threat in existing:
        if threat.get('threat_number') and threat['threat_number'].startswith('THR-'):
            try:
                num = int(threat['threat_number'].split('-')[-1])
                numbers.append(num)
            except:
                pass
    
    next_num = max(numbers) + 1 if numbers else 1
    year = datetime.now().year
    return f"THR-{year}-{next_num:03d}"

@api_router.post("/threats", response_model=Threat)
async def create_threat(threat: ThreatCreate, current_user: User = Depends(get_current_user)):
    threat_dict = threat.model_dump()
    
    if not threat_dict.get('threat_number'):
        threat_dict['threat_number'] = await generate_threat_number()
    
    threat_dict['id'] = str(uuid.uuid4())
    threat_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    threat_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.threats.insert_one(threat_dict)
    return threat_dict

@api_router.get("/threats", response_model=PaginatedThreats)
async def get_threats(
    page: int = 1,
    limit: int = 20,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    current_user: User = Depends(get_current_user)
):
    skip = (page - 1) * limit
    sort_direction = -1 if sort_order == "desc" else 1
    total = await db.threats.count_documents({})
    
    threats = await db.threats.find({}, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    
    for threat in threats:
        for field in ['created_at', 'updated_at']:
            if threat.get(field) and isinstance(threat[field], str):
                threat[field] = datetime.fromisoformat(threat[field])
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedThreats(
        items=threats,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@api_router.get("/threats/{threat_id}", response_model=Threat)
async def get_threat(threat_id: str, current_user: User = Depends(get_current_user)):
    threat = await db.threats.find_one({"id": threat_id}, {"_id": 0})
    if not threat:
        raise HTTPException(status_code=404, detail="Threat not found")
    
    for field in ['created_at', 'updated_at']:
        if threat.get(field) and isinstance(threat[field], str):
            threat[field] = datetime.fromisoformat(threat[field])
    
    return threat

@api_router.put("/threats/{threat_id}", response_model=Threat)
async def update_threat(threat_id: str, threat: ThreatUpdate, current_user: User = Depends(get_current_user)):
    update_dict = {k: v for k, v in threat.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.threats.update_one({"id": threat_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Threat not found")
    
    updated = await db.threats.find_one({"id": threat_id}, {"_id": 0})
    for field in ['created_at', 'updated_at']:
        if updated.get(field) and isinstance(updated[field], str):
            updated[field] = datetime.fromisoformat(updated[field])
    
    return updated

@api_router.delete("/threats/{threat_id}")
async def delete_threat(threat_id: str, current_user: User = Depends(get_current_user)):
    result = await db.threats.delete_one({"id": threat_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Threat not found")
    return {"message": "Threat deleted"}

# ==================== VULNERABILITIES ====================

async def generate_vulnerability_number():
    """Generate unique vulnerability number like VUL-2024-001"""
    existing = await db.vulnerabilities.find({}, {"vulnerability_number": 1, "_id": 0}).to_list(1000)
    if not existing:
        return "VUL-2024-001"
    
    numbers = []
    for vuln in existing:
        if vuln.get('vulnerability_number') and vuln['vulnerability_number'].startswith('VUL-'):
            try:
                num = int(vuln['vulnerability_number'].split('-')[-1])
                numbers.append(num)
            except:
                pass
    
    next_num = max(numbers) + 1 if numbers else 1
    year = datetime.now().year
    return f"VUL-{year}-{next_num:03d}"

def calculate_cvss_score(vector: str) -> tuple:
    """Calculate CVSS v3.1 Base Score from vector string"""
    if not vector or not vector.startswith('CVSS:3.1/'):
        return None, None
    
    # Simplified CVSS calculation (you may want to use a library like cvss for accurate calculation)
    # For now, return a placeholder
    # TODO: Implement proper CVSS calculation
    score = 7.5  # Placeholder
    
    if score >= 9.0:
        severity = "Critical"
    elif score >= 7.0:
        severity = "High"
    elif score >= 4.0:
        severity = "Medium"
    else:
        severity = "Low"
    
    return score, severity

@api_router.post("/vulnerabilities", response_model=Vulnerability)
async def create_vulnerability(vulnerability: VulnerabilityCreate, current_user: User = Depends(get_current_user)):
    vuln_dict = vulnerability.model_dump()
    
    if not vuln_dict.get('vulnerability_number'):
        vuln_dict['vulnerability_number'] = generate_vulnerability_number()
    
    # Calculate CVSS score if vector is provided
    if vuln_dict.get('cvss_vector'):
        score, severity = calculate_cvss_score(vuln_dict['cvss_vector'])
        vuln_dict['cvss_score'] = score
        vuln_dict['severity'] = severity
    
    vuln_dict['id'] = str(uuid.uuid4())
    vuln_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    vuln_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Convert datetime fields to ISO string
    if vuln_dict.get('discovery_date'):
        vuln_dict['discovery_date'] = vuln_dict['discovery_date'].isoformat()
    if vuln_dict.get('closure_date'):
        vuln_dict['closure_date'] = vuln_dict['closure_date'].isoformat()
    
    await db.vulnerabilities.insert_one(vuln_dict)
    return vuln_dict

@api_router.get("/vulnerabilities", response_model=PaginatedVulnerabilities)
async def get_vulnerabilities(
    page: int = 1,
    limit: int = 20,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    current_user: User = Depends(get_current_user)
):
    skip = (page - 1) * limit
    sort_direction = -1 if sort_order == "desc" else 1
    total = await db.vulnerabilities.count_documents({})
    
    vulnerabilities = await db.vulnerabilities.find({}, {"_id": 0}).sort(sort_by, sort_direction).skip(skip).limit(limit).to_list(limit)
    
    for vuln in vulnerabilities:
        for field in ['created_at', 'updated_at', 'discovery_date', 'closure_date']:
            if vuln.get(field) and isinstance(vuln[field], str):
                vuln[field] = datetime.fromisoformat(vuln[field])
    
    total_pages = (total + limit - 1) // limit
    
    return PaginatedVulnerabilities(
        items=vulnerabilities,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages
    )

@api_router.get("/vulnerabilities/{vulnerability_id}", response_model=Vulnerability)
async def get_vulnerability(vulnerability_id: str, current_user: User = Depends(get_current_user)):
    vuln = await db.vulnerabilities.find_one({"id": vulnerability_id}, {"_id": 0})
    if not vuln:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    
    for field in ['created_at', 'updated_at', 'discovery_date', 'closure_date']:
        if vuln.get(field) and isinstance(vuln[field], str):
            vuln[field] = datetime.fromisoformat(vuln[field])
    
    return vuln

@api_router.put("/vulnerabilities/{vulnerability_id}", response_model=Vulnerability)
async def update_vulnerability(vulnerability_id: str, vulnerability: VulnerabilityUpdate, current_user: User = Depends(get_current_user)):
    update_dict = {k: v for k, v in vulnerability.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate CVSS score if vector changed
    if 'cvss_vector' in update_dict and update_dict['cvss_vector']:
        score, severity = calculate_cvss_score(update_dict['cvss_vector'])
        update_dict['cvss_score'] = score
        update_dict['severity'] = severity
    
    # Convert datetime fields
    for field in ['discovery_date', 'closure_date']:
        if field in update_dict and update_dict[field]:
            update_dict[field] = update_dict[field].isoformat()
    
    result = await db.vulnerabilities.update_one({"id": vulnerability_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    
    updated = await db.vulnerabilities.find_one({"id": vulnerability_id}, {"_id": 0})
    for field in ['created_at', 'updated_at', 'discovery_date', 'closure_date']:
        if updated.get(field) and isinstance(updated[field], str):
            updated[field] = datetime.fromisoformat(updated[field])
    
    return updated

@api_router.delete("/vulnerabilities/{vulnerability_id}")
async def delete_vulnerability(vulnerability_id: str, current_user: User = Depends(get_current_user)):
    result = await db.vulnerabilities.delete_one({"id": vulnerability_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vulnerability not found")
    return {"message": "Vulnerability deleted"}

# ==================== MITRE ATT&CK ====================

@api_router.get("/mitre-attack")
async def get_mitre_attack_techniques(current_user: User = Depends(get_current_user)):
    """Get MITRE ATT&CK techniques from database"""
    techniques = await db.mitre_attack.find({}, {"_id": 0}).to_list(1000)
    return techniques

# ==================== DASHBOARD ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_risks = await db.risks.count_documents({})
    total_incidents = await db.incidents.count_documents({})
    total_assets = await db.assets.count_documents({})
    
    critical_risks = await db.risks.count_documents({"risk_level": "Критический"})
    open_incidents = await db.incidents.count_documents({"status": "Открыт"})
    critical_assets = await db.assets.count_documents({"criticality": "Высокая"})
    
    # Calculate average metrics
    incidents = await db.incidents.find({}, {"_id": 0, "mtta": 1, "mttr": 1, "mttc": 1}).to_list(1000)
    
    mtta_values = [inc['mtta'] for inc in incidents if inc.get('mtta')]
    mttr_values = [inc['mttr'] for inc in incidents if inc.get('mttr')]
    mttc_values = [inc['mttc'] for inc in incidents if inc.get('mttc')]
    
    # Convert from minutes to hours
    avg_mtta = round(sum(mtta_values) / len(mtta_values) / 60, 2) if mtta_values else None
    avg_mttr = round(sum(mttr_values) / len(mttr_values) / 60, 2) if mttr_values else None
    avg_mttc = round(sum(mttc_values) / len(mttc_values) / 60, 2) if mttc_values else None
    
    return DashboardStats(
        total_risks=total_risks,
        total_incidents=total_incidents,
        total_assets=total_assets,
        critical_risks=critical_risks,
        open_incidents=open_incidents,
        critical_assets=critical_assets,
        avg_mtta=avg_mtta,
        avg_mttr=avg_mttr,
        avg_mttc=avg_mttc
    )

# ==================== INIT ADMIN ====================

@app.on_event("startup")
async def create_admin():
    admin = await db.users.find_one({"username": "admin"})
    if not admin:
        admin_user = User(
            username="admin",
            full_name="Администратор системы",
            email="admin@securisk.com",
            role="Администратор"
        )
        doc = admin_user.model_dump()
        doc['password'] = hash_password("admin123")
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)
        logger.info("Admin user created: username=admin, password=admin123")

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
