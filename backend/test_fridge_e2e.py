"""
End-to-end smoke test for the Fridge System API.
Uses the Supabase Admin API (service-role key) to create
a pre-confirmed test user so email verification is bypassed.
"""

import httpx
import json
import os
import sys
import uuid

from dotenv import load_dotenv

load_dotenv()

BASE = "http://127.0.0.1:8000"
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

uid = uuid.uuid4().hex[:8]
EMAIL = f"fridgetest_{uid}@test.com"
PASSWORD = "TestPass123!"


def banner(msg: str):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")


def check(label: str, resp: httpx.Response, expected_status: int) -> bool:
    ok = resp.status_code == expected_status
    symbol = "PASS" if ok else "FAIL"
    print(f"  [{symbol}] {label}: {resp.status_code} (expected {expected_status})")
    if not ok:
        print(f"     Body: {resp.text[:400]}")
    return ok


def create_confirmed_user(admin_client: httpx.Client) -> str:
    """Use the Supabase Admin API to create a pre-confirmed user."""
    r = admin_client.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers={
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "apikey": SUPABASE_SERVICE_KEY,
            "Content-Type": "application/json",
        },
        json={
            "email": EMAIL,
            "password": PASSWORD,
            "email_confirm": True,
        },
    )
    if r.status_code not in (200, 201):
        print(f"  [FAIL] Admin user creation: {r.status_code} {r.text[:300]}")
        sys.exit(1)
    user_id = r.json()["id"]
    print(f"  [PASS] Created confirmed test user: {EMAIL} (id: {user_id})")
    return user_id


def get_token(client: httpx.Client) -> str:
    """Sign in via the Supabase GoTrue API to get a JWT."""
    r = client.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Content-Type": "application/json",
        },
        json={"email": EMAIL, "password": PASSWORD},
    )
    if r.status_code != 200:
        print(f"  [FAIL] Token acquisition: {r.status_code} {r.text[:300]}")
        sys.exit(1)
    token = r.json()["access_token"]
    print(f"  [PASS] Got JWT: {token[:25]}...")
    return token


def delete_test_user(admin_client: httpx.Client, user_id: str):
    """Clean up the test user."""
    r = admin_client.delete(
        f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
        headers={
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "apikey": SUPABASE_SERVICE_KEY,
        },
    )
    print(f"  Cleanup: deleted test user ({r.status_code})")


