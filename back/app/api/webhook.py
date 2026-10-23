

import json
import logging
import os
import secrets

from fastapi import APIRouter, HTTPException, Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/webhooks", tags=["webhooks"])

WEBHOOK_TOKEN = os.getenv("INCONCERT_WEBHOOK_TOKEN", "")


@router.post("/inconcert/{token}", include_in_schema=False)
async def inconcert_webhook(token: str, request: Request):
    if not WEBHOOK_TOKEN or not secrets.compare_digest(token, WEBHOOK_TOKEN):
        raise HTTPException(status_code=404)  # 404 para no revelar que la ruta existe

    raw = await request.body()
    try:
        payload = json.loads(raw) if raw else None
    except ValueError:
        payload = raw.decode("utf-8", errors="replace")  # por si no llega JSON

    logger.info(
        "inConcert webhook | ip=%s | content-type=%s | payload=%s",
        request.client.host if request.client else None,
        request.headers.get("content-type"),
        payload,
    )

    return {"status": "received"}


@router.get("/inconcert/{token}", include_in_schema=False)
async def inconcert_webhook_check(token: str):
    if not WEBHOOK_TOKEN or not secrets.compare_digest(token, WEBHOOK_TOKEN):
        raise HTTPException(status_code=404)
    return {"status": "ok"}