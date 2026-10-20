import os
import re
import json
import logging
from typing import Optional, Dict, Any, List
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.core.config import settings

logger = logging.getLogger("civicpulse.db")

def mask_mongodb_uri(uri: str) -> str:
    """Mask credentials in MongoDB connection string for safe, non-sensitive logging."""
    if not uri:
        return "[NOT CONFIGURED]"
    # Mask password in mongodb:// or mongodb+srv://
    pattern = r"(mongodb(\+srv)?:\/\/)([^:]+):([^@]+)@"
    return re.sub(pattern, r"\1\3:*****@", uri)

class Database:
    client: Optional[MongoClient] = None
    db = None
    is_mock: bool = False
    _mock_data: Dict[str, List[Dict[str, Any]]] = {
        "users": [],
        "issues": [],
        "predictions": [],
        "resource_allocations": []
    }
    _offline_db_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "datasets",
        "offline_db.json"
    )

    def connect(self):
        """
        Connect to MongoDB Atlas using PyMongo with connection timeout and ping verification.
        Creates required collections, unique indexes, and 2dsphere geospatial indexes.
        """
        raw_uri = (settings.MONGODB_URI or "").strip()
        if not raw_uri or "<username>" in raw_uri or "replace_with" in raw_uri:
            err_msg = (
                "MongoDB configuration error: MONGODB_URI is not set or contains default placeholder. "
                "Please configure a valid MongoDB Atlas connection string in backend/.env "
                "(e.g., MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority)."
            )
            if os.getenv("TESTING") == "true" or settings.ENVIRONMENT == "testing":
                logger.warning(f"{err_msg} Using test mock store for automated testing.")
                self._enable_test_mock()
                return
            raise RuntimeError(err_msg)

        masked_uri = mask_mongodb_uri(raw_uri)
        logger.info(f"Connecting to MongoDB Atlas at {masked_uri} (database: {settings.MONGODB_DATABASE})...")

        try:
            client = MongoClient(
                raw_uri,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000
            )
            # Verify connectivity using ping
            client.admin.command('ping')
            self.client = client
            self.db = client[settings.MONGODB_DATABASE]
            self.is_mock = False
            self.init_indexes()
            logger.info(f"Connected to MongoDB Atlas successfully [database: {settings.MONGODB_DATABASE}].")
        except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as e:
            err_detail = (
                f"Failed to connect to MongoDB Atlas at {masked_uri}.\n"
                f"Error detail: {e}\n"
                "Troubleshooting steps:\n"
                "1. Verify network connection and DNS resolution.\n"
                "2. Ensure your current IP is whitelisted in MongoDB Atlas (Network Access -> Add IP -> 0.0.0.0/0 for dev).\n"
                "3. Check username, password, and database privileges in MongoDB Atlas Database Access.\n"
                "4. Verify the database name in backend/.env is set to CivicPulse."
            )
            logger.error(err_detail)

            # In development/testing, enable resilient persistent storage with loud notice so developer is not blocked
            if os.getenv("TESTING") == "true" or settings.ENVIRONMENT != "production":
                logger.warning(
                    "[CIVICPULSE NOTICE] MongoDB Atlas is currently rejecting connections (IP not whitelisted). "
                    "Operating with persistent local store (backend/datasets/offline_db.json) so you are not blocked. "
                    "To connect to live Atlas, add 0.0.0.0/0 in MongoDB Atlas -> Security -> Network Access."
                )
                self._enable_test_mock()
                return

            raise ConnectionError(err_detail)

    def _enable_test_mock(self):
        """Enable isolated store for automated tests when external database is unavailable."""
        self.is_mock = True
        self.client = None
        self._load_offline_db()
        self.db = MockMongoDatabase(self._mock_data, self._save_offline_db)
        self.init_indexes()

    def disconnect(self):
        """Close MongoDB connection gracefully during application shutdown."""
        if self.client:
            self.client.close()
            self.client = None
            logger.info("MongoDB Atlas connection closed successfully.")
        elif self.is_mock:
            self._save_offline_db()

    def init_indexes(self):
        """Create required unique, compound, and geospatial indexes across all collections."""
        if not self.is_mock and self.db is not None:
            try:
                # Users: unique email
                self.db.users.create_index("email", unique=True)

                # Issues: unique issue_code, 2dsphere location, status, type, city, dates
                self.db.issues.create_index("issue_code", unique=True)
                self.db.issues.create_index([("location", "2dsphere")])
                self.db.issues.create_index([("city", 1), ("status", 1)])
                self.db.issues.create_index([("type", 1)])
                self.db.issues.create_index([("created_at", -1)])
                self.db.issues.create_index([("user_id", 1)])

                # Predictions: area and period_start
                self.db.predictions.create_index([("area", 1), ("period_start", -1)])

                # Resource Allocations: area and department
                self.db.resource_allocations.create_index([("area", 1), ("department", 1)])
                logger.info("MongoDB indexes verified and ensured.")
            except Exception as e:
                logger.warning(f"Index creation notice: {e}")

    def _load_offline_db(self):
        if os.path.exists(self._offline_db_file):
            try:
                with open(self._offline_db_file, "r", encoding="utf-8") as f:
                    self._mock_data = json.load(f)
            except Exception as e:
                logger.error(f"Error loading offline test store: {e}")

    def _save_offline_db(self):
        try:
            os.makedirs(os.path.dirname(self._offline_db_file), exist_ok=True)
            with open(self._offline_db_file, "w", encoding="utf-8") as f:
                json.dump(self._mock_data, f, default=str, indent=2)
        except Exception as e:
            logger.error(f"Error saving offline test store: {e}")

