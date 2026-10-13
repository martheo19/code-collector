"""Ingestion des articles en vigueur des grands codes depuis le dump LEGI de la DILA.
Usage : python scripts/ingest_legi.py /tmp/dila/legi.tar.gz  (connexion via variables PG*)"""
import hashlib, re, subprocess, sys, tarfile, json, io
from lxml import etree, html

CODES = {
    "LEGITEXT000006070721": ("Code civil", "CC", None),
    "LEGITEXT000006070719": ("Code pénal", "CP", None),
    "LEGITEXT000006072050": ("Code du travail", "CT", "L"),
    "LEGITEXT000006069565": ("Code de la consommation", "CCONS", "L"),
    "LEGITEXT000006074228": ("Code de la route", "CR", "L"),
    "LEGITEXT000006071154": ("Code de procédure pénale", "CPP", "L"),
    "LEGITEXT000005634379": ("Code de commerce", "CCOM", "L"),
}

def rarity(art_id):
    h = int(hashlib.md5(art_id.encode()).hexdigest()[:8], 16) % 1000
    if h < 850: return "commune", 20 + h % 30
    if h < 980: return "peu_commune", 60 + h % 40
    return "rare", 150 + h % 80

def clean(raw):
    if not raw or not raw.strip(): return ""
    txt = html.fromstring(f"<div>{raw}</div>").text_content()
    return re.sub(r"\n\s*\n+", "\n\n", re.sub(r"[ \t]+", " ", txt)).strip()

def esc(s):
    return "NULL" if s is None else "'" + s.replace("'", "''") + "'"

def main(path):
    rows, seen = [], set()
    with tarfile.open(path, "r|gz") as tar:
        for m in tar:
            if not m.isfile() or "/article/" not in m.name or "code_en_vigueur" not in m.name: continue
            code = next((c for c in CODES if f"/{c}/article/" in m.name), None)
            if not code: continue
            root = etree.parse(tar.extractfile(m)).getroot()
            if root.findtext(".//META_ARTICLE/ETAT") != "VIGUEUR": continue
            num = (root.findtext(".//META_ARTICLE/NUM") or "").strip()
            name, prefix, only = CODES[code]
            if not num or (only and not num.startswith(only)) or (name, num) in seen: continue
            content = clean(etree.tostring(root.find(".//BLOC_TEXTUEL/CONTENU"), encoding="unicode", method="html")
                            .replace("<CONTENU>", "").replace("</CONTENU>", "")) if root.find(".//BLOC_TEXTUEL/CONTENU") is not None else ""
            if len(content) < 30: continue
            seen.add((name, num))
            aid = root.findtext(".//META_COMMUN/ID")
            tms = [t.text.strip() for t in root.iter("TITRE_TM") if t.text]
            title = tms[-1] if tms else f"{name}, article {num}"
            title = re.sub(r"^(Chapitre|Section|Titre|Livre|Paragraphe|Sous-section)\s+[^:]+:\s*", "", title)[:180]
            r, v = rarity(aid)
            summary = content[:220].rsplit(" ", 1)[0] + "…" if len(content) > 220 else None
            rows.append((aid, name, f"Article {num}", title, content, r, v,
                         f"https://www.legifrance.gouv.fr/codes/article_lc/{aid}",
                         (root.findtext(".//META_ARTICLE/DATE_DEBUT") or "")[:10] or None, summary))
    print("articles retenus:", len(rows))
    for i in range(0, len(rows), 2000):
        vals = ",".join(
            f"({esc(a)},{esc(s)},{esc(ar)},{esc(t)},{esc(c)},'{r}',{v},{esc(u)},'en_vigueur','france','code',{esc(d)},'République française',{esc(sm)})"
            for a, s, ar, t, c, r, v, u, d, sm in rows[i:i + 2000])
        sql = ("INSERT INTO public.cards (ref,source_code,article,title,content,rarity,base_value,source_url,status,circle,category,text_date,authority,summary) "
               f"SELECT * FROM (VALUES {vals}) v(ref,source_code,article,title,content,rarity,base_value,source_url,status,circle,category,text_date,authority,summary) "
               "WHERE NOT EXISTS (SELECT 1 FROM public.cards c WHERE c.source_code=v.source_code AND c.article=v.article) "
               "ON CONFLICT (ref) DO NOTHING;").replace("'commune'", "'commune'::card_rarity").replace("'peu_commune'", "'peu_commune'::card_rarity").replace("'rare'", "'rare'::card_rarity")
        subprocess.run(["psql", "-q", "-v", "ON_ERROR_STOP=1"], input=sql, text=True, check=True)
        print("lot", i // 2000 + 1, "ok")

if __name__ == "__main__":
    main(sys.argv[1])
