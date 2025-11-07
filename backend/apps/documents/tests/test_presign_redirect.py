from django.test import TestCase
from django.contrib.auth import get_user_model
from backend.apps.documents.models import Document
from backend.apps.users.models import Role
from unittest.mock import patch


class PresignRedirectTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='u1', password='pass')
        # ensure role exists and attach to user (RBAC fallback mapping allows partner to view)
        role, _ = Role.objects.get_or_create(name='partner')
        self.user.roles.add(role)
        self.client.force_login(self.user)

    @patch('backend.apps.storage.adapter.S3Adapter.presign_get')
    def test_presign_redirect(self, mock_presign):
        mock_presign.return_value = 'https://example.com/object.pdf'
        doc = Document.objects.create(title='f', key='cases/1/file.pdf')
        resp = self.client.get(f'/api/documents/{doc.id}/presigned/')
        # should redirect to the presigned url
        self.assertEqual(resp.status_code, 302)
        self.assertEqual(resp.url, 'https://example.com/object.pdf')
