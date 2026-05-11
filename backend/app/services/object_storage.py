import logging
from dataclasses import dataclass
from urllib.parse import quote

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException, status

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ObjectStream:
    body: object
    content_type: str
    content_length: int
    content_range: str | None = None
    status_code: int = 200


def get_object_storage_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.NCP_OBJECT_STORAGE_ENDPOINT,
        aws_access_key_id=settings.NCP_OBJECT_STORAGE_ACCESS_KEY,
        aws_secret_access_key=settings.NCP_OBJECT_STORAGE_SECRET_KEY,
        region_name=settings.NCP_OBJECT_STORAGE_REGION,
    )


s3_client = get_object_storage_client()


def upload_object(key: str, content: bytes, content_type: str | None) -> None:
    try:
        s3_client.put_object(
            Bucket=settings.NCP_OBJECT_STORAGE_BUCKET,
            Key=key,
            Body=content,
            ContentType=content_type or "application/octet-stream",
        )
    except (BotoCoreError, ClientError) as exc:
        logger.exception("Object Storage 업로드 실패: key=%s", key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Object Storage 업로드에 실패했습니다.",
        ) from exc


def delete_object(key: str) -> None:
    try:
        s3_client.delete_object(Bucket=settings.NCP_OBJECT_STORAGE_BUCKET, Key=key)
    except (BotoCoreError, ClientError):
        logger.exception("Object Storage 파일 삭제 실패: key=%s", key)


def generate_download_url(key: str, original_filename: str, expires_in: int = 3600) -> str:
    disposition = (
        f"inline; filename=\"{original_filename}\"; "
        f"filename*=UTF-8''{quote(original_filename)}"
    )
    try:
        return s3_client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.NCP_OBJECT_STORAGE_BUCKET,
                "Key": key,
                "ResponseContentDisposition": disposition,
            },
            ExpiresIn=expires_in,
        )
    except (BotoCoreError, ClientError) as exc:
        logger.exception("Object Storage 접근 URL 생성 실패: key=%s", key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="파일 접근 URL 생성에 실패했습니다.",
        ) from exc


def get_object_stream(key: str, byte_range: str | None = None) -> ObjectStream:
    params = {
        "Bucket": settings.NCP_OBJECT_STORAGE_BUCKET,
        "Key": key,
    }
    if byte_range:
        params["Range"] = byte_range

    try:
        response = s3_client.get_object(**params)
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code")
        if error_code in {"NoSuchKey", "404"}:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="파일을 찾을 수 없습니다.") from exc
        if error_code == "InvalidRange":
            raise HTTPException(status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE, detail="잘못된 범위 요청입니다.") from exc
        logger.exception("Object Storage 파일 읽기 실패: key=%s", key)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="파일을 읽지 못했습니다.") from exc
    except BotoCoreError as exc:
        logger.exception("Object Storage 파일 읽기 실패: key=%s", key)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="파일을 읽지 못했습니다.") from exc

    return ObjectStream(
        body=response["Body"],
        content_type=response.get("ContentType") or "application/octet-stream",
        content_length=response.get("ContentLength", 0),
        content_range=response.get("ContentRange"),
        status_code=status.HTTP_206_PARTIAL_CONTENT if response.get("ContentRange") else status.HTTP_200_OK,
    )
