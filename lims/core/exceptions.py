"""Custom exception handler and LIMS-specific exceptions."""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
import logging

logger = logging.getLogger("lims.exceptions")


class LIMSException(Exception):
    """Base exception for LIMS application errors."""
    code = "LIMS_ERROR"
    default_status = status.HTTP_500_INTERNAL_SERVER_ERROR

    def __init__(self, message=None, code=None, details=None, status_code=None):
        self.message = message or str(self)
        self.error_code = code or self.code
        self.details = details or {}
        self.status_code = status_code or self.default_status
        super().__init__(self.message)


class SampleNotFoundError(LIMSException):
    code = "SAMPLE_NOT_FOUND"
    default_status = status.HTTP_404_NOT_FOUND


class RejectionError(LIMSException):
    code = "SAMPLE_REJECTION_ERROR"
    default_status = status.HTTP_400_BAD_REQUEST


class QCFailureError(LIMSException):
    code = "QC_FAILURE"
    default_status = status.HTTP_422_UNPROCESSABLE_ENTITY


class WorkflowError(LIMSException):
    code = "WORKFLOW_ERROR"
    default_status = status.HTTP_400_BAD_REQUEST


class AuthorizationError(LIMSException):
    code = "AUTHORIZATION_ERROR"
    default_status = status.HTTP_403_FORBIDDEN


def lims_exception_handler(exc, context):
    """Custom DRF exception handler."""
    response = exception_handler(exc, context)

    if response is None:
        # Unhandled exception
        if isinstance(exc, LIMSException):
            response = Response(
                {"error": {"code": exc.error_code, "message": exc.message, "details": exc.details}},
                status=exc.status_code,
            )
        elif isinstance(exc, DjangoValidationError):
            response = Response(
                {"error": {"code": "VALIDATION_ERROR", "message": str(exc)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Standardize error format
    if response is not None and "detail" in response.data:
        error_code = "API_ERROR"
        if isinstance(exc, LIMSException):
            error_code = exc.error_code
        response.data = {
            "error": {
                "code": error_code,
                "message": response.data.get("detail", str(exc)),
                "details": response.data if isinstance(response.data, dict) else {},
            }
        }

    # Log the error
    if response and response.status_code >= 500:
        request = context.get("request")
        logger.error(
            "Unhandled API error: %s %s — %s",
            request.method if request else "N/A",
            request.path if request else "N/A",
            exc,
        )

    return response
