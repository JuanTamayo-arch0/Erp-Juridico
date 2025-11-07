from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status

from .serializers import CustomTokenObtainPairSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class MeView(APIView):
    """Return the current authenticated user's basic profile.

    GET /api/auth/me/ -> { id, username, email, first_name, last_name, roles: [name] }
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # roles is a many-to-many on the custom User model
        roles = [r.name for r in getattr(user, 'roles').all()] if hasattr(user, 'roles') else []
        data = {
            'id': user.id,
            'username': user.get_username(),
            'email': getattr(user, 'email', ''),
            'first_name': getattr(user, 'first_name', ''),
            'last_name': getattr(user, 'last_name', ''),
            'roles': roles,
            'avatar': request.build_absolute_uri(user.avatar.url) if getattr(user, 'avatar', None) else None,
        }
        return Response(data)


class UploadAvatarView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('avatar')
        if not file:
            return Response({'detail': 'No file'}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        # sanitize filename to avoid filesystem/storage encoding issues
        import unicodedata, re, uuid

        def sanitize_filename(name: str) -> str:
            # Normalize unicode, replace spaces, remove problematic chars
            name = unicodedata.normalize('NFKD', name)
            # keep ascii characters and a few safe punctuation
            name = name.encode('ascii', 'ignore').decode('ascii')
            name = name.replace(' ', '_')
            name = re.sub(r'[^A-Za-z0-9_.-]', '', name)
            if not name:
                name = str(uuid.uuid4())
            return name

        safe_name = sanitize_filename(file.name)
        user.avatar.save(safe_name, file, save=True)
        avatar_url = request.build_absolute_uri(user.avatar.url)
        return Response({'avatar': avatar_url})
