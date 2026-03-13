"""Pydantic models for the /api/auth endpoints."""

from pydantic import BaseModel, EmailStr


class AuthRequest(BaseModel):
    """Shared request body for login and signup."""
    email: EmailStr
    password: str


class UserOut(BaseModel):
    """Subset of the Supabase user object returned to the client."""
    id: str
    email: str


class AuthResponse(BaseModel):
    """Successful auth response containing tokens + user info."""
    access_token: str
    refresh_token: str
    user: UserOut


class ErrorResponse(BaseModel):
    """Error response returned on auth failure."""
    detail: str
