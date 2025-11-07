from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from backend.apps.cases.models import Case, CaseResponsible
from .models import Task


class TasksPerCaseBoardTest(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.owner = User.objects.create_user(username='owner', email='o@example.com', password='pass')
        self.other = User.objects.create_user(username='other', email='x@example.com', password='pass')
        self.case = Case.objects.create(title='Case A', client_name='Client A', owner=self.owner)
        self.client.force_authenticate(user=self.owner)
        Task.objects.create(title='Task 1', case=self.case, created_by=self.owner)
        Task.objects.create(title='Task 2', case=self.case, created_by=self.owner)

    def test_requires_case_param(self):
        # without ?case, no tasks are returned
        res = self.client.get('/api/tasks/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 0)

    def test_owner_sees_tasks_in_its_case(self):
        res = self.client.get(f'/api/tasks/?case={self.case.id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)

    def test_outsider_cannot_see_tasks(self):
        # other user not a responsible -> cannot see tasks of the case
        self.client.force_authenticate(user=self.other)
        res = self.client.get(f'/api/tasks/?case={self.case.id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 0)

    def test_responsible_can_see_tasks(self):
        # make other a responsible -> should see tasks
        CaseResponsible.objects.create(case=self.case, user=self.other, role='')
        self.client.force_authenticate(user=self.other)
        res = self.client.get(f'/api/tasks/?case={self.case.id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 2)
