"""Extract Articles 1-30 of the Universal Declaration of Human Rights in 22 languages.

Source: NLTK's udhr2 corpus (UTF-8 texts from the UDHR in Unicode project),
https://github.com/nltk/nltk_data (packages/corpora/udhr2.zip).
Only Articles 1-30 are kept, so that every language is compared on the same content
(some files have no preamble). Usage: python scripts/prepare_udhr.py path/to/udhr2
"""
import json
import sys
import unicodedata
from pathlib import Path

LANGS = [
    # code, file, display name, script, Article 1 heading line
    ("en", "eng", "English", "Latin", "Article 1"),
    ("vi", "vie", "Vietnamese", "Latin (with diacritics)", "Điều 1:"),
    ("zh", "cmn_hans", "Chinese (Simplified)", "Han", "第一条"),
    ("ja", "jpn", "Japanese", "Kanji and kana", "第１条"),
    ("ko", "kor", "Korean", "Hangul", "제 1 조"),
    ("th", "tha", "Thai", "Thai", "ข้อ 1"),
    ("km", "khm", "Khmer", "Khmer", "មាត្រា ១"),
    ("my", "mya", "Burmese", "Myanmar", "အပိုဒ် ၁"),
    ("id", "ind", "Indonesian", "Latin", "Pasal 1"),
    ("tl", "tgl", "Tagalog", "Latin", "Artikulo 1"),
    ("hi", "hin", "Hindi", "Devanagari", "अनुच्छेद १."),
    ("bn", "ben", "Bengali", "Bengali", "ধারা ১"),
    ("ta", "tam", "Tamil", "Tamil", "உறுப்புரை 1"),
    ("ar", "arb", "Arabic", "Arabic", "المادة 1"),
    ("ru", "rus", "Russian", "Cyrillic", "Статья 1"),
    ("es", "spa", "Spanish", "Latin", "Artículo 1"),
    ("fr", "fra", "French", "Latin", "Article premier"),
    ("de", "deu", "German", "Latin", "Artikel 1"),
    ("sw", "swh", "Swahili", "Latin", "Kifungu cha 1."),
    ("yo", "yor", "Yoruba", "Latin (with diacritics)", "Abala kìíní."),
    ("zu", "zul", "Zulu", "Latin", "Isigaba 1"),
    ("am", "amh", "Amharic", "Ethiopic", "አንቀጽ፡፩፤"),
]


def main(src: Path) -> None:
    out_dir = Path("data/src/udhr")
    out_dir.mkdir(parents=True, exist_ok=True)
    meta = []
    for code, file, name, script, head in LANGS:
        norm = lambda t: unicodedata.normalize("NFC", t).replace("\u00a0", " ").strip()
        lines = [norm(l) for l in (src / f"{file}.txt").read_text(encoding="utf-8").splitlines() if l.strip()]
        start = next(i for i, l in enumerate(lines) if l == norm(head))
        articles = lines[start:]
        (out_dir / f"{code}.txt").write_text("\n".join(articles) + "\n", encoding="utf-8")
        meta.append({"code": code, "name": name, "script": script, "file": f"{file}.txt", "article1": articles[1]})
        print(f"{code:3} {name:22} lines={len(articles):3}  {articles[1][:60]}")
    Path("data/src/udhr/languages.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
