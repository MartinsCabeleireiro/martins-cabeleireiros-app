from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import logging
from datetime import datetime, timezone, timedelta, date as date_cls
from typing import Annotated, Optional, List, Literal

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from starlette.middleware.cors import CORSMiddleware

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")
JWT_ALGORITHM = "HS256"

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        return cls.model_validate(doc)

    def to_mongo(self):
        data = self.model_dump(by_alias=True, exclude_none=False)
        if data.get("_id") is None:
            data.pop("_id", None)
        return data

    def public(self):
        return self.model_dump()


class Service(BaseDocument):
    slug: str
    name: str
    description: str
    group: str = ""
    duration_min: int = 30
    price: Optional[float] = None
    order: int = 0


class Booking(BaseDocument):
    name: str
    phone: str
    service_slug: str
    service_name: str
    price: Optional[float] = None
    duration_min: int = 30
    date: str
    time: str
    notes: str = ""
    status: Literal["pendente", "confirmado", "cancelado"] = "pendente"
    created_at: str


class BookingIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=8, max_length=25)
    service_slug: str
    date: str
    time: str
    notes: str = Field(default="", max_length=300)


class StatusIn(BaseModel):
    status: Literal["pendente", "confirmado", "cancelado"]


class PriceIn(BaseModel):
    price: Optional[float] = Field(default=None, ge=0)


class LoginIn(BaseModel):
    email: str
    password: str


SEED_SERVICES = [
    ("corte-masculino", "Corte Masculino", "corte", 30, "Corte clássico ou moderno com acabamento preciso."),
    ("corte-feminino", "Corte Feminino", "corte", 45, "Corte personalizado para o seu estilo."),
    ("coloracao", "Coloração", "coloracao", 90, "Cor uniforme e brilho para os fios."),
    ("luzes", "Luzes", "coloracao", 150, "Luzes e mechas para iluminar o visual."),
    ("escova", "Escova", "escova", 40, "Escova modelada, lisa ou com movimento."),
    ("hidratacao", "Hidratação", "escova", 45, "Hidratação para fios macios e alinhados."),
    ("sobrancelha", "Designer de Sobrancelha", "sobrancelha", 20, "Desenho que valoriza o olhar e a harmonia do rosto."),
    ("selagem", "Selagem", "tratamentos", 240, "Tratamento capilar que reduz o volume e o frizz."),
]

SLOTS = [f"{h:02d}:{m:02d}" for h in range(8, 20) for m in (0, 30)]
CLOSE_MIN = 20 * 60


def to_min(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)


async def busy_intervals(date: str):
    docs = await db.bookings.find({"date": date, "status": {"$ne": "cancelado"}}, {"time": 1, "duration_min": 1}).to_list(500)
    return [(to_min(d["time"]), to_min(d["time"]) + d.get("duration_min", 30)) for d in docs]


def slot_free(start: int, duration: int, busy) -> bool:
    end = start + duration
    return end <= CLOSE_MIN and all(end <= b0 or start >= b1 for b0, b1 in busy)


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(hours=12)}
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


async def get_admin(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(401, "Não autenticado")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Token inválido")
    if payload.get("type") != "access":
        raise HTTPException(401, "Token inválido")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])}, {"password_hash": 0})
    if not user or user.get("role") != "admin":
        raise HTTPException(401, "Não autorizado")
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name"), "role": user["role"]}


@api.get("/")
async def root():
    return {"message": "Martins Cabeleireiro API"}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request):
    email = body.email.strip().lower()
    ident = f"{request.client.host if request.client else 'x'}:{email}"
    att = await db.login_attempts.find_one({"identifier": ident})
    now = datetime.now(timezone.utc)
    if att and att.get("count", 0) >= 5 and att.get("locked_until") and datetime.fromisoformat(att["locked_until"]) > now:
        raise HTTPException(429, "Muitas tentativas. Tente novamente em 15 minutos.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (att or {}).get("count", 0) + 1
        if att and att.get("locked_until") and datetime.fromisoformat(att["locked_until"]) <= now:
            count = 1
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$set": {"count": count, "locked_until": (now + timedelta(minutes=15)).isoformat() if count >= 5 else None}},
            upsert=True)
        raise HTTPException(401, "E-mail ou senha incorretos")
    await db.login_attempts.delete_many({"identifier": ident})
    uid = str(user["_id"])
    return {"token": create_access_token(uid, email),
            "user": {"id": uid, "email": email, "name": user.get("name"), "role": user["role"]}}


