import os
from typing import Dict


class S3Adapter:
    def __init__(self, bucket: str = None):
        self.bucket = bucket or os.environ.get('S3_BUCKET', 'erp')
        # read endpoint and credentials from env
        self.endpoint = os.environ.get('S3_ENDPOINT_URL')
        self.access_key = os.environ.get('AWS_ACCESS_KEY_ID')
        self.secret_key = os.environ.get('AWS_SECRET_ACCESS_KEY')

    def presign_upload(self, key: str, expires_in: int = 3600) -> Dict:
        """Generate a presigned POST for S3/MinIO if boto3 is available, otherwise
        fall back to a placeholder structure.
        """
        try:
            import boto3
            s3 = boto3.client(
                's3',
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
            )
            # use generate_presigned_post
            response = s3.generate_presigned_post(
                Bucket=self.bucket,
                Key=key,
                ExpiresIn=expires_in,
            )
            # response includes url and fields
            return {
                'url': response.get('url'),
                'fields': response.get('fields', {}),
                'expires_in': expires_in,
            }
        except Exception:
            # fallback placeholder (development). If an endpoint is set use
            # it so generated urls match the configured MinIO host; otherwise
            # fall back to a local development host name.
            base = self.endpoint.rstrip('/') if self.endpoint else 'http://127.0.0.1:9000'
            return {
                'url': f"{base}/{self.bucket}/{key}",
                'fields': {},
                'expires_in': expires_in,
            }

    def presign_get(self, key: str, expires_in: int = 3600) -> str:
        """Generate a presigned GET URL for an object so clients can download it.

        Returns a URL string. Falls back to constructed object URL when boto3 is
        unavailable or an error occurs.
        """
        try:
            import boto3
            s3 = boto3.client(
                's3',
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
            )
            url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': key},
                ExpiresIn=expires_in,
            )
            return url
        except Exception:
            base = self.endpoint.rstrip('/') if self.endpoint else 'http://127.0.0.1:9000'
            return f"{base}/{self.bucket}/{key}"

    def get_object_stream(self, key: str) -> dict:
        """Return a streaming object or metadata for the given key.

        Expected return shape (dict) used by callers:
          - if boto3 is available and object can be streamed: return {
                'body': streaming_body,  # boto3 StreamingBody
                'ContentType': content_type,
                'ContentLength': content_length,
                'ETag': etag
            }
          - otherwise: return {'url': constructed_url}
        """
        try:
            import boto3
            s3 = boto3.client(
                's3',
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
            )
            obj = s3.get_object(Bucket=self.bucket, Key=key)
            body = obj.get('Body')
            content_type = obj.get('ContentType')
            content_length = obj.get('ContentLength')
            etag = obj.get('ETag')
            return {
                'body': body,
                'ContentType': content_type,
                'ContentLength': content_length,
                'ETag': etag,
            }
        except Exception:
            # fallback to a URL pointing to the object (may be local proxy)
            base = self.endpoint.rstrip('/') if self.endpoint else 'http://127.0.0.1:9000'
            return {'url': f"{base}/{self.bucket}/{key}"}
