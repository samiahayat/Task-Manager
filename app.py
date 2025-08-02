from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from flask_cors import CORS
from bson import ObjectId
from datetime import datetime
app = Flask(__name__)
CORS(app)

# add mmongodb uri string for connection
mongo = PyMongo(app)

users_collection = mongo.db.users
tasks_collection = mongo.db.tasks

# Helper to convert ObjectId
def serialize_task(task):
    return {
        "_id": str(task["_id"]),
        "username": task["username"],
        "title": task["title"],
        "description": task["description"],
        "due_date": task["due_date"],
        "status": task["status"]
    }

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if users_collection.find_one({"username": data["username"]}):
        return jsonify({"message": "Username already exists"}), 409
    users_collection.insert_one(data)
    return jsonify({"message": "Registration successful"}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = users_collection.find_one({"username": data["username"], "password": data["password"]})
    if user:
        return jsonify({"message": "Login successful"}), 200
    return jsonify({"message": "Invalid username or password"}), 401

@app.route('/tasks', methods=['GET'])
def get_tasks():
    username = request.args.get('username')
    tasks = tasks_collection.find({"username": username})
    return jsonify([serialize_task(task) for task in tasks])

@app.route('/tasks', methods=['POST'])
def add_task():
    data = request.json
    task = {
        "username": data["username"],
        "title": data["title"],
        "description": data["description"],
        "due_date": data["due_date"],
        "status": "Pending",
        "created_at": datetime.now()
    }
    mongo.db.tasks.insert_one(task)
    return jsonify({"message": "Task added successfully!"}), 201

@app.route('/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    updated = {
        "title": data["title"],
        "description": data["description"],
        "due_date": data["due_date"],
        "status": data["status"]
    }
    result = tasks_collection.update_one({"_id": ObjectId(task_id)}, {"$set": updated})
    return jsonify({"message": "Task updated!"}) if result.modified_count else jsonify({"message": "No changes made."})

@app.route('/tasks/<task_id>', methods=['GET'])
def get_task(task_id):
    username = request.args.get('username')
    task = tasks_collection.find_one({'_id': ObjectId(task_id), 'username': username})
    if task:
        task['_id'] = str(task['_id'])  # convert ObjectId to string
        return jsonify({'success': True, 'task': task})
    else:
        return jsonify({'success': False, 'message': 'Task not found'}), 404

@app.route('/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    tasks_collection.delete_one({"_id": ObjectId(task_id)})
    return jsonify({"message": "Task deleted successfully"})

if __name__ == '__main__':
    app.run(debug=True)

