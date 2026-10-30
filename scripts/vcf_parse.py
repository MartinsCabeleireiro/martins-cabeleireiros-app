import re
import sys
import quopri
from collections import Counter

def unfold(text):
    text = text.replace("\r\n", "\n")
    text = re.sub(r"=\n", "", text)
    return re.sub(r"\n[ \t]", "", text)

def val(line):
    head, _, v = line.partition(":")
    v = v.strip()
    if "QUOTED-PRINTABLE" in head.upper():
        v = quopri.decodestring(v.encode()).decode("utf-8", "replace")
    return v

DDDS = {11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38,
        41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69,
        71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99}


def norm(p, ddd="69"):
    d = re.sub(r"\D", "", p or "")
    if d.startswith("55") and len(d) >= 12:
        d = d[2:]
    if d.startswith("0") and len(d) >= 11:
        d = d.lstrip("0")
        if len(d) >= 12:  # 0 + operadora + DDD + número
            d = d[2:]
    if len(d) in (8, 9):
        d = ddd + d
    if len(d) == 10 and d[2] in "6789":
        d = d[:2] + "9" + d[2:]
    if len(d) not in (10, 11) or int(d[:2]) not in DDDS:
        return ""
    if len(d) == 11 and d[2] != "9":
        return ""
    if len(d) == 10 and d[2] not in "2345":
        return ""
    if d[2:5] in ("300", "400"):
        return ""
    return d

def parse(path):
    text = unfold(open(path, encoding="utf-8", errors="replace").read())
    out, stats = [], Counter()
    for card in re.split(r"BEGIN:VCARD", text, flags=re.I)[1:]:
        lines = card.split("\n")
        fn = next((l for l in lines if re.match(r"^FN[;:]", l, re.I)), None)
        n = next((l for l in lines if re.match(r"^N[;:]", l, re.I)), None)
        name = val(fn) if fn else ""
        if not name and n:
            name = " ".join(reversed([x for x in val(n).split(";") if x]))
        tels = [val(l).replace("tel:", "") for l in lines if re.match(r"^(item\d+\.)?TEL[;:]", l, re.I)]
        nums = [x for x in (norm(t) for t in tels) if x]
        if not nums:
            stats["sem_numero_valido"] += 1
            continue
        mobile = next((x for x in nums if len(x) == 11 and x[2] == "9"), nums[0])
        out.append({"name": name.strip() or mobile, "phone": mobile})
        stats["validos"] += 1
    return out, stats

if __name__ == "__main__":
    items, stats = parse(sys.argv[1])
    print(stats, len({i["phone"] for i in items}), "telefones únicos")
    for i in items[:8]:
        print(i)
    if len(sys.argv) > 2 and sys.argv[2] == "--import":
        import os
        import requests
        api = os.environ["API_URL"] + "/api"
        tok = requests.post(f"{api}/auth/login", json={"email": os.environ["ADMIN_EMAIL"], "password": os.environ["ADMIN_PASSWORD"]}).json()["token"]
        added = skipped = 0
        for i in range(0, len(items), 1000):
            r = requests.post(f"{api}/contacts/import", json={"contacts": items[i:i + 1000]}, headers={"Authorization": f"Bearer {tok}"}).json()
            added += r["added"]
            skipped += r["skipped"]
        print("importados:", added, "ignorados:", skipped)
