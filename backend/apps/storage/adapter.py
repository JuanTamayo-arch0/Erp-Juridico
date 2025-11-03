import os
from typing import Dict


class S3Adapter:
    def __init__(self, bucket: str = None):
        self.bucket = bucket or os.environ.get('S3_BUCKET', 'erp')

    def presign_upload(self, key: str, expires_in: int = 3600) -> Dict:
        # Placeholder: return a minimal presigned metadata structure
        return {
            'url': f'https://minio.local/{self.bucket}/{key}',
            'fields': {},
            'expires_in': expires_in,
        }
