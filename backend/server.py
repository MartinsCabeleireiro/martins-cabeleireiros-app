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
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, Response, Query
from pymongo import UpdateOne
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from starlette.middleware.cors import CORSMiddleware

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api = APIRouter(prefix="/api")
JWT_ALGORITHM = "HS256"

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


class PromoFields(BaseModel):
    promo_type: Optional[Literal["price", "percent"]] = None
    promo_value: Optional[float] = Field(default=None, ge=0)
    promo_start: Optional[str] = None
    promo_end: Optional[str] = None


def today_local() -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=4)).date().isoformat()


def with_promo(d: dict) -> dict:
    price, t = d.get("price"), today_local()
    active = bool(d.get("promo_type") and d.get("promo_value") is not None and price is not None
                  and (not d.get("promo_start") or d["promo_start"] <= t)
                  and (not d.get("promo_end") or t <= d["promo_end"]))
    final = price
    if active:
        final = d["promo_value"] if d["promo_type"] == "price" else round(price * (1 - min(d["promo_value"], 100) / 100), 2)
    d["promo_active"], d["final_price"] = active, final
    return d


class Service(BaseDocument, PromoFields):
    slug: str
    name: str
    description: str
    group: str = ""
    duration_min: int = 30
    price: Optional[float] = None
    order: int = 0


class Product(BaseDocument, PromoFields):
    name: str
    description: str = ""
    price: Optional[float] = None
    active: bool = True
    created_at: str = ""


class ProductIn(PromoFields):
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=200)
    price: Optional[float] = Field(default=None, ge=0)
    active: bool = True


class ServiceUpdate(PromoFields):
    price: Optional[float] = Field(default=None, ge=0)


class Booking(BaseDocument):
    name: str
    phone: str
    phone_digits: str = ""
    service_slug: str
    service_name: str
    services: List[dict] = []
    products: List[dict] = []
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
    service_slugs: List[str] = Field(min_length=1, max_length=10)
    product_ids: List[str] = Field(default=[], max_length=20)
    date: str
    time: str
    notes: str = Field(default="", max_length=300)


class StatusIn(BaseModel):
    status: Literal["pendente", "confirmado", "cancelado"]


class LoginIn(BaseModel):
    email: str
    password: str


class Block(BaseDocument):
    date: str
    until: Optional[str] = None
    forever: bool = False
    scope: str = "dia"
    except_dates: List[str] = []
    all_day: bool = True
    start: Optional[str] = None
    end: Optional[str] = None
    reason: str = ""
    created_at: str


class BlockIn(BaseModel):
    date: str
    scope: Literal["dia", "semana", "mes", "ano", "indeterminado"] = "dia"
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


def block_query(d: str) -> dict:
    return {"date": {"$lte": d}, "except_dates": {"$ne": d},
            "$or": [{"forever": True}, {"until": {"$gte": d}}, {"until": None, "date": d}]}


def block_applies(b: dict, d: str) -> bool:
    if b["date"] > d or d in b.get("except_dates", []):
        return False
    return b.get("forever") or (b.get("until") or b["date"]) >= d


def block_interval(b: dict):
    return (0, 24 * 60) if b.get("all_day") else (to_min(b["start"]), to_min(b["end"]))


async def busy_intervals(date: str, exclude: Optional[str] = None):
    q = {"date": date, "status": {"$ne": "cancelado"}}
    if exclude and ObjectId.is_valid(exclude):
        q["_id"] = {"$ne": ObjectId(exclude)}
    docs = await db.bookings.find(q, {"time": 1, "duration_min": 1}).to_list(500)
    busy = [(to_min(d["time"]), to_min(d["time"]) + d.get("duration_min", 30)) for d in docs]
    async for b in db.blocks.find(block_query(date)):
        busy.append(block_interval(b))
    return busy


async def resolve_items(slugs: List[str], product_ids: List[str]):
    svcs, prods = [], []
    for s in slugs:
        doc = await db.services.find_one({"slug": s})
        if not doc:
            raise HTTPException(400, "Serviço inválido")
        doc = with_promo(doc)
        svcs.append({"slug": doc["slug"], "name": doc["name"], "duration_min": doc.get("duration_min", 30),
                     "price": doc.get("final_price"), "promo": doc["promo_active"]})
    for pid in product_ids:
        doc = await db.products.find_one({"_id": ObjectId(pid), "active": True}) if ObjectId.is_valid(pid) else None
        if not doc:
            raise HTTPException(400, "Produto inválido")
        doc = with_promo(doc)
        prods.append({"id": pid, "name": doc["name"], "price": doc.get("final_price"), "promo": doc["promo_active"]})
    known = [x["price"] for x in svcs + prods if x["price"] is not None]
    return {"services": svcs, "products": prods, "service_slug": svcs[0]["slug"],
            "service_name": " + ".join([x["name"] for x in svcs + prods]),
            "price": round(sum(known), 2) if known else None,
            "duration_min": sum(x["duration_min"] for x in svcs)}


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
    return [with_promo(Service.from_mongo(d).public()) for d in docs]