def main():
    results: list[bool] = []
    client = httpx.Client(timeout=30.0)
    item_id = None
    user_id = None

    try:
        # ── 1. Health ────────────────────────────────────────────────
        banner("1. Health Check")
        r = client.get(f"{BASE}/health")
        results.append(check("GET /health", r, 200))

        # ── 2. Create confirmed user via admin API ───────────────────
        banner("2. Create Confirmed Test User (Supabase Admin)")
        user_id = create_confirmed_user(client)
        token = get_token(client)
        headers = {"Authorization": f"Bearer {token}"}

        # ── 3. POST /fridge/items ────────────────────────────────────
        banner("3. Add Fridge Item (POST /fridge/items)")
        r = client.post(f"{BASE}/fridge/items", json={
            "name": "Milk",
            "quantity": 2,
            "unit": "liters",
            "expiry_date": "2026-03-15",
            "category": "dairy"
        }, headers=headers)
        results.append(check("POST /fridge/items (Milk)", r, 201))
        if r.status_code == 201:
            item_data = r.json()["data"]
            item_id = item_data["id"]
            print(f"     Created item: {item_data['name']} | expiring_soon={item_data.get('expiring_soon')}")

        # Add a second item (far expiry)
        r = client.post(f"{BASE}/fridge/items", json={
            "name": "Eggs",
            "quantity": 12,
            "unit": "pcs",
            "expiry_date": "2026-04-01",
            "category": "dairy"
        }, headers=headers)
        results.append(check("POST /fridge/items (Eggs)", r, 201))

        # ── 4. GET /fridge/items ─────────────────────────────────────
        banner("4. List Fridge Items (GET /fridge/items)")
        r = client.get(f"{BASE}/fridge/items", headers=headers)
        results.append(check("GET /fridge/items", r, 200))
        if r.status_code == 200:
            items = r.json()["data"]
            print(f"     Count: {len(items)}")
            for it in items:
                print(f"       - {it['name']} ({it['quantity']} {it['unit']}) expiring_soon={it.get('expiring_soon')}")

        # ── 5. PUT /fridge/items/{id} ────────────────────────────────
        banner("5. Update Item (PUT /fridge/items/{id})")
        r = client.put(f"{BASE}/fridge/items/{item_id}", json={
            "quantity": 1.5,
            "expiry_date": "2026-03-14"
        }, headers=headers)
        results.append(check("PUT /fridge/items", r, 200))
        if r.status_code == 200:
            updated = r.json()["data"]
            print(f"     Updated: qty={updated['quantity']}, expiry={updated['expiry_date']}, expiring_soon={updated.get('expiring_soon')}")

        # ── 6. GET /fridge/inventory ─────────────────────────────────
        banner("6. Inventory (GET /fridge/inventory)")
        r = client.get(f"{BASE}/fridge/inventory", headers=headers)
        results.append(check("GET /fridge/inventory", r, 200))
        if r.status_code == 200:
            inv = r.json()["data"]
            print(f"     Inventory count: {len(inv)}")
            for it in inv:
                print(f"       - {it['name']}: {it['quantity']} {it['unit']} (expiring={it['expiring_soon']})")

        # ── 7. DELETE /fridge/items/{id} ─────────────────────────────
        banner("7. Delete Item (DELETE /fridge/items/{id})")
        r = client.delete(f"{BASE}/fridge/items/{item_id}", headers=headers)
        results.append(check("DELETE /fridge/items", r, 204))

        # Verify deletion
        r = client.get(f"{BASE}/fridge/items", headers=headers)
        if r.status_code == 200:
            remaining = r.json()["data"]
            print(f"     Remaining after delete: {len(remaining)}")

        # ── 8. Auth guard — no token ─────────────────────────────────
        banner("8. Auth Guard Tests")
        r = client.get(f"{BASE}/fridge/items")
        results.append(check("No auth header -> 401", r, 401))

        r = client.get(f"{BASE}/fridge/items", headers={"Authorization": "Bearer bad_token"})
        results.append(check("Bad token -> 401", r, 401))

        # ── 9. Validation — bad body ─────────────────────────────────
        banner("9. Validation Tests")
        r = client.post(f"{BASE}/fridge/items", json={
            "name": "",
            "quantity": -5
        }, headers=headers)
        results.append(check("Invalid body -> 422", r, 422))

        # ── 10. 404 — non existent item ──────────────────────────────
        banner("10. Not Found Test")
        fake_id = "00000000-0000-0000-0000-000000000000"
        r = client.get(f"{BASE}/fridge/items", headers=headers)  # just to confirm endpoint works
        r = client.put(f"{BASE}/fridge/items/{fake_id}", json={"name": "Ghost"}, headers=headers)
        results.append(check("Update non-existent -> 404", r, 404))

        r = client.delete(f"{BASE}/fridge/items/{fake_id}", headers=headers)
        results.append(check("Delete non-existent -> 404", r, 404))

    finally:
        # ── Cleanup ──────────────────────────────────────────────────
        banner("CLEANUP")
        if user_id:
            # Delete remaining fridge items through Supabase
            delete_test_user(client, user_id)

    # ── Summary ──────────────────────────────────────────────────────
    banner("TEST SUMMARY")
    passed = sum(results)
    total = len(results)
    print(f"  Passed: {passed}/{total}")
    if passed == total:
        print("  ALL TESTS PASSED!")
    else:
        print(f"  {total - passed} test(s) failed")
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
