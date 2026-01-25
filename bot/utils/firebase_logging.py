"""Firebase Realtime Database logging handler."""

import logging
from datetime import UTC, datetime

import firebase_admin
from firebase_admin import credentials, db

from bot.config import config


class FirebaseLogHandler(logging.Handler):
    """
    Custom logging handler that pushes log records to Firebase Realtime Database.
    """

    def __init__(self):
        super().__init__()
        self.ref = None
        self._connect()

    def _connect(self):
        try:
            if not config.firebase_database_url:
                return

            try:
                firebase_admin.get_app()
            except ValueError:
                # Initialize app
                cred = None
                if config.firebase_client_email and config.firebase_private_key:
                    cert = {
                        "type": "service_account",
                        "project_id": config.firebase_project_id,
                        "private_key": config.firebase_private_key.replace("\\n", "\n"),
                        "client_email": config.firebase_client_email,
                    }
                    cred = credentials.Certificate(cert)
                else:
                    cred = credentials.ApplicationDefault()

                firebase_admin.initialize_app(cred, {"databaseURL": config.firebase_database_url})

            self.ref = db.reference("logs")

        except Exception:  # pylint: disable=broad-exception-caught
            self.ref = None

    def emit(self, record):
        if not self.ref:
            return

        try:
            log_entry = {
                "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
                "level": record.levelname,
                "message": record.getMessage(),
                "logger": record.name,
                "module": record.module,
                "function": record.funcName,
                "line_no": record.lineno,
                "path": record.pathname,
            }

            if record.exc_info:
                log_entry["exc_info"] = self.format(record)

            # push() generates a unique key based on timestamp
            self.ref.push(log_entry)

        except Exception:  # pylint: disable=broad-exception-caught
            self.handleError(record)
