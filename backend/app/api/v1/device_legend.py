from fastapi import APIRouter, HTTPException, status

from app.core.responses import ok
from app.services import device_legend_service


router = APIRouter(prefix="/device-legends", tags=["device-legend"])


@router.get("/")
def list_device_legends():
    return ok(device_legend_service.list_device_legends())


@router.post("/")
def create_device_legend(body: dict):
    type = str(body.get("type", "")).strip()
    label = str(body.get("label", "")).strip()
    if not type or not label:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="类型标识和显示名称不能为空")

    try:
        legend = device_legend_service.create_device_legend(
            type=type,
            label=label,
            image_key=body.get("imageKey"),
            color=body.get("color"),
            sort=body.get("sort"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    return ok(legend)


@router.put("/{legend_id}")
def update_device_legend(legend_id: str, body: dict):
    try:
        legend = device_legend_service.update_device_legend(
            legend_id=legend_id,
            type=body.get("type"),
            label=body.get("label"),
            image_key=body.get("imageKey"),
            color=body.get("color"),
            sort=body.get("sort"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if not legend:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="设备图例不存在")
    return ok(legend)


@router.delete("/{legend_id}")
def delete_device_legend(legend_id: str):
    if not device_legend_service.delete_device_legend(legend_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="设备图例不存在")
    return ok(None)
