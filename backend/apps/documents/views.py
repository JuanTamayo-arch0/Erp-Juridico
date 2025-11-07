from rest_framework.decorators import action
from django.shortcuts import redirect
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Document
from .serializers import DocumentSerializer
from backend.apps.storage.adapter import S3Adapter
from django.http import StreamingHttpResponse, HttpResponse
from wsgiref.util import FileWrapper
from django.core.files.storage import default_storage
from django.utils.text import get_valid_filename
import time
import os
from backend.apps.audit.models import AuditLog
from django.db import models
from .models import DocumentVersion
from .serializers import DocumentVersionSerializer
from rest_framework import mixins
from backend.apps.cases.models import CaseResponsible
from backend.apps.cases.utils import cases_accessible_by


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all().order_by('-created_at')
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # if case provided, ensure the user participates in that case (or is staff)
        case = serializer.validated_data.get('case')
        if case is not None and not getattr(self.request.user, 'is_staff', False):
            owner_ok = getattr(case, 'owner_id', None) == self.request.user.id
            responsible_ok = case.responsibles.filter(user=self.request.user, left_at__isnull=True).exists()
            if not (owner_ok or responsible_ok):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('You are not a participant of the target case')

        obj = serializer.save(uploaded_by=self.request.user)
        # audit log
        try:
            AuditLog.objects.create(
                user=str(self.request.user),
                action='document.created',
                object_type='Document',
                object_id=str(obj.id),
                details={'title': obj.title, 'case_id': getattr(obj, 'case_id', None)}
            )
        except Exception:
            pass
        # also record an actuacion (save state)
        try:
            if getattr(obj, 'case_id', None):
                from backend.apps.cases.models import CaseActuacion
                CaseActuacion.objects.create(
                    case_id=obj.case_id,
                    actor=self.request.user,
                    action_type='document.created',
                    details={'document_id': obj.id, 'title': obj.title}
                )
        except Exception:
            pass

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        # only allow deletion by admins, the case principal, or the uploader
        try:
            case = getattr(obj, 'case', None)
            is_principal = False
            if case is not None:
                is_principal = CaseResponsible.objects.filter(case=case, user=request.user, role='principal', left_at__isnull=True).exists()
            if not (request.user.is_staff or is_principal or (getattr(obj, 'uploaded_by', None) and obj.uploaded_by_id == request.user.id)):
                return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)
        except Exception:
            pass
        obj_id = obj.id
        title = obj.title
        resp = super().destroy(request, *args, **kwargs)
        try:
            AuditLog.objects.create(
                user=str(request.user),
                action='document.deleted',
                object_type='Document',
                object_id=str(obj_id),
                details={'title': title}
            )
        except Exception:
            pass
        try:
            if getattr(obj, 'case_id', None):
                from backend.apps.cases.models import CaseActuacion
                CaseActuacion.objects.create(
                    case_id=obj.case_id,
                    actor=request.user,
                    action_type='document.deleted',
                    details={'document_id': obj_id, 'title': title}
                )
        except Exception:
            pass
        return resp

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, 'user', None)
        # filter by cases accessible to the user; also allow uncategorized documents
        from backend.apps.cases.models import Case, CaseResponsible  # local import
        accessible_cases = cases_accessible_by(user, Case.objects.all()).values('id')
        base = qs.filter(models.Q(case_id__in=accessible_cases) | models.Q(case__isnull=True))

        mine = self.request.query_params.get('mine') in ('1', 'true', 'True')
        case_id = self.request.query_params.get('case')
        if case_id:
            # If the user is active in this case, allow all documents
            if Case.objects.filter(id=case_id, id__in=accessible_cases).exists():
                qs_case = qs.filter(case_id=case_id)
                return qs_case.filter(uploaded_by=user) if mine else qs_case
            # Otherwise, if the user left the case, allow only up to left_at
            left = CaseResponsible.objects.filter(case_id=case_id, user=user, left_at__isnull=False).first()
            if left and left.left_at:
                qs_case = qs.filter(case_id=case_id, created_at__lte=left.left_at)
                return qs_case.filter(uploaded_by=user) if mine else qs_case
            # No access
            return qs.none()
        # No case filter
        return base.filter(uploaded_by=user) if mine else base

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def presigned(self, request, pk=None):
        """Redirect to a presigned GET URL for the document so browsers can
        download without CORS issues for XHRs.
        """
        doc = self.get_object()
        adapter = S3Adapter()

        # Prefer a locally-stored file (fallback upload) if present so the
        # browser downloads the local copy instead of going to MinIO/S3.
        try:
            storage_key = getattr(doc, 'key', None)
            if storage_key and default_storage.exists(storage_key):
                f = default_storage.open(storage_key, 'rb')
                content_type = 'application/octet-stream'
                # Try to infer content type from storage metadata if available
                try:
                    content_type = adapter.get_object_stream(storage_key).get('ContentType') or content_type
                except Exception:
                    pass
                response = StreamingHttpResponse(FileWrapper(f), content_type=content_type)
                try:
                    response['Content-Length'] = str(default_storage.size(storage_key))
                except Exception:
                    pass
                if doc.title:
                    response['Content-Disposition'] = f'attachment; filename="{doc.title}"'
                return response
        except Exception:
            # ignore and fall back to presigned redirect
            pass

        # No local file found -> redirect to presigned MinIO/S3 URL
        url = adapter.presign_get(doc.key)
        return redirect(url)

    @action(detail=True, methods=['get'])
    def proxy(self, request, pk=None):
        """Stream the object through the Django server (same-origin) to avoid
        browser CORS requirements for client-side fetches. Use this when you
        don't want to rely on the client fetching from MinIO directly.
        """
        doc = self.get_object()
        # allow inline preview if client requests it (e.g., ?inline=1)
        inline = request.GET.get('inline') in ('1', 'true', 'True')
        adapter = S3Adapter()
        obj = adapter.get_object_stream(doc.key)

        # If adapter couldn't provide a streaming body, check whether the
        # file exists on local Django storage (fallback upload path). If so,
        # stream it from disk. Otherwise fall back to redirecting to the
        # presigned URL so downloads still work.
        if not obj.get('body'):
            # obj may include a 'url' pointing to storage or an external URL.
            storage_key = None
            # Prefer the Document.key which we save for local uploads.
            if getattr(doc, 'key', None):
                storage_key = doc.key
            elif obj.get('url') and obj['url'].startswith('/'):
                # some storages produce a relative URL
                storage_key = obj['url']

            if storage_key:
                try:
                    if default_storage.exists(storage_key):
                        f = default_storage.open(storage_key, 'rb')
                        content_type = obj.get('ContentType') or 'application/octet-stream'
                        response = StreamingHttpResponse(FileWrapper(f), content_type=content_type)
                        try:
                            content_length = default_storage.size(storage_key)
                        except Exception:
                            content_length = None
                        if content_length:
                            response['Content-Length'] = str(content_length)
                        if doc.title:
                            if inline:
                                response['Content-Disposition'] = f'inline; filename="{doc.title}"'
                            else:
                                response['Content-Disposition'] = f'attachment; filename="{doc.title}"'
                        if obj.get('ETag'):
                            response['ETag'] = obj.get('ETag')
                        return response
                except Exception:
                    # ignore and fall through to presigned redirect
                    pass

            url = adapter.presign_get(doc.key)
            return redirect(url)

        body = obj['body']
        content_type = obj.get('ContentType') or 'application/octet-stream'
        content_length = obj.get('ContentLength')
        etag = obj.get('ETag')

        # StreamingBody from boto3 has an iterator interface; wrap it for WSGI
        try:
            iterator = body.iter_chunks(chunk_size=8192)
        except Exception:
            # fallback: read whole body
            data = body.read()
            resp = HttpResponse(data, content_type=content_type)
            if content_length:
                resp['Content-Length'] = str(content_length)
            if doc.title:
                if inline:
                    response['Content-Disposition'] = f'inline; filename="{doc.title}"'
                else:
                    response['Content-Disposition'] = f'attachment; filename="{doc.title}"'
            if etag:
                resp['ETag'] = etag
            return resp

        response = StreamingHttpResponse(iterator, content_type=content_type)
        if content_length:
            response['Content-Length'] = str(content_length)
        if doc.title:
            if inline:
                response['Content-Disposition'] = f'inline; filename="{doc.title}"'
            else:
                response['Content-Disposition'] = f'attachment; filename="{doc.title}"'
        if etag:
            response['ETag'] = etag
        return response

    @action(detail=False, methods=['post'])
    def upload_local(self, request):
        """Fallback endpoint: accept a file upload and store it on the Django
        server (MEDIA_ROOT). This is used when direct S3/MinIO uploads fail and
        we want to keep progressing without blocking the user.
        Expects multipart/form-data with a 'file' field and optional 'title'
        and 'case' fields.
        """
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)

        title = request.data.get('title') or file_obj.name
        case_id = request.data.get('case')
        # if case provided, ensure participation
        if case_id:
            try:
                from backend.apps.cases.models import Case
                case = Case.objects.get(pk=case_id)
            except Exception:
                return Response({'detail': 'case not found'}, status=status.HTTP_400_BAD_REQUEST)
            if not getattr(request.user, 'is_staff', False):
                owner_ok = getattr(case, 'owner_id', None) == request.user.id
                responsible_ok = case.responsibles.filter(user=request.user, left_at__isnull=True).exists()
                if not (owner_ok or responsible_ok):
                    return Response({'detail': 'you are not a participant of the target case'}, status=status.HTTP_403_FORBIDDEN)

        # sanitize filename and add a timestamp prefix to avoid collisions
        safe_name = get_valid_filename(file_obj.name)
        ts = int(time.time() * 1000)
        folder = f"documents/cases/{case_id}" if case_id else "documents/uncategorized"
        relative_path = os.path.join(folder, f"{ts}-{safe_name}")

        saved_path = default_storage.save(relative_path, file_obj)
        public_url = default_storage.url(saved_path)

        # create Document record
        doc = Document.objects.create(
            title=title,
            key=saved_path,
            url=public_url,
            case_id=case_id or None,
            uploaded_by=request.user,
        )

        serializer = self.get_serializer(doc)
        # record actuacion for document upload via local fallback
        try:
            if getattr(doc, 'case_id', None):
                from backend.apps.cases.models import CaseActuacion
                CaseActuacion.objects.create(
                    case_id=doc.case_id,
                    actor=request.user,
                    action_type='document.created',
                    details={'document_id': doc.id, 'title': doc.title, 'mode': 'upload_local'}
                )
        except Exception:
            pass
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class DocumentVersionViewSet(mixins.ListModelMixin,
                             mixins.CreateModelMixin,
                             mixins.RetrieveModelMixin,
                             mixins.DestroyModelMixin,
                             viewsets.GenericViewSet):
    """CRUD for document versions. Creating a version accepts a multipart
    upload and stores the file on the Django storage (similar to upload_local).
    """
    queryset = DocumentVersion.objects.all().order_by('-created_at')
    serializer_class = DocumentVersionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # attach uploader
        version = serializer.save(uploaded_by=self.request.user)
        try:
            AuditLog.objects.create(
                user=str(self.request.user),
                action='document.version.created',
                object_type='DocumentVersion',
                object_id=str(version.id),
                details={'document_id': version.document_id}
            )
        except Exception:
            pass
        # actuacion for version
        try:
            from backend.apps.documents.models import Document
            from backend.apps.cases.models import CaseActuacion
            doc = Document.objects.filter(id=version.document_id).first()
            if doc and getattr(doc, 'case_id', None):
                CaseActuacion.objects.create(
                    case_id=doc.case_id,
                    actor=self.request.user,
                    action_type='document.version.created',
                    details={'document_id': version.document_id, 'version_id': version.id}
                )
        except Exception:
            pass

    def destroy(self, request, *args, **kwargs):
        version = self.get_object()
        vid = version.id
        doc_id = version.document_id
        resp = super().destroy(request, *args, **kwargs)
        try:
            AuditLog.objects.create(
                user=str(request.user),
                action='document.version.deleted',
                object_type='DocumentVersion',
                object_id=str(vid),
                details={'document_id': doc_id}
            )
        except Exception:
            pass
        return resp

    def create(self, request, *args, **kwargs):
        """Handle multipart file upload for a new DocumentVersion.

        Accepts form-data: document (id), file, optional title. Saves file to
        default_storage and creates a DocumentVersion with key/url.
        """
        file_obj = request.FILES.get('file')
        document_id = request.data.get('document')
        title = request.data.get('title') or (file_obj.name if file_obj else '')

        if not document_id:
            return Response({'detail': 'document is required'}, status=status.HTTP_400_BAD_REQUEST)

        if not file_obj:
            return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)

        # sanitize and save
        safe_name = get_valid_filename(file_obj.name)
        ts = int(time.time() * 1000)
        folder = f"documents/versions/{document_id}"
        relative_path = os.path.join(folder, f"{ts}-{safe_name}")
        saved_path = default_storage.save(relative_path, file_obj)
        public_url = default_storage.url(saved_path)

        # create version record
        try:
            version = DocumentVersion.objects.create(
                document_id=document_id,
                title=title,
                key=saved_path,
                url=public_url,
                uploaded_by=request.user,
            )
        except Exception as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # audit
        try:
            AuditLog.objects.create(
                user=str(request.user),
                action='document.version.created',
                object_type='DocumentVersion',
                object_id=str(version.id),
                details={'document_id': version.document_id}
            )
        except Exception:
            pass

        serializer = self.get_serializer(version)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        qs = super().get_queryset()
        document_id = self.request.query_params.get('document')
        if document_id:
            return qs.filter(document_id=document_id)
        return qs


class PresignUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        key = request.data.get('key')
        if not key:
            return Response({'detail': 'key is required'}, status=status.HTTP_400_BAD_REQUEST)
        adapter = S3Adapter()
        data = adapter.presign_upload(key)
        return Response(data)
