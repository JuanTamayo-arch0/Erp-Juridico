from django.db.models import Q


def cases_accessible_by(user, qs):
    """Return a queryset filtered to cases the given user can access.

    Access rules:
    - Anonymous: none
    - Superuser or staff: all
    - Roles 'admin' or 'partner': NO bypass (must be owner or active responsible)
    - Otherwise: cases where the user is the owner or an active responsible
      (responsibles.left_at is null).

    This function expects an initial queryset (qs) to preserve annotations
    or orderings from callers.
    """
    if not user or not getattr(user, 'is_authenticated', False):
        return qs.none()

    # global access shortcuts
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return qs

    # default: only owner or active responsible
    return qs.filter(Q(owner=user) | Q(responsibles__user=user, responsibles__left_at__isnull=True)).distinct()
