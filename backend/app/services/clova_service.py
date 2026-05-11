import logging
from typing import List, Optional

from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)


def get_clova_client() -> Optional[OpenAI]:
    if not settings.CLOVA_STUDIO_API_KEY:
        return None
    return OpenAI(api_key=settings.CLOVA_STUDIO_API_KEY, base_url=settings.CLOVA_STUDIO_BASE_URL)


def clova_chat(messages, temperature: float = 0.3, max_tokens: int = 2048) -> Optional[str]:
    client = get_clova_client()
    if client is None:
        return None

    try:
        response = client.chat.completions.create(
            model=settings.CLOVA_CHAT_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content if response.choices else None
    except Exception:
        logger.exception("CLOVA API 호출 실패: chat")
        return None


def clova_embedding(text: str) -> Optional[List[float]]:
    client = get_clova_client()
    if client is None:
        return None

    try:
        response = client.embeddings.create(
            model=settings.CLOVA_EMBEDDING_MODEL,
            input=text,
            encoding_format="float",
        )
        return response.data[0].embedding if response.data else None
    except Exception:
        logger.exception("CLOVA API 호출 실패: embedding")
        return None
