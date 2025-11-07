from rest_framework import serializers
from django.contrib.auth.models import Permission
from .models import User, Role


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.PrimaryKeyRelatedField(many=True, queryset=Permission.objects.all(), required=False)

    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions']


class UserSerializer(serializers.ModelSerializer):
    roles = RoleSerializer(many=True, read_only=True)
    role_ids = serializers.PrimaryKeyRelatedField(many=True, write_only=True, queryset=Role.objects.all(), required=False)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'roles', 'role_ids', 'is_active', 'is_staff', 'avatar', 'password']
        read_only_fields = ['id', 'roles', 'avatar']
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def get_avatar(self, obj):
        try:
            if obj.avatar:
                request = self.context.get('request')
                return request.build_absolute_uri(obj.avatar.url) if request is not None else obj.avatar.url
        except Exception:
            pass
        return None

    def create(self, validated_data):
        role_ids = validated_data.pop('role_ids', [])
        password = validated_data.pop('password', None)
        # generate a secure random password if none provided
        if not password:
            import secrets, string
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_"
            password = ''.join(secrets.choice(alphabet) for _ in range(20))

        user = User.objects.create(**validated_data)
        # set the password securely
        user.set_password(password)
        user.save()
        # store generated password on instance for the view to expose once
        user._generated_password = password
        if role_ids:
            user.roles.set(role_ids)
        return user

    def update(self, instance, validated_data):
        role_ids = validated_data.pop('role_ids', None)
        password = validated_data.pop('password', None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if password:
            instance.set_password(password)
        instance.save()
        if role_ids is not None:
            instance.roles.set(role_ids)
        return instance
