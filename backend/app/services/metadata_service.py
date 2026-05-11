import json
import re
from typing import Dict, List

from app.services.clova_service import clova_chat


def derive_fallback_tags(document_text: str, limit: int = 6) -> List[str]:
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9_-]{2,}|[가-힣]{2,}", document_text.lower())
    stopwords = {
        "the",
        "and",
        "for",
        "with",
        "that",
        "from",
        "this",
        "using",
        "study",
        "paper",
        "result",
        "method",
        "문서",
        "연구",
        "방법",
        "결과",
        "사용",
    }
    counts: dict[str, int] = {}
    for token in tokens:
        if token in stopwords or token.startswith("http"):
            continue
        counts[token] = counts.get(token, 0) + 1
    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    return [token for token, _ in ranked[:limit]]


def fallback_metadata(document_text: str, existing_tags: List[str] | None = None) -> Dict:
    lines = [line.strip() for line in document_text.splitlines() if line.strip()]
    abstract = " ".join(lines[:3])[:1000] if lines else "문서 개요를 추출하지 못했습니다."

    found_year = None
    for match in re.findall(r"\b((?:19|20)\d{2})\b", document_text):
        try:
            found_year = int(match)
            break
        except ValueError:
            continue

    tags = list(dict.fromkeys((existing_tags or derive_fallback_tags(document_text))[:6]))
    return {
        "abstract": abstract,
        "tags": tags,
        "methods": [],
        "datasets": [],
        "research_field": None,
        "published_year": found_year,
    }


def extract_metadata(document_text: str, existing_tags: List[str] | None = None) -> Dict:
    prompt = [
        {
            "role": "system",
            "content": (
                "당신은 논문과 기술 문서를 분석하는 AI입니다. 사용자가 제공한 문서에서 초록, 핵심 태그, "
                "사용된 방법론, 데이터셋, 연구 분야, 발행 연도를 추출하세요. 반드시 JSON 형식으로만 답변하세요."
            ),
        },
        {
            "role": "user",
            "content": document_text[:6000],
        },
    ]
    content = clova_chat(prompt, temperature=0.1, max_tokens=1200)
    if not content:
        return fallback_metadata(document_text, existing_tags)

    try:
        data = json.loads(content)
        return {
            "abstract": data.get("abstract") or fallback_metadata(document_text, existing_tags)["abstract"],
            "tags": data.get("tags") or (existing_tags or []),
            "methods": data.get("methods") or [],
            "datasets": data.get("datasets") or [],
            "research_field": data.get("research_field"),
            "published_year": data.get("published_year"),
        }
    except json.JSONDecodeError:
        return fallback_metadata(document_text, existing_tags)
