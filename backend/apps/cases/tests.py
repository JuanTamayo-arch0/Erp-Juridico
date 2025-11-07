from rest_framework.test import APITestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from .models import Case, CaseResponsible


class CasesAPITest(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username='tester', email='t@example.com', password='pass')
        self.client.force_authenticate(user=self.user)

    def test_create_and_list_case(self):
        url = '/api/cases/'
        payload = {'title': 'Test Case', 'description': 'Desc', 'client_name': 'Client X'}
        res = self.client.post(url, payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Case.objects.count(), 1)
        # list
        res2 = self.client.get(url)
        self.assertEqual(res2.status_code, 200)
        self.assertGreaterEqual(len(res2.data), 1)

    def test_visibility_restricted_to_participants(self):
        """A user should not see cases they are not owner or responsible of (list and search)."""
        User = get_user_model()
        owner = self.user
        other = User.objects.create_user(username='outsider', email='o@example.com', password='pass')

        # create a case owned by owner
        case = Case.objects.create(title='Private Case', client_name='C1', owner=owner)

        # authenticate as outsider
        self.client.force_authenticate(user=other)

        # list should be empty
        res_list = self.client.get('/api/cases/')
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.data), 0)

        # search should not return the case
        res_search = self.client.get('/api/search/', {'q': 'Private'})
        self.assertEqual(res_search.status_code, 200)
        self.assertEqual(len(res_search.data.get('cases', [])), 0)

        # make outsider a responsible and check access appears
        CaseResponsible.objects.create(case=case, user=other, role='')
        res_list2 = self.client.get('/api/cases/')
        self.assertEqual(res_list2.status_code, 200)
        self.assertEqual(len(res_list2.data), 1)

        res_search2 = self.client.get('/api/search/', {'q': 'Private'})
        self.assertEqual(res_search2.status_code, 200)
        self.assertEqual(len(res_search2.data.get('cases', [])), 1)

    def test_admin_partner_do_not_bypass_visibility(self):
        """Users with 'admin' or 'partner' roles should still only see cases they participate in."""
        User = get_user_model()
        owner = self.user
        outsider = User.objects.create_user(username='outsider2', email='o2@example.com', password='pass')

        # assign role 'admin' to outsider
        from backend.apps.users.models import Role
        role_admin, _ = Role.objects.get_or_create(name='admin')
        outsider.roles.add(role_admin)

        # create a case owned by owner
        case = Case.objects.create(title='Owner Case', client_name='C1', owner=owner)

        # outsider (admin role) should not see it until they are responsible
        self.client.force_authenticate(user=outsider)
        res_list = self.client.get('/api/cases/')
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(len(res_list.data), 0)

        # make outsider a responsible
        CaseResponsible.objects.create(case=case, user=outsider, role='')
        res_list2 = self.client.get('/api/cases/')
        self.assertEqual(res_list2.status_code, 200)
        self.assertEqual(len(res_list2.data), 1)
