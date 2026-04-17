"""Audit trail models — append-only, tamper-evident."""
import uuid
import hashlib
from django.db import models


class AuditLog(models.Model):
    """Immutable audit log with hash chain integrity."""
    id = models.BigAutoField(primary_key=True)

    action = models.CharField(max_length=20, db_index=True)  # CREATE, UPDATE, DELETE, LOGIN, SIGN, etc.
    user_id = models.UUIDField(db_index=True)
    user_email = models.CharField(max_length=254)
    user_role = models.CharField(max_length=100, blank=True)

    entity_type = models.CharField(max_length=50, db_index=True)  # 'sample', 'report', etc.
    entity_id = models.UUIDField(db_index=True)
    entity_repr = models.CharField(max_length=500, blank=True)  # Human-readable

    changes = models.JSONField(default=dict, blank=True)  # {"field": {"old": "A", "new": "B"}}

    site_id = models.UUIDField(db_index=True, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    session_id = models.CharField(max_length=100, blank=True)
    request_id = models.CharField(max_length=50, blank=True)
    timestamp = models.DateTimeField(db_index=True, auto_now_add=True)

    # Tamper-evident hash chain
    previous_hash = models.CharField(max_length=128, blank=True, default="")
    row_hash = models.CharField(max_length=128, blank=True, default="")

    class Meta:
        db_table = "audit_logs"
        ordering = ["timestamp"]
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
            models.Index(fields=["user_id"]),
            models.Index(fields=["action"]),
        ]

    def save(self, *args, **kwargs):
        """Auto-compute hash on save."""
        payload = f"{self.action}|{self.user_email}|{self.entity_type}|{self.entity_id}|{self.changes}|{self.timestamp}"
        self.row_hash = hashlib.sha512(payload.encode()).hexdigest()
        if not self.previous_hash:
            self.previous_hash = "0" * 128  # Genesis
        super().save(*args, **kwargs)


def verify_audit_chain():
    """Verify entire audit log chain integrity. Returns list of broken indices."""
    broken = []
    logs = AuditLog.objects.order_by("timestamp")
    prev_hash = "0" * 128
    for log in logs:
        payload = f"{log.action}|{log.user_email}|{log.entity_type}|{log.entity_id}|{log.changes}|{log.timestamp}"
        expected_row_hash = hashlib.sha512(payload.encode()).hexdigest()
        if log.row_hash != expected_row_hash:
            broken.append(log.id)
        prev_hash = hashlib.sha512(f"{prev_hash}{expected_row_hash}".encode()).hexdigest()
    return broken
