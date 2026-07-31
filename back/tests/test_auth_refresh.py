import os
import sys
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

def _make_session(access_token="new-access", refresh_token="new-refresh"):
    session = MagicMock()
    session.access_token = access_token
    session.refresh_token = refresh_token
    session.expires_in = 3600
    return session


def _make_user():
    user = MagicMock()
    user.id = "user-123"
    user.email = "test@example.com"
    user.user_metadata = {"full_name": "Test User"}
    user.app_metadata = {"role": "authenticated"}
    return user


def _make_auth_data(refresh_token="new-refresh"):
    return {
        "session": _make_session(refresh_token=refresh_token),
        "user": _make_user(),
    }


class TestRefreshEndpoint(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        from app.api import auth as auth_module
        from fastapi import FastAPI
        from fastapi.testclient import TestClient

        app = FastAPI()
        app.include_router(auth_module.router)
        self.client = TestClient(app, raise_server_exceptions=True)

    def test_refresh_via_header_ok(self):
        with patch("app.api.auth.auth_service") as mock_svc:
            mock_svc.refresh_token = AsyncMock(return_value=_make_auth_data())
            resp = self.client.post(
                "/auth/refresh",
                headers={"Authorization": "Bearer valid-refresh-token"},
            )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["access_token"], "new-access")
        self.assertEqual(data["refresh_token"], "new-refresh")

    def test_refresh_via_body_fallback_ok(self):
        with patch("app.api.auth.auth_service") as mock_svc:
            mock_svc.refresh_token = AsyncMock(return_value=_make_auth_data())
            resp = self.client.post(
                "/auth/refresh",
                json={"refresh_token": "valid-refresh-token"},
            )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["access_token"], "new-access")

    def test_refresh_no_token_returns_400(self):
        with patch("app.api.auth.auth_service") as mock_svc:
            mock_svc.refresh_token = AsyncMock(return_value=None)
            resp = self.client.post("/auth/refresh")
        self.assertEqual(resp.status_code, 400)

    def test_refresh_invalid_token_returns_401(self):
        with patch("app.api.auth.auth_service") as mock_svc:
            mock_svc.refresh_token = AsyncMock(return_value=None)
            resp = self.client.post(
                "/auth/refresh",
                headers={"Authorization": "Bearer expired-token"},
            )
        self.assertEqual(resp.status_code, 401)

    def test_refresh_supabase_no_rotation_returns_original_token(self):
        original_token = "original-client-token"
        auth_data = _make_auth_data(refresh_token=None)

        with patch("app.api.auth.auth_service") as mock_svc:
            mock_svc.refresh_token = AsyncMock(return_value=auth_data)
            resp = self.client.post(
                "/auth/refresh",
                headers={"Authorization": f"Bearer {original_token}"},
            )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["refresh_token"], original_token)

    def test_header_takes_priority_over_body(self):
        header_token = "header-token"
        body_token = "body-token"

        with patch("app.api.auth.auth_service") as mock_svc:
            mock_svc.refresh_token = AsyncMock(return_value=_make_auth_data())
            resp = self.client.post(
                "/auth/refresh",
                headers={"Authorization": f"Bearer {header_token}"},
                json={"refresh_token": body_token},
            )

        mock_svc.refresh_token.assert_awaited_once_with(header_token)
        self.assertEqual(resp.status_code, 200)


if __name__ == "__main__":
    unittest.main()
