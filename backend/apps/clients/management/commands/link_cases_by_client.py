from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from backend.apps.clients.models import Client
from backend.apps.cases.models import Case
import difflib
import unicodedata


def normalize_name(s: str) -> str:
    if not s:
        return ''
    # simple normalization: lowercase, strip, remove diacritics, collapse spaces
    s2 = unicodedata.normalize('NFKD', s)
    s2 = ''.join(c for c in s2 if not unicodedata.combining(c))
    s2 = ' '.join(s2.split())
    return s2.lower().strip()


class Command(BaseCommand):
    help = 'Dry-run (default) or apply linking of Case -> Client by matching client_name to client.name'

    def add_arguments(self, parser):
        parser.add_argument('client_id', type=int, help='Client id to link cases to')
        parser.add_argument('--apply', action='store_true', help='Apply changes (persist linking)')
        parser.add_argument('--fuzzy', type=float, default=0.0, help='Fuzzy match threshold (0-1). If >0, use difflib ratio to accept near matches')

    def handle(self, *args, **options):
        client_id = options['client_id']
        do_apply = options['apply']
        fuzzy_threshold = float(options.get('fuzzy') or 0.0)

        try:
            client = Client.objects.get(pk=client_id)
        except Client.DoesNotExist:
            raise CommandError(f'Client {client_id} not found')

        name_norm = normalize_name(client.name)
        self.stdout.write(self.style.NOTICE(f'Client: {client.id} — "{client.name}" (normalized: "{name_norm}")'))

        # Find cases that are not linked (client is null) but have client_name set
        candidates = Case.objects.filter(client__isnull=True).exclude(client_name='')

        matches = []
        for c in candidates:
            cn = normalize_name(getattr(c, 'client_name', '') or '')
            if not cn:
                continue
            if cn == name_norm:
                matches.append((c, 'exact'))
                continue
            if fuzzy_threshold > 0.0:
                ratio = difflib.SequenceMatcher(None, cn, name_norm).ratio()
                if ratio >= fuzzy_threshold:
                    matches.append((c, f'fuzzy:{ratio:.2f}'))

        if not matches:
            self.stdout.write('No matching cases found')
            return

        self.stdout.write(self.style.SUCCESS(f'Found {len(matches)} matching case(s):'))
        for case_obj, reason in matches:
            self.stdout.write(f' - Case {case_obj.id}: "{case_obj.title}" client_name="{case_obj.client_name}"  -> match: {reason}')

        if not do_apply:
            self.stdout.write(self.style.WARNING('Dry-run mode: no changes applied. Re-run with --apply to persist linking.'))
            return

        # apply changes in a transaction
        with transaction.atomic():
            changed = 0
            for case_obj, reason in matches:
                case_obj.client = client
                case_obj.save(update_fields=['client'])
                changed += 1
            self.stdout.write(self.style.SUCCESS(f'Applied linking: {changed} cases updated.'))
