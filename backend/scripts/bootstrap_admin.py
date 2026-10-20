import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from datetime import datetime, timezone
from app.core.config import settings
from app.core.security import hash_password
from app.db.mongodb import db_manager

def bootstrap_admin(
    email: str = None,
    password: str = None,
    name: str = None,
    city: str = None,
    department: str = None
):
    """
    Idempotent bootstrap script to provision the initial municipal administrator account.
    Will NOT overwrite or reset password if the administrator account already exists.
    """
    db_manager.connect()
    db = db_manager.db

    target_email = (email or settings.ADMIN_BOOTSTRAP_EMAIL).strip().lower()
    target_pwd = password or settings.ADMIN_BOOTSTRAP_PASSWORD
    target_name = name or settings.ADMIN_BOOTSTRAP_NAME
    target_city = city or settings.ADMIN_BOOTSTRAP_CITY
    target_dept = department or settings.ADMIN_BOOTSTRAP_DEPARTMENT

    existing = db.users.find_one({"email": target_email})
    if existing:
        print(f"[INFO] Administrator account already exists: {target_email} ({existing.get('name')}).")
        print("[INFO] Skipping creation to preserve current password and credentials.")
        return existing

    now = datetime.now(timezone.utc)
    hashed = hash_password(target_pwd)

    admin_doc = {
        "name": target_name,
        "email": target_email,
        "password_hash": hashed,
        "role": "admin",
        "city": target_city,
        "department": target_dept,
        "avatar": "🏛️",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    res = db.users.insert_one(admin_doc)
    admin_doc["_id"] = str(getattr(res, "inserted_id", target_email))
    print(f"[SUCCESS] Initial administrator bootstrapped successfully:")
    print(f"  Name:       {target_name}")
    print(f"  Email:      {target_email}")
    print(f"  Role:       admin")
    print(f"  City:       {target_city}")
    print(f"  Department: {target_dept}")
    return admin_doc

if __name__ == "__main__":
    import argparse
    import getpass

    parser = argparse.ArgumentParser(description="Bootstrap CivicPulse Initial Administrator Account")
    parser.add_argument("--interactive", "-i", action="store_true", help="Prompt for administrator credentials interactively")
    parser.add_argument("--email", type=str, help="Admin email address")
    parser.add_argument("--name", type=str, help="Admin full name")
    parser.add_argument("--city", type=str, help="Admin city")
    parser.add_argument("--department", type=str, help="Admin department")
    args = parser.parse_args()

    email = args.email
    password = None
    name = args.name
    city = args.city
    department = args.department

    if args.interactive:
        print("\n--- CivicPulse Administrator Interactive Provisioning ---")
        email = email or input(f"Admin Email [{settings.ADMIN_BOOTSTRAP_EMAIL}]: ").strip() or settings.ADMIN_BOOTSTRAP_EMAIL
        name = name or input(f"Admin Name [{settings.ADMIN_BOOTSTRAP_NAME}]: ").strip() or settings.ADMIN_BOOTSTRAP_NAME
        city = city or input(f"City [{settings.ADMIN_BOOTSTRAP_CITY}]: ").strip() or settings.ADMIN_BOOTSTRAP_CITY
        department = department or input(f"Department [{settings.ADMIN_BOOTSTRAP_DEPARTMENT}]: ").strip() or settings.ADMIN_BOOTSTRAP_DEPARTMENT
        
        while not password:
            pwd1 = getpass.getpass("Enter Administrator Password: ")
            pwd2 = getpass.getpass("Confirm Administrator Password: ")
            if pwd1 != pwd2:
                print("[ERROR] Passwords do not match. Please try again.")
            elif len(pwd1) < 6:
                print("[ERROR] Password must be at least 6 characters.")
            else:
                password = pwd1

    bootstrap_admin(email=email, password=password, name=name, city=city, department=department)
