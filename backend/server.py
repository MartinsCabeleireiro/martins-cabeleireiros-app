from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import logging
from datetime import datetime, timezone, timedelta, date as date_cls
from typing import Annotated, Optional, List, Literal

import base64
import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, Response
from pymongo import UpdateOne
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from starlette.middleware.cors import CORSMiddleware

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")
JWT_ALGORITHM = "HS256"

# Rota raiz global para evitar o erro 404 no Render
@app.get("/")
def read_root():
    return {"status": "online", "message": "Backend do Martins Cabeleireiros a funcionar com sucesso!"}

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
    phone_digits: str = ""
    service_slug: str
    service_name: str
    price: Optional[float] = None
    duration_min: int = 30
    date: str
    time: str
    notes: str = ""
    status: Literal["pendente", "confirmado", "cancelado"] = "pendente"
    reminded_at: Optional[str] = None
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


class Block(BaseDocument):
    date: str
    all_day: bool = True
    start: Optional[str] = None
    end: Optional[str] = None
    reason: str = ""
    created_at: str


class BlockIn(BaseModel):
    date: str
    all_day: bool = True
    start: Optional[str] = None
    end: Optional[str] = None
    reason: str = Field(default="", max_length=80)


SEED_SERVICES = [
    ("corte-masculino", "Corte Masculino", "corte", 30, 25, "Corte clássico ou moderno com acabamento preciso."),
    ("corte-feminino", "Corte Feminino", "corte", 45, 30, "Corte personalizado para o seu estilo."),
    ("barba", "Barba", "corte", 30, 20, "Modelagem e acabamento da barba."),
    ("sobrancelha", "Designer de Sobrancelha", "sobrancelha", 20, 20, "Desenho que valoriza o olhar e a harmonia do rosto."),
    ("selagem-masculino", "Selagem Masculino", "tratamentos", 120, 100, "Selagem capilar para o cabelo masculino."),
    ("selagem-tradicional", "Selagem Tradicional", "tratamentos", 240, 150, "Selagem capilar tradicional."),
    ("selagem-organica", "Selagem Orgânica", "tratamentos", 300, 180, "Selagem capilar orgânica."),
    ("botox-tradicional", "Botox Tradicional", "tratamentos", 240, 150, "Botox capilar tradicional."),
    ("botox-organico", "Botox Orgânico", "tratamentos", 240, 150, "Botox capilar orgânico."),
    ("luzes-masculina", "Luzes Masculina", "coloracao", 120, 80, "Luzes para o cabelo masculino."),
    ("luzes", "Luzes", "coloracao", 240, 250, "Luzes e mechas para iluminar o visual."),
    ("coloracao", "Coloração", "coloracao", 90, 80, "Cor uniforme e brilho para os fios."),
    ("escova", "Escova", "escova", 40, 60, "Escova modelada, lisa ou com movimento."),
    ("hidratacao", "Hidratação", "escova", 60, 60, "Hidratação para fios macios e alinhados."),
]

SLOTS = [f"{h:02d}:{m:02d}" for h in range(8, 20) for m in (0, 30)]
CLOSE_MIN = 20 * 60


def to_min(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)


async def busy_intervals(date: str):
    docs = await db.bookings.find({"date": date, "status": {"$ne": "cancelado"}}, {"time": 1, "duration_min": 1}).to_list(500)
    busy = [(to_min(d["time"]), to_min(d["time"]) + d.get("duration_min", 30)) for d in docs]
    async for b in db.blocks.find({"date": date}):
        busy.append((0, 24 * 60) if b.get("all_day") else (to_min(b["start"]), to_min(b["end"])))
    return busy


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


@api.get("/blocked-days")
async def blocked_days():
    return await db.blocks.distinct("date", {"all_day": True})


@api.get("/blocks")
async def list_blocks(admin: dict = Depends(get_admin)):
    docs = await db.blocks.find().sort([("date", 1), ("start", 1)]).to_list(1000)
    return [Block.from_mongo(d).public() for d in docs]


@api.post("/blocks")
async def create_block(body: BlockIn, admin: dict = Depends(get_admin)):
    try:
        date_cls.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(400, "Data inválida")
    if not body.all_day:
        valid = SLOTS + ["20:00"]
        if body.start not in valid or body.end not in valid or to_min(body.end) <= to_min(body.start):
            raise HTTPException(400, "Informe um intervalo de horário válido")
    block = Block(date=body.date, all_day=body.all_day, start=None if body.all_day else body.start,
                  end=None if body.all_day else body.end, reason=body.reason.strip(),
                  created_at=datetime.now(timezone.utc).isoformat())
    res = await db.blocks.insert_one(block.to_mongo())
    block.id = str(res.inserted_id)
    return block.public()


@api.delete("/blocks/{bid}")
async def delete_block(bid: str, admin: dict = Depends(get_admin)):
    if not ObjectId.is_valid(bid):
        raise HTTPException(404, "Bloqueio não encontrado")
    await db.blocks.delete_one({"_id": ObjectId(bid)})
    return {"ok": True}


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
        raise HTTPException(409, "Este horário não está disponível. Escolha outro.")
    booking = Booking(name=body.name.strip(), phone=body.phone.strip(), phone_digits=phone_key(body.phone), service_slug=svc["slug"],
                      service_name=svc["name"], price=svc.get("price"), duration_min=duration,
                      date=body.date, time=body.time,
                      notes=body.notes.strip(), created_at=datetime.now(timezone.utc).isoformat())
    res = await db.bookings.insert_one(booking.to_mongo())
    booking.id = str(res.inserted_id)
    return booking.public()


@api.post("/admin/bookings")
async def admin_create_booking(body: BookingIn, admin: dict = Depends(get_admin)):
    """Encaixe manual: sem travas de horário, sobreposição, bloqueios ou fechamento."""
    try:
        date_cls.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(400, "Data inválida")
    if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", body.time):
        raise HTTPException(400, "Horário inválido")
    svc = await db.services.find_one({"slug": body.service_slug})
    if not svc:
        raise HTTPException(400, "Serviço inválido")
    booking = Booking(name=body.name.strip(), phone=body.phone.strip(), phone_digits=phone_key(body.phone),
                      service_slug=svc["slug"], service_name=svc["name"], price=svc.get("price"),
                      duration_min=svc.get("duration_min", 30), date=body.date, time=body.time,
                      notes=body.notes.strip(), status="confirmado", created_at=datetime.now(timezone.utc).isoformat())
    res = await db.bookings.insert_one(booking.to_mongo())
    booking.id = str(res.inserted_id)
    return booking.public()


@api.get("/bookings", response_model=List[dict])
async def list_bookings(admin: dict = Depends(get_admin)):
    docs = await db.bookings.find().sort([("date", -1), ("time", 