@api.get("/products")
async def list_products():
    docs = await db.products.find({"active": True}).sort("name", 1).to_list(200)
    return [with_promo(Product.from_mongo(d).public()) for d in docs]


@api.get("/admin/products")
async def admin_products(admin: dict = Depends(get_admin)):
    docs = await db.products.find().sort("name", 1).to_list(200)
    return [with_promo(Product.from_mongo(d).public()) for d in docs]


@api.post("/admin/products")
async def create_product(body: ProductIn, admin: dict = Depends(get_admin)):
    p = Product(**body.model_dump(), created_at=datetime.now(timezone.utc).isoformat())
    res = await db.products.insert_one(p.to_mongo())
    p.id = str(res.inserted_id)
    return with_promo(p.public())


@api.put("/admin/products/{pid}")
async def update_product(pid: str, body: ProductIn, admin: dict = Depends(get_admin)):
    if not ObjectId.is_valid(pid):
        raise HTTPException(404, "Produto não encontrado")
    res = await db.products.update_one({"_id": ObjectId(pid)}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Produto não encontrado")
    return with_promo(Product.from_mongo(await db.products.find_one({"_id": ObjectId(pid)})).public())


@api.delete("/admin/products/{pid}")
async def delete_product(pid: str, admin: dict = Depends(get_admin)):
    if ObjectId.is_valid(pid):
        await db.products.delete_one({"_id": ObjectId(pid)})
    return {"ok": True}


@api.get("/blocked-days")
async def blocked_days():
    start = date_cls.fromisoformat(today_local())
    days = [(start + timedelta(days=i)).isoformat() for i in range(366)]
    blocks = await db.blocks.find({"all_day": True}).to_list(1000)
    return [d for d in days if any(block_applies(b, d) for b in blocks)]


@api.get("/blocks")
async def list_blocks(admin: dict = Depends(get_admin)):
    docs = await db.blocks.find().sort([("date", 1), ("start", 1)]).to_list(1000)
    return [Block.from_mongo(d).public() for d in docs]


SCOPE_DAYS = {"dia": 0, "semana": 6, "mes": 29, "ano": 364}


@api.post("/blocks")
async def create_block(body: BlockIn, admin: dict = Depends(get_admin)):
    try:
        d0 = date_cls.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(400, "Data inválida")
    if not body.all_day:
        valid = SLOTS + ["20:00"]
        if body.start not in valid or body.end not in valid or to_min(body.end) <= to_min(body.start):
            raise HTTPException(400, "Informe um intervalo de horário válido")
    forever = body.scope == "indeterminado"
    until = None if forever else (d0 + timedelta(days=SCOPE_DAYS[body.scope])).isoformat()
    block = Block(date=body.date, until=until, forever=forever, scope=body.scope, all_day=body.all_day,
                  start=None if body.all_day else body.start, end=None if body.all_day else body.end,
                  reason=body.reason.strip(), created_at=datetime.now(timezone.utc).isoformat())
    res = await db.blocks.insert_one(block.to_mongo())
    block.id = str(res.inserted_id)
    return block.public()


class SkipIn(BaseModel):
    date: str


@api.post("/blocks/{bid}/skip")
async def skip_block_day(bid: str, body: SkipIn, admin: dict = Depends(get_admin)):
    """Desbloqueia apenas um dia de uma regra (remove a regra se for de um dia só)."""
    b = await db.blocks.find_one({"_id": ObjectId(bid)}) if ObjectId.is_valid(bid) else None
    if not b:
        raise HTTPException(404, "Bloqueio não encontrado")
    if not b.get("forever") and (b.get("until") or b["date"]) == b["date"]:
        await db.blocks.delete_one({"_id": b["_id"]})
    else:
        await db.blocks.update_one({"_id": b["_id"]}, {"$addToSet": {"except_dates": body.date}})
    return {"ok": True}


@api.get("/admin/month")
async def month_overview(month: str, admin: dict = Depends(get_admin)):
    try:
        first = date_cls.fromisoformat(f"{month}-01")
    except ValueError:
        raise HTTPException(400, "Mês inválido")
    nxt = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
    bookings = await db.bookings.find({"date": {"$gte": first.isoformat(), "$lt": nxt.isoformat()},
                                       "status": {"$ne": "cancelado"}}, {"date": 1, "time": 1, "duration_min": 1}).to_list(5000)
    blocks = await db.blocks.find({"date": {"$lt": nxt.isoformat()}}).to_list(1000)
    out, d = [], first
    while d < nxt:
        ds = d.isoformat()
        bl = [b for b in blocks if block_applies(b, ds)]
        bk = [(to_min(x["time"]), to_min(x["time"]) + x.get("duration_min", 30)) for x in bookings if x["date"] == ds]
        if d.weekday() == 6:
            status = "fechado"
        elif any(b.get("all_day") for b in bl):
            status = "bloqueado"
        else:
            busy = bk + [block_interval(b) for b in bl]
            if not any(slot_free(to_min(s), 30, busy) for s in SLOTS):
                status = "lotado"
            else:
                status = "parcial" if bk else "livre"
        out.append({"date": ds, "status": status, "count": len(bk), "blocks": len(bl)})
        d += timedelta(days=1)
    return out


@api.delete("/blocks/{bid}")
async def delete_block(bid: str, admin: dict = Depends(get_admin)):
    if not ObjectId.is_valid(bid):
        raise HTTPException(404, "Bloqueio não encontrado")
    await db.blocks.delete_one({"_id": ObjectId(bid)})
    return {"ok": True}


@api.put("/services/{slug}")
async def update_service(slug: str, body: ServiceUpdate, admin: dict = Depends(get_admin)):
    res = await db.services.update_one({"slug": slug}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Serviço não encontrado")
    return with_promo(Service.from_mongo(await db.services.find_one({"slug": slug})).public())


@api.get("/availability")
async def availability(date: str, services: str = "", service: Optional[str] = None, exclude: Optional[str] = None):
    slugs = [s for s in services.split(",") if s] or ([service] if service else [])
    duration = 0
    for s in slugs:
        svc = await db.services.find_one({"slug": s})
        duration += svc["duration_min"] if svc else 0
    duration = duration or 30
    busy = await busy_intervals(date, exclude)
    unavailable = [s for s in SLOTS if not slot_free(to_min(s), duration, busy)]
    return {"date": date, "duration_min": duration, "slots": SLOTS, "unavailable": unavailable}


def new_booking(body: BookingIn, items: dict, status: str = "pendente") -> Booking:
    return Booking(name=body.name.strip(), phone=body.phone.strip(), phone_digits=phone_key(body.phone),
                   date=body.date, time=body.time, notes=body.notes.strip(), status=status,
                   created_at=datetime.now(timezone.utc).isoformat(), **items)


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
    items = await resolve_items(body.service_slugs, body.product_ids)
    duration = items["duration_min"]
    if to_min(body.time) + duration > CLOSE_MIN:
        raise HTTPException(400, "Estes serviços não terminam antes do fechamento (20:00). Escolha um horário mais cedo.")
    if not slot_free(to_min(body.time), duration, await busy_intervals(body.date)):
        raise HTTPException(409, "Este horário não está disponível. Escolha outro.")
    booking = new_booking(body, items)
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
    booking = new_booking(body, await resolve_items(body.service_slugs, body.product_ids), "confirmado")
    res = await db.bookings.insert_one(booking.to_mongo())
    booking.id = str(res.inserted_id)
    await upsert_contacts([ContactIn(name=body.name, phone=body.phone)], admin["name"] or admin["email"], "Geral")
    return booking.public()


@api.put("/admin/bookings/{bid}")
async def admin_edit_booking(bid: str, body: BookingIn, admin: dict = Depends(get_admin)):
    old = await db.bookings.find_one({"_id": ObjectId(bid)}) if ObjectId.is_valid(bid) else None
    if not old:
        raise HTTPException(404, "Agendamento não encontrado")
    try:
        date_cls.fromisoformat(body.date)
    except ValueError:
        raise HTTPException(400, "Data inválida")
    if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", body.time):
        raise HTTPException(400, "Horário inválido")
    items = await resolve_items(body.service_slugs, body.product_ids)
    upd = {"name": body.name.strip(), "phone": body.phone.strip(), "phone_digits": phone_key(body.phone),
           "date": body.date, "time": body.time, "notes": body.notes.strip(), **items}
    if (old["date"], old["time"]) != (body.date, body.time):
        upd["reminded_at"] = None
    await db.bookings.update_one({"_id": old["_id"]}, {"$set": upd})
    conflict = not slot_free(to_min(body.time), items["duration_min"], await busy_intervals(body.date, bid))
    return {**Booking.from_mongo(await db.bookings.find_one({"_id": old["_id"]})).public(), "conflict": conflict}


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
    doc = await db.bookings.find_one({"_id": ObjectId(bid)})
    saved = False
    if body.status == "confirmado":
        added, _ = await upsert_contacts([ContactIn(name=doc["name"], phone=doc["phone"])], admin["name"] or admin["email"], "Agendamentos do site")
        saved = bool(added)
    return {**Booking.from_mongo(doc).public(), "contact_saved": saved}


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
    list: str = "Geral"
    created_at: str


class ContactIn(BaseModel):
    name: str = Field(default="", max_length=120)
    phone: str = Field(max_length=40)
    list: str = Field(default="Geral", max_length=40)


class ContactsImport(BaseModel):
    contacts: List[ContactIn] = Field(max_length=5000)
    list: str = Field(default="Geral", min_length=1, max_length=40)


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


async def upsert_contacts(items: List[ContactIn], who: str, lst: str = "Geral"):
    now = datetime.now(timezone.utc).isoformat()
    ops, seen = [], set()
    for c in items:
        phone = norm_phone(c.phone)
        if len(phone) < 10 or phone in seen:
            continue
        seen.add(phone)
        name = (c.name or "").strip() or phone
        ops.append(UpdateOne({"phone": phone}, {"$setOnInsert": Contact(
            name=name, phone=phone, added_by=who, list=lst.strip() or "Geral", created_at=now).to_mongo()}, upsert=True))
    if not ops:
        return 0, len(items)
    res = await db.contacts.bulk_write(ops, ordered=False)
    return res.upserted_count, len(items) - res.upserted_count


@api.get("/contacts")
async def list_contacts(q: str = "", limit: int = 50, lst: str = Query("", alias="list"), admin: dict = Depends(get_admin)):
    query = {"list": lst} if lst else {}
    if q.strip():
        terms = [t for t in q.strip().split() if t]
        digits = re.sub(r"\D", "", q)
        name_q = {"$and": [{"name": {"$regex": re.escape(t), "$options": "i"}} for t in terms]}
        ors = [name_q] + ([{"phone": {"$regex": digits[-9:] if len(digits) > 9 else digits}}] if len(digits) >= 3 else [])
        query = {**query, "$or": ors}
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


@api.get("/contacts/lists")
async def contact_lists(admin: dict = Depends(get_admin)):
    rows = await db.contacts.aggregate([{"$group": {"_id": {"$ifNull": ["$list", "Geral"]}, "count": {"$sum": 1}}},
                                        {"$sort": {"_id": 1}}]).to_list(100)
    return [{"name": r["_id"], "count": r["count"]} for r in rows]


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
    added, _ = await upsert_contacts([body], admin["name"] or admin["email"], body.list)
    if not added:
        raise HTTPException(400, "Telefone inválido ou contato já cadastrado")
    return {"ok": True}


@api.post("/contacts/import")
async def import_contacts(body: ContactsImport, admin: dict = Depends(get_admin)):
    added, skipped = await upsert_contacts(body.contacts, admin["name"] or admin["email"], body.list)
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
        await db.users.update_one({"email": email}, {"$set": upd})


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.services.create_index("slug", unique=True)
    for i, (slug, name, group, dur, price, desc) in enumerate(SEED_SERVICES):
        await db.services.update_one(
            {"slug": slug},
            {"$set": {"name": name, "group": group, "duration_min": dur, "description": desc, "order": i},
             "$setOnInsert": {"price": float(price)}},
            upsert=True)
    await db.services.delete_many({"slug": {"$nin": [s[0] for s in SEED_SERVICES]}})
    await db.contacts.create_index("phone", unique=True)
    await db.contacts.create_index("name")
    await db.bookings.create_index("phone_digits")
    async for b in db.bookings.find({}, {"phone": 1}):
        await db.bookings.update_one({"_id": b["_id"]}, {"$set": {"phone_digits": phone_key(b.get("phone", ""))}})
    await seed_admin(os.environ["ADMIN_EMAIL"], os.environ["ADMIN_PASSWORD"], os.environ["ADMIN_NAME"])
    await seed_admin(os.environ["ADMIN2_EMAIL"], os.environ["ADMIN2_PASSWORD"], os.environ["ADMIN2_NAME"])


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
