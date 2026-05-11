from datetime import datetime
from types import SimpleNamespace

from app.services.recommendation_service import (
    calculate_recommendation_score,
    calculate_tag_similarity,
    cosine_similarity,
    generate_recommendation_reason,
    jaccard_similarity,
    recommend_similar_documents,
)


def make_doc(
    doc_id,
    *,
    user_id=1,
    is_public=True,
    title=None,
    tags=None,
    methods=None,
    datasets=None,
    content_embedding=None,
    tag_embedding=None,
    research_field=None,
    published_year=None,
    created_at=None,
):
    return SimpleNamespace(
        id=doc_id,
        user_id=user_id,
        is_public=is_public,
        title=title or f"Doc {doc_id}",
        tags=tags,
        methods=methods,
        datasets=datasets,
        content_embedding=content_embedding,
        tag_embedding=tag_embedding,
        research_field=research_field,
        published_year=published_year,
        created_at=created_at or datetime(2025, 1, 1),
    )


def test_cosine_similarity():
    assert round(cosine_similarity([1, 0], [1, 0]), 4) == 1.0
    assert round(cosine_similarity([1, 0], [0, 1]), 4) == 0.0


def test_jaccard_similarity():
    score = jaccard_similarity(["AI", "translation"], ["ai", "translation", "paper"])
    assert round(score, 4) == round(2 / 3, 4)


def test_tag_similarity_prefers_more_overlap():
    source = make_doc(1, tags='["AI","translation","paper"]')
    high = make_doc(2, tags='["AI","translation"]')
    low = make_doc(3, tags='["robotics"]')
    assert calculate_tag_similarity(source, high) > calculate_tag_similarity(source, low)


def test_content_similarity_prefers_similar_embeddings():
    source = make_doc(1, content_embedding="[1,0,0]")
    near = make_doc(2, content_embedding="[0.9,0.1,0]")
    far = make_doc(3, content_embedding="[0,1,0]")
    assert calculate_recommendation_score(source, near)["content_similarity"] > calculate_recommendation_score(source, far)["content_similarity"]


class FakeQuery:
    def __init__(self, source_doc, candidates):
        self.source_doc = source_doc
        self.candidates = candidates
        self._filters = []

    def filter(self, *args, **kwargs):
        self._filters.extend(args)
        return self

    def first(self):
        return self.source_doc

    def all(self):
        return self.candidates


class FakeDB:
    def __init__(self, source_doc, candidates):
        self.source_doc = source_doc
        self.candidates = candidates

    def query(self, model):
        return FakeQuery(self.source_doc, self.candidates)


def test_recommendations_sorted_descending_and_excludes_self():
    source = make_doc(
        1,
        user_id=1,
        is_public=False,
        tags='["ai","translation"]',
        methods='["transformer"]',
        datasets='["wmt14"]',
        content_embedding="[1,0,0]",
        research_field="NLP",
    )
    second = make_doc(
        2,
        tags='["ai","translation"]',
        methods='["transformer"]',
        datasets='["wmt14"]',
        content_embedding="[0.99,0.01,0]",
        research_field="NLP",
    )
    third = make_doc(
        3,
        tags='["vision"]',
        methods='["cnn"]',
        content_embedding="[0.3,0.7,0]",
        research_field="CV",
    )
    db = FakeDB(source, [source, third, second])
    current_user = SimpleNamespace(id=1)
    recommendations = recommend_similar_documents(db, 1, current_user, top_k=5, min_score=0.0)
    ids = [item["document_id"] for item in recommendations]
    scores = [item["similarity_score"] for item in recommendations]
    assert 1 not in ids
    assert ids[0] == 2
    assert scores == sorted(scores, reverse=True)


def test_generate_recommendation_reason():
    source = make_doc(
        1,
        tags='["ai","translation"]',
        methods='["transformer"]',
        datasets='["wmt14"]',
        research_field="NLP",
        content_embedding="[1,0]",
    )
    candidate = make_doc(
        2,
        tags='["ai","translation"]',
        methods='["transformer"]',
        datasets='["wmt14"]',
        research_field="NLP",
        content_embedding="[1,0]",
    )
    scores = calculate_recommendation_score(source, candidate)
    reason = generate_recommendation_reason(source, candidate, scores)
    assert "태그" in reason
    assert "방법론" in reason


def test_edge_cases_do_not_crash():
    source = make_doc(1, tags=None, methods=None, content_embedding=None, tag_embedding=None)
    candidate = make_doc(2, tags="[]", methods="[]", content_embedding="[]", tag_embedding="[]")
    scores = calculate_recommendation_score(source, candidate)
    assert scores["final_score"] >= 0.0