@api.get("/auth/me")
async def me(admin: dict = Depends(get_admin)):
    return admin


@api.get("/services")
async def list_services():
    docs = await db.services.find().sort("order", 1).to_list(100)
    return [Service.from_mongo(d).public() for d in docs]


@api.put("/services/{slug}")
async def update_price(slug: str, body: PriceIn, admin: dict = Depends(get_admin)):
    res = await db.services.update_one({"slug": slug}, {"$set": {"price": body.price}})
    if res.matched_count == 0:
        raise HTTPException(404, "Serviço não encontrado")
    return Service.from_mongo(await db.services.find_one({"slug": slug})).public()


@api.get("/availability")
async def availability(date: str, service: Optional[str] = None):
    svc = await db.services.find_one({"slug": service}) if service else None
    duration = svc["duration_min"] if svc else 30
    busy = await busy_intervals(date)
    unavailable = [s for s in SLOTS if not slot_free(to_min(s), duration, busy)]
    return {"date": date, "duration_min": duration, "slots": SLOTS, "unavailable": unavailable}


@api.post("/bookings")
async def create_booking(body: BookingIn):
    try:
        d = date_cls.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(400, "Data inválida")
    if d.weekday() == 6:
        raise HTTPException(400, "Não abrimos aos domingos")
    if d < (datetime.now(timezone.utc) - timedelta(hours=4)).date():
        raise HTTPException(400, "Escolha uma data futura")
    if body.time not in SLOTS:
        raise HTTPException(400, "Horário inválido")
    if not re.search(r"\d{8,}", re.sub(r"\D", "", body.phone)):
        raise HTTPException(400, "Telefone inválido")
    svc = await db.services.find_one({"slug": body.service_slug})
    if not svc:
        raise HTTPException(400, "Serviço inválido")
    duration = svc.get("duration_min", 30)
    if to_min(body.time) + duration > CLOSE_MIN:
        raise HTTPException(400, "Este serviço não termina antes do fechamento (20:00). Escolha um horário mais cedo.")
    if not slot_free(to_min(body.time), duration, await busy_intervals(body.date)):
        raise HTTPException(409, "Este horário conflita com outro agendamento. Escolha outro.")
    booking = Booking(name=body.name.strip(), phone=body.phone.strip(), service_slug=svc["slug"],
                      service_name=svc["name"], price=svc.get("price"), duration_min=duration,
                      date=body.date, time=body.time,
                      notes=body.notes.strip(), created_at=datetime.now(timezone.utc).isoformat())
    res = await db.bookings.insert_one(booking.to_mongo())
    booking.id = str(res.inserted_id)
    return booking.public()


@api.get("/bookings", response_model=List[dict])
async def list_bookings(admin: dict = Depends(get_admin)):
    docs = await db.bookings.find().sort([("date", -1), ("time", 1)]).to_list(1000)
    return [Booking.from_mongo(d).public() for d in docs]


@api.patch("/bookings/{bid}")
async def update_booking(bid: str, body: StatusIn, admin: dict = Depends(get_admin)):
    if not ObjectId.is_valid(bid):
        raise HTTPException(404, "Agendamento não encontrado")
    res = await db.bookings.update_one({"_id": ObjectId(bid)}, {"$set": {"status": body.status}})
    if res.matched_count == 0:
        raise HTTPException(404, "Agendamento não encontrado")
    return Booking.from_mongo(await db.bookings.find_one({"_id": ObjectId(bid)})).public()


@api.delete("/bookings/{bid}")
async def delete_booking(bid: str, admin: dict = Depends(get_admin)):
    if not ObjectId.is_valid(bid):
        raise HTTPException(404, "Agendamento não encontrado")
    await db.bookings.delete_one({"_id": ObjectId(bid)})
    return {"ok": True}


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.services.create_index("slug", unique=True)
    for i, (slug, name, group, dur, desc) in enumerate(SEED_SERVICES):
        await db.services.update_one(
            {"slug": slug},
            {"$set": {"name": name, "group": group, "duration_min": dur, "description": desc, "order": i},
             "$setOnInsert": {"price": None}},
            upsert=True)
    await db.services.delete_many({"slug": {"$nin": [s[0] for s in SEED_SERVICES]}})
    email = os.environ["ADMIN_EMAIL"].lower()
    pw = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({"email": email, "password_hash": hash_password(pw), "name": "Admin",
                                   "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()})
    elif not verify_password(pw, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pw)}})


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
logging.basicConfig(level=logging.INFO)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
