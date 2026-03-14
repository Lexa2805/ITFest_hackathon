"""
Authentication API routes – signup & login via Supabase Auth.
All auth logic lives here on the backend (fat-backend pattern).
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from supabase_auth.errors import AuthApiError

from app.schemas.auth import AuthRequest, AuthResponse, UserOut
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def signup(body: AuthRequest):
    """Create a new user account via Supabase Auth."""
    supabase = await get_supabase()
    try:
        result = await supabase.auth.sign_up(
            {"email": body.email, "password": body.password}
        )
    except AuthApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup error: {exc}",
        )

    # Supabase may return a user but no session when email
    # confirmation is enabled.
    if result.session is None:
        return JSONResponse(
            status_code=200,
            content={
                "message": "Check your email to confirm your account.",
                "user": {
                    "id": str(result.user.id) if result.user else None,
                    "email": body.email,
                },
            },
        )

    return AuthResponse(
        access_token=result.session.access_token,
        refresh_token=result.session.refresh_token,
        user=UserOut(
            id=str(result.user.id),
            email=result.user.email,
        ),
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Authenticate an existing user",
)
async def login(body: AuthRequest):
    """Sign in with email + password via Supabase Auth."""
    supabase = await get_supabase()
    try:
        result = await supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except AuthApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {exc}",
        )

    return AuthResponse(
        access_token=result.session.access_token,
        refresh_token=result.session.refresh_token,
        user=UserOut(
            id=str(result.user.id),
            email=result.user.email,
        ),
    )
