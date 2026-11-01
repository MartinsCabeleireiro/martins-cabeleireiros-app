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

# Inclui o router da API para que todas as rotas com /api comecem a funcionar corretamente
app.include_router(api)

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


@api.post("/bookings/{bid}/reminded")
async def mark_reminded(bid: str, admin: dict = Depends(get_admin)):
    if not ObjectId.is_valid(bid):
        raise HTTPException(404, "Agendamento não encontrado")
    now = datetime.now(timezone.utc).isoformat()
    res = await db.bookings.update_one({"_id": ObjectId(bid)}, {"$set": {"reminded_at": now}})
    if res.matched_count == 0:
        raise HTTPException(404, "Agendamento não encontrado")
    return {"ok": True, "reminded_at": now}


# ---------- Logo ----------
LOGO_TYPES = {"image/png", "image/jpeg", "image/webp"}


@api.get("/settings")
async def get_settings():
    doc = await db.settings.find_one({"key": "logo"}, {"version": 1})
    return {"has_logo": bool(doc), "logo_version": doc.get("version") if doc else None}


@api.get("/logo")
async def get_logo():
    doc = await db.settings.find_one({"key": "logo"})
    if not doc:
        raise HTTPException(404, "Sem logo")
    return Response(content=base64.b64decode(doc["data"]), media_type=doc["content_type"],
                    headers={"Cache-Control": "public, max-age=86400"})


@api.post("/settings/logo")
async def upload_logo(file: UploadFile = File(...), admin: dict = Depends(get_admin)):
    if file.content_type not in LOGO_TYPES:
        raise HTTPException(400, "Envie uma imagem PNG, JPG ou WEBP")
    data = await file.read()
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(400, "A imagem deve ter até 2 MB")
    version = str(int(datetime.now(timezone.utc).timestamp()))
    await db.settings.update_one({"key": "logo"}, {"$set": {
        "data": base64.b64encode(data).decode(), "content_type": file.content_type, "version": version}}, upsert=True)
    return {"has_logo": True, "logo_version": version}


@api.delete("/settings/logo")
async def delete_logo(admin: dict = Depends(get_admin)):
    await db.settings.delete_one({"key": "logo"})
    return {"has_logo": False, "logo_version": None}


# ---------- Contacts ----------
class Contact(BaseDocument):
    name: str
    phone: str
    added_by: str = ""
    created_at: str


class ContactIn(BaseModel):
    name: str = Field(default="", max_length=120)
    phone: str = Field(max_length=40)


class ContactsImport(BaseModel):
    contacts: List[ContactIn] = Field(max_length=5000)


DDDS = {11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
        41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
        71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99}
LOCAL_DDD = "69"


def norm_phone(p: str) -> str:
    d = re.sub(r"\D", "", p or "")
    if d.startswith("55") and len(d) >= 12:
        d = d[2:]
    if d.startswith("0") and len(d) >= 11:
        d = d.lstrip("0")
        if len(d) >= 12:
            d = d[2:]
    if len(d) in (8, 9):
        d = LOCAL_DDD + d
    if len(d) == 10 and d[2] in "6789":
        d = d[:2] + "9" + d[2:]
    if len(d) not in (10, 11) or int(d[:2]) not in DDDS or d[2:5] in ("300", "400"):
        return ""
    if (len(d) == 11 and d[2] != "9") or (len(d) == 10 and d[2] not in "2345"):
        return ""
    return d


def phone_key(p: str) -> str:
    return norm_phone(p) or re.sub(r"\D", "", p or "")


async def upsert_contacts(items: List[ContactIn], who: str):
    now = datetime.now(timezone.utc).isoformat()
    ops, seen = [], set()
    for c in items:
        phone = norm_phone(c.phone)
        if len(phone) < 10 or phone in seen:
            continue
        seen.add(phone)
        name = (c.name or "").strip() or phone
        ops.append(UpdateOne({"phone": phone}, {"$setOnInsert": Contact(
            name=name, phone=phone, added_by=who, created_at=now).to_mongo()}, upsert=True))
    if not ops:
        return 0, len(items)
    res = await db.contacts.bulk_write(ops, ordered=False)
    return res.upserted_count, len(items) - res.upserted_count


@api.get("/contacts")
async def list_contacts(q: str = "", limit: int = 50, admin: dict = Depends(get_admin)):
    query = {}
    if q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        digits = re.sub(r"\D", "", q)
        query = {"$or": [{"name": rx}] + ([{"phone": {"$regex": digits}}] if digits else [])}
    docs = await db.contacts.find(query).sort("name", 1).limit(min(limit, 200)).to_list(200)
    total = await db.contacts.count_documents({})
    items = [Contact.from_mongo(d).public() for d in docs]
    today = (datetime.now(timezone.utc) - timedelta(hours=4)).date().isoformat()
    stats = {}
    async for s in db.bookings.aggregate([
        {"$match": {"phone_digits": {"$in": [c["phone"] for c in items]}, "status": {"$ne": "cancelado"}, "date": {"$lte": today}}},
        {"$group": {"_id": "$phone_digits", "last_visit": {"$max": "$date"}, "visits": {"$sum": 1}}},
    ]):
        stats[s["_id"]] = s
    for c in items:
        c["last_visit"] = stats.get(c["phone"], {}).get("last_visit")
        c["visits"] = stats.get(c["phone"], {}).get("visits", 0)
    return {"total": total, "items": items}


@api.get("/contacts/{cid}/history")
async def contact_history(cid: str, admin: dict = Depends(get_admin)):
    if not ObjectId.is_valid(cid):
        raise HTTPException(404, "Contato não encontrado")
    contact = await db.contacts.find_one({"_id": ObjectId(cid)})
    if not contact:
        raise HTTPException(404, "Contato não encontrado")
    docs = await db.bookings.find({"phone_digits": contact["phone"]}).sort([("date", -1), ("time", -1)]).to_list(500)
    return [Booking.from_mongo(d).public() for d in docs]


@api.post("/contacts")
async def add_contact(body: ContactIn, admin: dict = Depends(get_admin)):
    added, _ = await upsert_contacts([body], admin["name"] or admin["email"])
    if not added:
        raise HTTPException(400, "Telefone inválido ou contato já cadastrado")
    return {"ok": True}


@api.post("/contacts/import")
async def import_contacts(body: ContactsImport, admin: dict = Depends(get_admin)):
    added, skipped = await upsert_contacts(body.contacts, admin["name"] or admin["email"])
    return {"added": added, "skipped": skipped}


@api.delete("/contacts/{cid}")
async def delete_contact(cid: str, admin: dict = Depends(get_admin)):
    if not ObjectId.is_valid(cid):
        raise HTTPException(404, "Contato não encontrado")
    await db.contacts.delete_one({"_id": ObjectId(cid)})
    return {"ok": True}


async def seed_admin(email: str, pw: str, name: str):
    email = email.lower()
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({"email": email, "password_hash": hash_password(pw), "name": name,
                                   "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()})
    else:
        upd = {"name": name}
        if not verify_password(pw, existing["password_hash"]):
            upd["password_hash"] = hash_password(pw)
