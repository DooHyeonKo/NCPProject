import json
from typing import Any, List


def loads_list(value: Any) -> List[Any]:
    if value in (None, "", []):
        return []
    if isinstance(value, list):
        return value
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else []
    except (TypeError, json.JSONDecodeError):
        return []


def loads_vector(value: Any) -> List[float]:
    items = loads_list(value)
    vector: List[float] = []
    for item in items:
        try:
            vector.append(float(item))
        except (TypeError, ValueError):
            continue
    return vector


def dumps_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)
