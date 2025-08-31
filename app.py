from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from bson.objectid import ObjectId
from pymongo import MongoClient
from datetime import datetime, timedelta
from collections import defaultdict

# -----------------------
# Flask + Socket.IO Setup
# -----------------------
app = Flask(__name__)
CORS(app)  # allow frontend requests
socketio = SocketIO(app, cors_allowed_origins="*")

# -----------------------
# MongoDB Setup
# -----------------------
app.config["MONGO_URI"] = "mongodb+srv://samia123:aimas1234@cluster0.5issyjn.mongodb.net/TaskProject?retryWrites=true&w=majority&appName=Cluster0"
mongo = PyMongo(app)

users_collection = mongo.db.users
tasks_collection = mongo.db.tasks

# -----------------------
# Helper function
# -----------------------
def notify_all(message):
    """Send a notification to all connected clients"""
    socketio.emit("notification", {"message": message}, broadcast=True)


# -----------------------
# User Registration
# -----------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Missing data"}), 400

    if users_collection.find_one({"username": username}):
        return jsonify({"message": "Username already exists"}), 400

    users_collection.insert_one({"username": username, "password": password})
    return jsonify({"message": "User registered successfully"}), 201


# -----------------------
# User Login
# -----------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    user = users_collection.find_one({"username": username, "password": password})
    if user:
        return jsonify({"success": True, "message": "Login successful"})
    else:
        return jsonify({"success": False, "message": "Invalid credentials"})


# -----------------------
# Create Task
# -----------------------
@app.route("/tasks", methods=["POST"])
def add_task():
    data = request.get_json()   # ✅ safer

    username = data.get("username")
    title = data.get("title")
    description = data.get("description", "")
    due_date = data.get("due_date")

    if not username or not title or not due_date:
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    new_task = {
        "username": username,
        "title": title,
        "description": description,
        "due_date": due_date,
        "status": "Pending",
        "shared_with": [],
        "created_at": datetime.now().isoformat()
    }

    result = tasks_collection.insert_one(new_task)
    new_task["_id"] = str(result.inserted_id)

    notify_all(f"📌 New task added: {title} by {username}")

    return jsonify({"success": True, "message": "Task added successfully", "task": new_task}), 201


# -----------------------
# Get Tasks (only user + shared)
# -----------------------
@app.route("/tasks", methods=["GET"])
def get_tasks():
    username = request.args.get("username")

    if not username:
        return jsonify({"error": "Username is required"}), 400

    tasks = list(tasks_collection.find({
        "$or": [
            {"username": username},
            {"shared_with": username}
        ]
    }))

    for task in tasks:
        task["_id"] = str(task["_id"])

    return jsonify(tasks)


# -----------------------
# Update Task
# -----------------------
@app.route("/tasks/<task_id>", methods=["PUT"])
def update_task(task_id):
    try:
        data = request.get_json()   # ✅ safer
        username = data.get("username")

        if not username:
            return jsonify({"success": False, "message": "Username is required"}), 400

        task_object_id = ObjectId(task_id)
        task = tasks_collection.find_one({"_id": task_object_id})

        if not task:
            return jsonify({"success": False, "message": "Task not found"}), 404

        if task["username"] != username and username not in task.get("shared_with", []):
            return jsonify({"success": False, "message": "Not authorized"}), 403

        update_data = {}
        for field in ["title", "description", "due_date", "status"]:
            if field in data:
                update_data[field] = data[field]

        if data.get("status") == "Completed" and task.get("status") != "Completed":
            update_data["completed_at"] = datetime.now().isoformat()

        tasks_collection.update_one({"_id": task_object_id}, {"$set": update_data})
        updated_task = tasks_collection.find_one({"_id": task_object_id})
        updated_task["_id"] = str(updated_task["_id"])

        notify_all(f"✏️ Task updated: {task['title']}")

        return jsonify({"success": True, "message": "Task updated", "task": updated_task})
    except Exception as e:
        print(f"Error updating task: {e}")
        return jsonify({"success": False, "message": "Server error"}), 500


# -----------------------
# Share Task
# -----------------------
@app.route("/share_task", methods=["POST"])
def share_task():
    data = request.get_json()
    username = data.get("username")
    task_id = data.get("task_id")
    share_with = data.get("share_with")

    if not username or not task_id or not share_with:
        return jsonify({"error": "Missing data"}), 400

    try:
        # Convert string ID to ObjectId
        task_object_id = ObjectId(task_id)

        # find the task
        task = tasks_collection.find_one({"_id": task_object_id, "username": username})
        if not task:
            return jsonify({"error": "Task not found"}), 404

        # update task with a new "shared_with" field (list of usernames)
        tasks_collection.update_one(
            {"_id": task_object_id},
            {"$addToSet": {"shared_with": share_with}}
        )

        return jsonify({"message": "Task shared successfully"}), 200

    except Exception as e:
        print("Error while sharing task:", e)
        return jsonify({"error": "Server error"}), 500


