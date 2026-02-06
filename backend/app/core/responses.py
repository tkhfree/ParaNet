from typing import Any

def ok(data: Any = None) -> dict:
    return {"code": 200, "data": data, "message": ""}


def fail(code: int = 500, message: str = "") -> dict:
    return {"code": code, "data": None, "message": message}
