from django.core.management.base import BaseCommand
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from backend.apps.users.models import Role


class Command(BaseCommand):
    help = 'Seed role -> permission mappings'

    def handle(self, *args, **options):
        # Define mappings: role name -> list of (app_label, model, codename actions)
        mappings = {
            'admin': 'ALL',
            'partner': [
                ('backend_cases', 'case', ['add', 'change', 'view', 'delete']),
                ('backend_clients', 'client', ['add', 'change', 'view']),
                ('backend_documents', 'document', ['add', 'change', 'view']),
            ],
            'associate': [
                ('backend_cases', 'case', ['add', 'change', 'view']),
                ('backend_clients', 'client', ['add', 'change', 'view']),
            ],
            'paralegal': [
                ('backend_cases', 'case', ['view']),
                ('backend_documents', 'document', ['view']),
            ],
            'client': [
                ('backend_cases', 'case', ['view']),
            ],
        }

        for role_name, perms in mappings.items():
            role, _ = Role.objects.get_or_create(name=role_name)
            # clear existing
            role.permissions.clear()

            if perms == 'ALL':
                all_perms = Permission.objects.all()
                role.permissions.set(all_perms)
                self.stdout.write(self.style.SUCCESS(f'Assigned ALL perms to role {role_name}'))
                continue

            assigned = 0
            for app_label, model, actions in perms:
                try:
                    ct = ContentType.objects.get(app_label=app_label, model=model)
                except ContentType.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f'ContentType not found for {app_label}.{model}'))
                    continue
                for act in actions:
                    codename = f'{act}_{model}'
                    try:
                        p = Permission.objects.get(content_type=ct, codename=codename)
                        role.permissions.add(p)
                        assigned += 1
                    except Permission.DoesNotExist:
                        self.stdout.write(self.style.WARNING(f'Permission {codename} not found for {app_label}.{model}'))

            self.stdout.write(self.style.SUCCESS(f'Assigned {assigned} permissions to role {role_name}'))
