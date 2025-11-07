from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Try authenticating by username first, then by email (if provided).

    This keeps behavior compatible with SimpleJWT but allows the frontend to
    POST either `username` or `email` along with `password`.
    """

    def validate(self, attrs):
        # First, try the default behavior (username + password).
        try:
            return super().validate(attrs)
        except AuthenticationFailed:
            # If default failed, and email was provided, attempt to find a user
            # with that email and re-run validation using their username.
            email = self.initial_data.get('email')
            password = attrs.get('password')
            if not email or not password:
                raise

            User = get_user_model()
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                # Re-raise the original AuthenticationFailed to keep response
                # message consistent.
                raise

            # Prepare a new attrs dict with the username set to the found user's
            # username, then delegate to the parent serializer which will call
            # authenticate(...) and issue tokens on success.
            new_attrs = {**attrs}
            new_attrs[self.username_field] = user.get_username()
            return super().validate(new_attrs)
