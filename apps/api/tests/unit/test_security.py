import pytest
from src.core.security import hash_password, verify_password


def test_password_hashing():
    """Test that hashing produces a different string and is verifyable."""
    password = "CorrectHorseBatteryStaple"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("WrongPassword", hashed)


def test_argon2_used():
    """Test that the hash format implies Argon2."""
    password = "test"
    hashed = hash_password(password)
    # Argon2 hashes start with $argon2
    assert hashed.startswith("$argon2")
