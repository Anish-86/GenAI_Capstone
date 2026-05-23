from typing import Any, Dict


def success_response(data: Any = None, message: str = "Success") -> Dict:
    return {"success": True, "message": message, "data": data}


def error_response(message: str, code: int = 400) -> Dict:
    return {"success": False, "message": message, "code": code}


def paginate(query, page: int, page_size: int):
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    import math
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total > 0 else 1,
    }
