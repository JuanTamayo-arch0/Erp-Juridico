from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import Document


class DocumentsAPITest(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='docuser', email='doc@example.com', password='pass')
        self.client.force_authenticate(user=self.user)

    def test_create_and_list_document(self):
        url = '/api/documents/'
        payload = {'title': 'Doc1', 'url': 'http://example.com/doc.pdf'}
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Document.objects.count(), 1)
        res2 = self.client.get(url)
        self.assertEqual(res2.status_code, 200)
