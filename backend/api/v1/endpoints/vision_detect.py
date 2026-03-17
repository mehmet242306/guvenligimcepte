from __future__ import annotations

import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from api.audit import write_audit_log
from api.authz import CurrentAppUser, require_roles
from api.openai_vision import openai_vision_client
from api.responses import success_response

router = APIRouter(prefix="/risk-analysis", tags=["risk-analysis-vision"])


class VisionImageInput(BaseModel):
    image_id: str | None = None
    file_name: str | None = None
    mime_type: str | None = None
    data_url: str = Field(min_length=20)


class VisionLineInput(BaseModel):
    line_id: str | None = None
    title: str | None = None
    description: str | None = None
    images: list[VisionImageInput] = Field(min_length=1)


class VisionDetectRequest(BaseModel):
    analysis_title: str | None = None
    method: Literal["r_skor", "fine_kinney", "l_matrix"] = "r_skor"
    lines: list[VisionLineInput] = Field(min_length=1)


def _required_roles() -> list[str]:
    return ["Organization Admin", "OHS Specialist"]


@router.post("/vision-detect")
async def detect_visual_risks(
    request: Request,
    payload: VisionDetectRequest,
    current_user: Annotated[
        CurrentAppUser,
        Depends(require_roles(*_required_roles())),
    ],
):
    if not openai_vision_client.is_enabled:
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY is not configured on backend",
        )

    analysis_id = str(uuid.uuid4())
    output_lines: list[dict] = []
    total_findings = 0
    total_images = 0

    for line in payload.lines:
        line_id = line.line_id or str(uuid.uuid4())
        line_findings: list[dict] = []

        for image in line.images:
            total_images += 1
            image_id = image.image_id or str(uuid.uuid4())

            findings = await openai_vision_client.detect_findings_for_image(
                analysis_title=payload.analysis_title,
                method=payload.method,
                line_title=line.title,
                line_description=line.description,
                image_id=image_id,
                file_name=image.file_name,
                mime_type=image.mime_type,
                data_url=image.data_url,
            )

            line_findings.extend(findings)

        total_findings += len(line_findings)

        output_lines.append(
            {
                "line_id": line_id,
                "title": line.title or "",
                "description": line.description or "",
                "findings": line_findings,
            }
        )

    await write_audit_log(
        current_user=current_user,
        action_type="risk_analysis.vision_detected",
        entity_type="risk_analysis",
        entity_id=analysis_id,
        severity="info",
        metadata_json={
            "analysis_title": payload.analysis_title,
            "method": payload.method,
            "line_count": len(payload.lines),
            "image_count": total_images,
            "finding_count": total_findings,
        },
        request=request,
    )

    return success_response(
        data={
            "analysis_id": analysis_id,
            "method": payload.method,
            "lines": output_lines,
        },
        meta={},
    )
