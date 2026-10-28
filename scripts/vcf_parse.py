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
    return d if len(d) in (10, 11) else ""

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
