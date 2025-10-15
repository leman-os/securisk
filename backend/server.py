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
    category: str  # "Технический", "Организационный", "Физический", etc.
    likelihood: str  # "Низкая", "Средняя", "Высокая"
    impact: str  # "Низкое", "Среднее", "Высокое", "Критическое"
    risk_level: str  # "Низкий", "Средний", "Высокий", "Критический"
    status: str  # "Идентифицирован", "Оценен", "В обработке", "Закрыт"
    owner: str  # Username ответственного
    treatment_measures: Optional[str] = None
    deadline: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    priority: int = Field(default=0)  # For drag-and-drop ordering

class RiskCreate(BaseModel):
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
    incident_number: str
    title: str
    description: str
    incident_type: str  # "Утечка данных", "Вирус", "Взлом", "DDoS", etc.
    severity: str  # "Низкая", "Средняя", "Высокая", "Критическая"
    status: str  # "Новый", "В работе", "Решен", "Закрыт"
    detected_at: datetime
    acknowledged_at: Optional[datetime] = None  # Когда взят в работу
    resolved_at: Optional[datetime] = None  # Когда решен
    closed_at: Optional[datetime] = None  # Когда закрыт
    source: Optional[str] = None
    affected_assets: Optional[str] = None
    owner: str
    actions: Optional[str] = None
    mtta: Optional[float] = None  # Mean Time To Acknowledge (в часах)
    mttr: Optional[float] = None  # Mean Time To Resolve (в часах)
    mttc: Optional[float] = None  # Mean Time To Close (в часах)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncidentCreate(BaseModel):
    incident_number: str
    title: str
    description: str
    incident_type: str
    severity: str
    status: str
    detected_at: datetime
    source: Optional[str] = None
    affected_assets: Optional[str] = None
    owner: str
    actions: Optional[str] = None

class IncidentUpdate(BaseModel):
    incident_number: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    incident_type: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    detected_at: Optional[datetime] = None
    source: Optional[str] = None
    affected_assets: Optional[str] = None
    owner: Optional[str] = None
    actions: Optional[str] = None
    closed_at: Optional[datetime] = None

class Asset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    asset_number: str
    name: str
    asset_type: str  # "Сервер", "Рабочая станция", "Сеть", "ПО", "Данные"
    criticality: str  # "Низкая", "Средняя", "Высокая", "Критическая"
    owner: str
    location: Optional[str] = None
    status: str  # "Активен", "Неактивен", "На обслуживании"
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssetCreate(BaseModel):
    asset_number: str
    name: str
    asset_type: str
    criticality: str
    owner: str
    location: Optional[str] = None
    status: str
    description: Optional[str] = None

class AssetUpdate(BaseModel):
    asset_number: Optional[str] = None
    name: Optional[str] = None
    asset_type: Optional[str] = None
    criticality: Optional[str] = None
    owner: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None

class DashboardStats(BaseModel):
    total_risks: int
    total_incidents: int
    total_assets: int
    critical_risks: int
    open_incidents: int
    critical_assets: int

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
        
        # Parse datetime
        if isinstance(user_doc.get('created_at'), str):
            user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
        
        return User(**user_doc)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    # Only admins can create users
    if current_user.role != "Администратор":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    # Check if username exists
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
    
    # Create token
    access_token = create_access_token({"sub": user_doc['username']})
    
    # Return user without password
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

# ==================== RISK ENDPOINTS ====================

@api_router.post("/risks", response_model=Risk)
async def create_risk(risk_data: RiskCreate, current_user: User = Depends(get_current_user)):
    risk = Risk(**risk_data.model_dump())
    doc = risk.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.risks.insert_one(doc)
    return risk

