from django.core.management.base import BaseCommand
from backend.apps.users.models import Role


class Command(BaseCommand):
    help = 'Seed initial roles'

    def handle(self, *args, **options):
        roles = ['admin', 'partner', 'associate', 'paralegal', 'client']
        for r in roles:
            obj, created = Role.objects.get_or_create(name=r)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created role: {r}'))
            else:
                self.stdout.write(f'Role exists: {r}')