# -----------------------
# Delete Task
# -----------------------
@app.route("/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    try:
        data = request.get_json() or {}
        username = data.get("username")  # ✅ now accepts JSON body

        if not username:
            return jsonify({"success": False, "message": "Username is required"}), 400

        task_object_id = ObjectId(task_id)
        task = tasks_collection.find_one({"_id": task_object_id})

        if not task:
            return jsonify({"success": False, "message": "Task not found"}), 404

        if task["username"] != username:
            return jsonify({"success": False, "message": "Only owner can delete"}), 403

        tasks_collection.delete_one({"_id": task_object_id})
        notify_all(f"🗑️ Task deleted: {task['title']}")

        return jsonify({"success": True, "message": "Task deleted"})
    except Exception as e:
        print(f"Error deleting task: {e}")
        return jsonify({"success": False, "message": "Server error"}), 500

# -----------------------
# Analytics Overview
# -----------------------
@app.route("/analytics/overview", methods=["GET"])
def analytics_overview():
    username = request.args.get("username")

    if not username:
        return jsonify({"error": "Username is required"}), 400

    # Get user's tasks (owned and shared)
    tasks = list(tasks_collection.find({
        "$or": [
            {"username": username},
            {"shared_with": username}
        ]
    }))

    # Calculate metrics
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.get("status") == "Completed"])
    pending_tasks = len([t for t in tasks if t.get("status") in ["Pending", "In Progress"]])

    # Calculate overdue tasks
    today = datetime.now().date()
    overdue_tasks = 0
    for task in tasks:
        if task.get("status") != "Completed" and task.get("due_date"):
            try:
                due_date = datetime.strptime(task["due_date"], "%Y-%m-%d").date()
                if due_date < today:
                    overdue_tasks += 1
            except:
                pass

    # Status distribution
    status_distribution = {
        "Pending": len([t for t in tasks if t.get("status") == "Pending"]),
        "In Progress": len([t for t in tasks if t.get("status") == "In Progress"]),
        "Completed": len([t for t in tasks if t.get("status") == "Completed"])
    }

    return jsonify({
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "overdue_tasks": overdue_tasks,
        "status_distribution": status_distribution
    })


# -----------------------
# Analytics Trends
# -----------------------
@app.route("/analytics/trends", methods=["GET"])
def analytics_trends():
    username = request.args.get("username")

    if not username:
        return jsonify({"error": "Username is required"}), 400

    # Get user's tasks (owned and shared)
    tasks = list(tasks_collection.find({
        "$or": [
            {"username": username},
            {"shared_with": username}
        ]
    }))

    # Weekly trends - last 7 days
    weekly_data = defaultdict(lambda: {"completed": 0, "created": 0})

    today = datetime.now().date()
    for i in range(6, -1, -1):
        date = today - timedelta(days=i)
        weekly_data[date.strftime("%Y-%m-%d")] = {"completed": 0, "created": 0}

    for task in tasks:
        # Check creation date
        if "created_at" in task:
            try:
                created_date = datetime.fromisoformat(task["created_at"]).date()
                if created_date >= today - timedelta(days=6):
                    weekly_data[created_date.strftime("%Y-%m-%d")]["created"] += 1
            except:
                pass

        # Check completion date (if completed)
        if task.get("status") == "Completed" and "completed_at" in task:
            try:
                completed_date = datetime.fromisoformat(task["completed_at"]).date()
                if completed_date >= today - timedelta(days=6):
                    weekly_data[completed_date.strftime("%Y-%m-%d")]["completed"] += 1
            except:
                pass

    # Format weekly data
    dates = sorted(weekly_data.keys())
    weekly_labels = [datetime.strptime(d, "%Y-%m-%d").strftime("%a") for d in dates]
    weekly_created = [weekly_data[d]["created"] for d in dates]
    weekly_completed = [weekly_data[d]["completed"] for d in dates]

    return jsonify({
        "weekly": {
            "labels": weekly_labels,
            "created": weekly_created,
            "completed": weekly_completed
        }
    })


# -----------------------
# Run Flask + Socket.IO
# -----------------------
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