@api_router.get("/risks", response_model=List[Risk])
async def get_risks(current_user: User = Depends(get_current_user)):
    risks = await db.risks.find({}, {"_id": 0}).sort("priority", 1).to_list(1000)
    for risk in risks:
        if isinstance(risk.get('created_at'), str):
            risk['created_at'] = datetime.fromisoformat(risk['created_at'])
        if isinstance(risk.get('updated_at'), str):
            risk['updated_at'] = datetime.fromisoformat(risk['updated_at'])
    return risks

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
    incident = Incident(**incident_data.model_dump())
    doc = incident.model_dump()
    doc['detected_at'] = doc['detected_at'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    if doc.get('closed_at'):
        doc['closed_at'] = doc['closed_at'].isoformat()
    await db.incidents.insert_one(doc)
    return incident

@api_router.get("/incidents", response_model=List[Incident])
async def get_incidents(current_user: User = Depends(get_current_user)):
    incidents = await db.incidents.find({}, {"_id": 0}).to_list(1000)
    for incident in incidents:
        if isinstance(incident.get('detected_at'), str):
            incident['detected_at'] = datetime.fromisoformat(incident['detected_at'])
        if isinstance(incident.get('created_at'), str):
            incident['created_at'] = datetime.fromisoformat(incident['created_at'])
        if isinstance(incident.get('updated_at'), str):
            incident['updated_at'] = datetime.fromisoformat(incident['updated_at'])
        if isinstance(incident.get('closed_at'), str):
            incident['closed_at'] = datetime.fromisoformat(incident['closed_at'])
    return incidents

@api_router.get("/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str, current_user: User = Depends(get_current_user)):
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    if isinstance(incident.get('detected_at'), str):
        incident['detected_at'] = datetime.fromisoformat(incident['detected_at'])
    if isinstance(incident.get('created_at'), str):
        incident['created_at'] = datetime.fromisoformat(incident['created_at'])
    if isinstance(incident.get('updated_at'), str):
        incident['updated_at'] = datetime.fromisoformat(incident['updated_at'])
    if isinstance(incident.get('closed_at'), str):
        incident['closed_at'] = datetime.fromisoformat(incident['closed_at'])
    return Incident(**incident)

@api_router.put("/incidents/{incident_id}", response_model=Incident)
async def update_incident(incident_id: str, incident_data: IncidentUpdate, current_user: User = Depends(get_current_user)):
    update_dict = {k: v for k, v in incident_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    # Serialize datetimes
    for key in ['detected_at', 'closed_at']:
        if key in update_dict and isinstance(update_dict[key], datetime):
            update_dict[key] = update_dict[key].isoformat()
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.incidents.update_one({"id": incident_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    incident = await db.incidents.find_one({"id": incident_id}, {"_id": 0})
    if isinstance(incident.get('detected_at'), str):
        incident['detected_at'] = datetime.fromisoformat(incident['detected_at'])
    if isinstance(incident.get('created_at'), str):
        incident['created_at'] = datetime.fromisoformat(incident['created_at'])
    if isinstance(incident.get('updated_at'), str):
        incident['updated_at'] = datetime.fromisoformat(incident['updated_at'])
    if isinstance(incident.get('closed_at'), str):
        incident['closed_at'] = datetime.fromisoformat(incident['closed_at'])
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
    asset = Asset(**asset_data.model_dump())
    doc = asset.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.assets.insert_one(doc)
    return asset

@api_router.get("/assets", response_model=List[Asset])
async def get_assets(current_user: User = Depends(get_current_user)):
    assets = await db.assets.find({}, {"_id": 0}).to_list(1000)
    for asset in assets:
        if isinstance(asset.get('created_at'), str):
            asset['created_at'] = datetime.fromisoformat(asset['created_at'])
        if isinstance(asset.get('updated_at'), str):
            asset['updated_at'] = datetime.fromisoformat(asset['updated_at'])
    return assets

@api_router.get("/assets/{asset_id}", response_model=Asset)
async def get_asset(asset_id: str, current_user: User = Depends(get_current_user)):
    asset = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if isinstance(asset.get('created_at'), str):
        asset['created_at'] = datetime.fromisoformat(asset['created_at'])
    if isinstance(asset.get('updated_at'), str):
        asset['updated_at'] = datetime.fromisoformat(asset['updated_at'])
    return Asset(**asset)

@api_router.put("/assets/{asset_id}", response_model=Asset)
async def update_asset(asset_id: str, asset_data: AssetUpdate, current_user: User = Depends(get_current_user)):
    update_dict = {k: v for k, v in asset_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.assets.update_one({"id": asset_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if isinstance(asset.get('created_at'), str):
        asset['created_at'] = datetime.fromisoformat(asset['created_at'])
    if isinstance(asset.get('updated_at'), str):
        asset['updated_at'] = datetime.fromisoformat(asset['updated_at'])
    return Asset(**asset)

@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, current_user: User = Depends(get_current_user)):
    result = await db.assets.delete_one({"id": asset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"message": "Asset deleted"}

# ==================== DASHBOARD ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_risks = await db.risks.count_documents({})
    total_incidents = await db.incidents.count_documents({})
    total_assets = await db.assets.count_documents({})
    
    critical_risks = await db.risks.count_documents({"risk_level": "Критический"})
    open_incidents = await db.incidents.count_documents({"status": {"$in": ["Новый", "В работе"]}})
    critical_assets = await db.assets.count_documents({"criticality": "Критическая"})
    
    return DashboardStats(
        total_risks=total_risks,
        total_incidents=total_incidents,
        total_assets=total_assets,
        critical_risks=critical_risks,
        open_incidents=open_incidents,
        critical_assets=critical_assets
    )

# ==================== INIT ADMIN ====================

@app.on_event("startup")
async def create_admin():
    # Check if admin exists
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
