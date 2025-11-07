from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import Client


class ClientsAPITest(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='tester2', email='t2@example.com', password='pass')
        self.client.force_authenticate(user=self.user)

    def test_create_and_list_client(self):
        url = '/api/clients/'
        payload = {'name': 'Client One', 'email': 'one@example.com'}
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Client.objects.count(), 1)
        res2 = self.client.get(url)
        self.assertEqual(res2.status_code, 200)
