import re
import datetime as dt
import json
import logging
# from bson import ObjectId
from urllib.parse import unquote
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
# from django.shortcuts import render
from django.http import JsonResponse, HttpResponseNotAllowed
from django.views.decorators.csrf import csrf_exempt
from .mongo import problems_col, testcase_col, solutions_col
from .utils import to_jsonable
logger = logging.getLogger("health")

DIFFICULTIES = {"Easy", "Medium", "Hard"}


@csrf_exempt
def health_check(request):
    """
    GET  /api/healthz  -> {"status":"ok","method":"GET"}
    POST /api/healthz  -> echoes JSON body: {"status":"ok","method":"POST","echo":{...}}  # noqa : E501
    Other methods      -> 405
    """
    try:
        if request.method == "GET":
            return JsonResponse({"status": "ok", "method": "GET"})
        if request.method == "POST":
            try:
                body = json.loads(request.body or b"{}")
            except json.JSONDecodeError:
                return JsonResponse({"detail": "Invalid JSON"}, status=400)
            return JsonResponse({"status": "ok", "method": "POST", "echo": body})  # noqa : E501
        return HttpResponseNotAllowed(["GET", "POST"])
    except Exception:
        logger.exception("health_check error")
        return JsonResponse({"detail": "Internal Server Error"}, status=500)


def slugify(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def normalize_problem(p: dict) -> dict:
    """
    Minimal LeetCode-like problem document.
    Required: title, difficulty, categories (list[str])
    Optional: source (default 'LeetCode'), url
    """
    title = (p.get("title") or "").strip()
    difficulty = (p.get("difficulty") or "").strip()
    categories = p.get("categories", [])

    if not title:
        raise ValueError("title is required")
    if difficulty not in DIFFICULTIES:
        raise ValueError("difficulty must be one of Easy/Medium/Hard")
    if not isinstance(categories, list) or not categories:
        raise ValueError("categories must be a non-empty list of strings")

    categories = [str(c).strip() for c in categories if str(c).strip()]
    now = dt.datetime.utcnow()

    doc = {
        "slug": slugify(title),
        "title": title,
        "difficulty": difficulty,
        "categories": categories,
        "category_slugs": [slugify(c) for c in categories],
        "updated_at": now,
    }
    doc["_created_at"] = now  # used only on first insert
    return doc


class ProblemsView(APIView):
    """
    POST /api/problems
      - Body: a single problem object OR a JSON list of problem objects.
      - Upserts by slug (safe to re-run).

    GET /api/problems
      - Lists all problems (sorted by title).
    """

    def post(self, request):
        payload = request.data
        items = payload if isinstance(payload, list) else [payload]

        normalized = []
        # Validate & normalize
        try:
            for item in items:
                normalized.append(normalize_problem(item))
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)   # noqa : E501

        # Upsert each by slug
        upserted = 0
        results = []
        for doc in normalized:
            slug = doc["slug"]
            update = {
                "$set": {
                    "title": doc["title"],
                    "difficulty": doc["difficulty"],
                    "categories": doc["categories"],
                    "category_slugs": doc["category_slugs"],
                    "updated_at": doc["updated_at"],
                },
                "$setOnInsert": {
                    "slug": slug,
                    "created_at": doc["_created_at"],
                },
            }
            res = problems_col.update_one({"slug": slug}, update, upsert=True)
            if res.upserted_id is not None or res.modified_count > 0:
                upserted += 1
            results.append({"slug": slug, "status": "ok"})

        return Response({"upserted": upserted, "results": results}, status=status.HTTP_201_CREATED)  # noqa : E501

    def get(self, request, slug=None):
        print("hello")
        cursor = problems_col.find({}).sort([("title", 1)])
        if slug:
            slug = unquote(slug)
            doc = problems_col.find_one({"slug": slug}, {"_id": 0})
            if not doc:
                return Response({"detail": "Problem Not Found"}, status=status.HTTP_404_NOT_FOUND)  # noqa : E501
            return Response(doc, status=status.HTTP_200_OK)

        # list branch
        cursor = problems_col.find({}).sort([("title", 1)])
        out = []
        for doc in cursor:
            doc["_id"] = str(doc["_id"])
            out.append(doc)
        return Response(out, status=status.HTTP_200_OK)


class TestCaseView(APIView):

    def get(self, request):
        print("test cases")
        cursor = testcase_col.find({}).sort([("problemSlug", 1)])
        testcase_list = []
        for doc in cursor:
            # Convert ObjectId to string
            doc['_id'] = str(doc['_id'])
            testcase_list.append(doc)
        return Response(testcase_list, status=status.HTTP_200_OK)


class SolutionView(APIView):
    def get(self, request, slug):
        slug = unquote(slug)

        if not problems_col.find_one({"slug": slug}, {"_id": 1}):
            return Response({"detail": "Problem Not Found"}, status=status.HTTP_404_NOT_FOUND)   # noqa : E501

        q = {"problemSlug": slug}

        cursor = (solutions_col
                  .find(q, {"_id": 0})
                  .sort([("isOfficial", -1), ("upvotes", -1), ("createdAt", -1)])  # noqa : E501
                  .limit(1))

        doc = next(cursor, None)
        if not doc:
            return Response({"detail": "No solution found"}, status=status.HTTP_404_NOT_FOUND)   # noqa : E501

        return Response(to_jsonable(doc), status=status.HTTP_200_OK)
