from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from django.db import transaction
from backend.apps.users.models import User
import unicodedata
import re
import uuid
import os


def sanitize_filename(name: str) -> str:
    name = unicodedata.normalize('NFKD', name)
    # drop non-ascii
    name = name.encode('ascii', 'ignore').decode('ascii')
    name = name.replace(' ', '_')
    name = re.sub(r'[^A-Za-z0-9_.-]', '', name)
    if not name:
        name = str(uuid.uuid4())
    return name


class Command(BaseCommand):
    help = 'Sanitize existing avatar filenames under media/avatars and update User.avatar references.'

    def add_arguments(self, parser):
        parser.add_argument('--commit', action='store_true', help='Actually rename files and update DB. Default: dry-run')

    def handle(self, *args, **options):
        commit = options.get('commit', False)
        users = User.objects.exclude(avatar='').exclude(avatar__isnull=True)
        if not users.exists():
            self.stdout.write('No users with avatars found.')
            return

        moved = 0
        skipped = 0
        errors = 0

        for u in users:
            try:
                old_name = u.avatar.name  # e.g. 'avatars/Atlético.png'
                if not old_name:
                    skipped += 1
                    continue
                dirname = os.path.dirname(old_name)
                basename = os.path.basename(old_name)
                safe_basename = sanitize_filename(basename)
                if basename == safe_basename:
                    self.stdout.write(f'OK: {old_name} (no change)')
                    skipped += 1
                    continue

                new_rel = os.path.join(dirname, safe_basename) if dirname else safe_basename

                # ensure uniqueness
                base, ext = os.path.splitext(safe_basename)
                counter = 1
                candidate = new_rel
                while default_storage.exists(candidate):
                    candidate_basename = f"{base}_{counter}{ext}"
                    candidate = os.path.join(dirname, candidate_basename) if dirname else candidate_basename
                    counter += 1

                self.stdout.write(f'{old_name} -> {candidate}')
                if commit:
                    # perform move via storage
                    try:
                        with default_storage.open(old_name, 'rb') as fh:
                            default_storage.save(candidate, fh)
                        try:
                            default_storage.delete(old_name)
                        except Exception:
                            # best-effort; continue
                            pass

                        # update user record
                        u.avatar.name = candidate
                        u.save(update_fields=['avatar'])
                        moved += 1
                    except Exception as e:
                        errors += 1
                        self.stderr.write(f'ERROR moving {old_name}: {e}')
                else:
                    # dry-run only
                    pass

            except Exception as e:
                errors += 1
                self.stderr.write(f'Unexpected error processing user {u.pk}: {e}')

        self.stdout.write('\nSummary:')
        self.stdout.write(f'  moved: {moved}')
        self.stdout.write(f'  skipped (no-change): {skipped}')
        self.stdout.write(f'  errors: {errors}')
        if not commit:
            self.stdout.write('\nRun with --commit to apply these changes.')
