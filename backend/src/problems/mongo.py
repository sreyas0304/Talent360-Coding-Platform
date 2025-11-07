# import os
from django.conf import settings
from pymongo import MongoClient
from pymongo.server_api import ServerApi

uri = settings.MONGODB_URI
username = getattr(settings, "MONGODB_USERNAME", None)
password = getattr(settings, "MONGODB_PASSWORD", None)

use_srv = bool(uri and uri.startswith("mongodb+srv://"))
client_kwargs = {
    "serverSelectionTimeoutMS": 200000,
    "connectTimeoutMS": 200000,
    "authSource": getattr(settings, "MONGODB_AUTHSOURCE", "admin"),
    "authMechanism": getattr(settings, "MONGODB_AUTHMECH", "SCRAM-SHA-256"),
}
if use_srv:
    client_kwargs["server_api"] = ServerApi("1")

# Pass username/password separately so you don't need URL encoding
_client = MongoClient(uri, username=username, password=password, **client_kwargs)  # noqa : E501

db = _client[settings.DB_NAME]
problems_col = db["code_problems"]
testcase_col = db["testcases"]
solutions_col = db["solutions"]

# Indexes (safe to call multiple times)
problems_col.create_index("slug", name="slug_unique", unique=True)