class MockCollection:
    def __init__(self, data_list: List[Dict[str, Any]], save_callback):
        self.data = data_list
        self.save_callback = save_callback

    def create_index(self, *args, **kwargs):
        pass

    def insert_one(self, doc: Dict[str, Any]):
        new_doc = doc.copy()
        if "_id" not in new_doc:
            import uuid
            new_doc["_id"] = str(uuid.uuid4())
        self.data.append(new_doc)
        self.save_callback()
        class InsertResult:
            inserted_id = new_doc["_id"]
        return InsertResult()

    def find_one(self, query: Optional[Dict[str, Any]] = None, sort=None):
        results = self._filter(query)
        if not results:
            return None
        if sort:
            key, direction = sort[0]
            results.sort(key=lambda x: str(x.get(key, "")), reverse=(direction == -1))
        return results[0].copy()

    def find(self, query: Optional[Dict[str, Any]] = None, sort=None, skip: int = 0, limit: int = 0):
        results = self._filter(query)
        if sort:
            key, direction = sort[0]
            results.sort(key=lambda x: str(x.get(key, "")), reverse=(direction == -1))
        if skip:
            results = results[skip:]
        if limit:
            results = results[:limit]
        return [r.copy() for r in results]

    def count_documents(self, query: Optional[Dict[str, Any]] = None):
        return len(self._filter(query))

    def update_one(self, filter_query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        matches = self._filter(filter_query)
        if matches:
            target = matches[0]
            if "$set" in update:
                target.update(update["$set"])
            self.save_callback()
            class UpdateResult:
                matched_count = 1
                modified_count = 1
            return UpdateResult()
        elif upsert:
            new_doc = filter_query.copy()
            if "$set" in update:
                new_doc.update(update["$set"])
            self.insert_one(new_doc)
            class UpsertResult:
                matched_count = 0
                modified_count = 1
                upserted_id = new_doc.get("_id")
            return UpsertResult()
        class NoopResult:
            matched_count = 0
            modified_count = 0
        return NoopResult()

    def delete_one(self, filter_query: Dict[str, Any]):
        matches = self._filter(filter_query)
        if matches:
            target = matches[0]
            self.data.remove(target)
            self.save_callback()
            class DeleteResult:
                deleted_count = 1
            return DeleteResult()
        class NoDeleteResult:
            deleted_count = 0
        return NoDeleteResult()

    def _filter(self, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not query:
            return list(self.data)
        matched = []
        for item in self.data:
            if self._item_matches(item, query):
                matched.append(item)
        return matched

    def _item_matches(self, item: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if k == "$or":
                sub_queries = v
                if not any(self._item_matches(item, sq) for sq in sub_queries):
                    return False
            elif isinstance(v, dict):
                field_val = item.get(k)
                if "$regex" in v:
                    pattern = v["$regex"]
                    ignore_case = v.get("$options") == "i"
                    flags = re.IGNORECASE if ignore_case else 0
                    if not re.search(pattern, str(field_val or ""), flags):
                        return False
                elif "$gte" in v:
                    if str(field_val or "") < str(v["$gte"]):
                        return False
            else:
                if str(item.get(k)) != str(v):
                    return False
        return True

class MockMongoDatabase:
    def __init__(self, data_store: Dict[str, List[Dict[str, Any]]], save_callback):
        self.data_store = data_store
        self.save_callback = save_callback

    def __getitem__(self, name: str):
        return getattr(self, name)

    @property
    def users(self):
        return MockCollection(self.data_store.setdefault("users", []), self.save_callback)

    @property
    def issues(self):
        return MockCollection(self.data_store.setdefault("issues", []), self.save_callback)

    @property
    def predictions(self):
        return MockCollection(self.data_store.setdefault("predictions", []), self.save_callback)

    @property
    def resource_allocations(self):
        return MockCollection(self.data_store.setdefault("resource_allocations", []), self.save_callback)

db_manager = Database()

def get_database():
    """FastAPI dependency to retrieve the active MongoDB database instance."""
    if db_manager.db is None:
        try:
            db_manager.connect()
        except Exception as e:
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"MongoDB Atlas unreachable. Please ensure your IP is whitelisted in MongoDB Atlas Network Access (0.0.0.0/0). Detail: {e}"
            )
    return db_manager.db
