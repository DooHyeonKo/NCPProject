from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Iterable, List, Optional

import numpy as np
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Document, User
from app.utils.json_utils import loads_list, loads_vector


def cosine_similarity(vector_a, vector_b) -> float:
    if not vector_a or not vector_b or len(vector_a) != len(vector_b):
        return 0.0
    a = np.array(vector_a, dtype=float)
    b = np.array(vector_b, dtype=float)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    score = float(np.dot(a, b) / denom)
    return max(0.0, min(1.0, (score + 1.0) / 2.0 if score < 0 else score))


def normalize_terms(items: Iterable[str]) -> set[str]:
    normalized = set()
    for item in items or []:
        if not isinstance(item, str):
            continue
        value = item.strip().lower()
        if value:
            normalized.add(value)
    return normalized


def jaccard_similarity(list_a, list_b) -> float:
    set_a = normalize_terms(list_a)
    set_b = normalize_terms(list_b)
    if not set_a and not set_b:
        return 0.0
    union = set_a | set_b
    if not union:
        return 0.0
    return len(set_a & set_b) / len(union)


def calculate_tag_similarity(source_doc: Document, candidate_doc: Document) -> float:
    tag_jaccard = jaccard_similarity(loads_list(source_doc.tags), loads_list(candidate_doc.tags))
    source_embedding = loads_vector(source_doc.tag_embedding)
    candidate_embedding = loads_vector(candidate_doc.tag_embedding)
    embedding_score = cosine_similarity(source_embedding, candidate_embedding)
    if source_embedding and candidate_embedding:
        return 0.60 * tag_jaccard + 0.40 * embedding_score
    return tag_jaccard


def calculate_method_similarity(source_doc: Document, candidate_doc: Document) -> float:
    return jaccard_similarity(loads_list(source_doc.methods), loads_list(candidate_doc.methods))


def calculate_recency_score(candidate_doc: Document) -> float:
    current_year = datetime.now(UTC).year
    year = candidate_doc.published_year or candidate_doc.created_at.year
    diff = abs(current_year - year)
    return max(0.0, 1.0 - min(diff, 10) / 10)


def calculate_content_similarity(source_doc: Document, candidate_doc: Document) -> float:
    return cosine_similarity(loads_vector(source_doc.content_embedding), loads_vector(candidate_doc.content_embedding))


def calculate_recommendation_score(source_doc: Document, candidate_doc: Document) -> dict:
    content_score = calculate_content_similarity(source_doc, candidate_doc)
    tag_score = calculate_tag_similarity(source_doc, candidate_doc)
    method_score = calculate_method_similarity(source_doc, candidate_doc)
    recency_score = calculate_recency_score(candidate_doc)
    final_score = (
        0.55 * content_score
        + 0.30 * tag_score
        + 0.10 * method_score
        + 0.05 * recency_score
    )
    return {
        "content_similarity": round(content_score, 4),
        "tag_similarity": round(tag_score, 4),
        "method_similarity": round(method_score, 4),
        "recency_score": round(recency_score, 4),
        "final_score": round(final_score, 4),
    }


def generate_recommendation_reason(source_doc: Document, candidate_doc: Document, scores: dict) -> str:
    reasons: List[str] = []

    overlapping_tags = normalize_terms(loads_list(source_doc.tags)) & normalize_terms(loads_list(candidate_doc.tags))
    if overlapping_tags:
        reasons.append(f"기준 문서와 {', '.join(sorted(overlapping_tags)[:3])} 태그가 겹칩니다.")

    overlapping_methods = normalize_terms(loads_list(source_doc.methods)) & normalize_terms(loads_list(candidate_doc.methods))
    if overlapping_methods:
        reasons.append(f"두 문서 모두 {', '.join(sorted(overlapping_methods)[:3])} 방법론을 사용합니다.")

    if scores["content_similarity"] >= 0.85:
        reasons.append("초록과 요약의 의미 유사도가 매우 높습니다.")
    elif scores["content_similarity"] >= 0.70:
        reasons.append("문서의 주제와 내용 흐름이 유사합니다.")

    if source_doc.research_field and candidate_doc.research_field and source_doc.research_field == candidate_doc.research_field:
        reasons.append(f"두 문서 모두 {source_doc.research_field} 분야에 속합니다.")

    overlapping_datasets = normalize_terms(loads_list(source_doc.datasets)) & normalize_terms(loads_list(candidate_doc.datasets))
    if overlapping_datasets:
        reasons.append(f"공통 데이터셋 {', '.join(sorted(overlapping_datasets)[:3])}을 사용합니다.")

    if not reasons:
        reasons.append("문서 임베딩 기준으로 전체 내용의 유사도가 높습니다.")

    return " ".join(reasons)


def find_recommendation_candidates(db: Session, source_doc: Document):
    return (
        db.query(Document)
        .filter(Document.is_public.is_(True), Document.id != source_doc.id)
        .all()
    )


def recommend_similar_documents(
    db: Session,
    document_id: int,
    current_user: User,
    top_k: int = 5,
    min_score: float = 0.4,
):
    source_doc = db.query(Document).filter(Document.id == document_id).first()
    if not source_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="문서를 찾을 수 없습니다.")

    if source_doc.user_id != current_user.id and not source_doc.is_public:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="문서를 조회할 권한이 없습니다.")

    results = []
    for candidate in find_recommendation_candidates(db, source_doc):
        if candidate.id == source_doc.id:
            continue
        scores = calculate_recommendation_score(source_doc, candidate)
        if scores["final_score"] < min_score:
            continue
        results.append(
            {
                "document_id": candidate.id,
                "title": candidate.title,
                "similarity_score": scores["final_score"],
                "reason": generate_recommendation_reason(source_doc, candidate, scores),
                "_scores": scores,
            }
        )

    results.sort(key=lambda item: item["similarity_score"], reverse=True)
    return results[:top_k]
