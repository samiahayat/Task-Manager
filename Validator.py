from flask import jsonify

def validate_task(data):
    required = ['title', 'description', 'status', 'due_date']
    for field in required:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field} is required"}), 400
    return None
