from flask import Flask, render_template, request, redirect, url_for, jsonify
from models import db, Task, List
import sys
from datetime import datetime

app = Flask(__name__)

# Configure the SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tasks.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database with the app
db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/', methods=['GET'])
def index():
    """
    Home page that displays all the lists.

    Returns:
        Rendered template for the list index page with all lists.
    """
    # Query all lists from the database
    lists = List.query.all()
    # Render the template with the lists
    return render_template('list_index.html', lists=lists)

@app.route('/list/<int:list_id>', methods=['GET'])
def view_list(list_id):
    """
    Displays all tasks within a specific list.

    Args:
        list_id (int): The ID of the list to view.

    Returns:
        Rendered template for the task list page with all tasks in the specified list.
    """
    # Get the list by ID or return 404 if not found
    todo_list = List.query.get_or_404(list_id)
    # Get all tasks associated with the list
    tasks = Task.query.filter_by(list_id=list_id).all()
    # Render the template with the tasks and the list
    return render_template('task_list.html', tasks=tasks, list=todo_list)

@app.route('/add_list', methods=['POST'])
def add_list():
    """
    Adds a new list to the database.

    If the list name is not provided, defaults to today's date in the format 'Tuesday, 9/17/24'.

    Returns:
        JSON response with the new list's ID and name if successful.
        JSON error message with status code 400 if the list name is invalid.
    """
    # Get the list name from the form data
    name = request.form.get('name')
    if not name or name.strip() == '':
        # Generate today's date in the specified format
        today = datetime.now()
        # Format the date (Cross-platform compatibility)
        name = today.strftime('%A, %m/%d/%y').lstrip('0').replace('/0', '/')
    if name:
        # Create a new List object
        new_list = List(name=name)
        db.session.add(new_list)
        db.session.commit()
        # Return JSON response for AJAX
        return jsonify({'id': new_list.id, 'name': new_list.name})
    else:
        # Return error if name is invalid
        return jsonify({'error': 'List name is required.'}), 400

@app.route('/delete_list/<int:list_id>', methods=['DELETE'])
def delete_list(list_id):
    """
    Deletes a list and all its associated tasks from the database.

    Args:
        list_id (int): The ID of the list to delete.

    Returns:
        JSON response indicating success if the deletion was successful.
        JSON error message with status code 404 if the list is not found.
    """
    # Get the list by ID or return 404 if not found
    todo_list = List.query.get_or_404(list_id)
    if todo_list:
        # Delete all tasks associated with the list
        Task.query.filter_by(list_id=list_id).delete()
        # Delete the list itself
        db.session.delete(todo_list)
        db.session.commit()
        # Return success response
        return jsonify({'success': True})
    else:
        # Return error if list not found
        return jsonify({'error': 'List not found.'}), 404

@app.route('/list/<int:list_id>/add_task', methods=['POST'])
def add_task(list_id):
    """
    Adds a new task to a specified list.

    Args:
        list_id (int): The ID of the list to which the task will be added.

    Returns:
        JSON response with the new task's data if successful.
        JSON error message with status code 400 if the task title is invalid.
    """
    # Get the task title from the form data
    title = request.form.get('title')
    if title:
        # Create a new Task object
        new_task = Task(title=title, list_id=list_id)
        db.session.add(new_task)
        db.session.commit()
        # Return JSON data for the new task
        return jsonify({
            'id': new_task.id,
            'title': new_task.title,
            'completed': new_task.completed
        })
    else:
        # Return error if title is invalid
        return jsonify({'error': 'Title is required.'}), 400

@app.route('/list/<int:list_id>/complete/<int:task_id>', methods=['POST'])
def complete_task(list_id, task_id):
    """
    Toggles the completion status of a task.

    Args:
        list_id (int): The ID of the list containing the task.
        task_id (int): The ID of the task to toggle.

    Returns:
        JSON response indicating success and the new completion status if successful.
        JSON error message with status code 404 if the task is not found or does not belong to the list.
    """
    # Get the task by ID or return 404 if not found
    task = Task.query.get_or_404(task_id)
    if task and task.list_id == list_id:
        # Toggle the completion status
        task.completed = not task.completed
        db.session.commit()
        # Return success response with new completion status
        return jsonify({'success': True, 'completed': task.completed})
    else:
        # Return error if task not found or does not belong to the list
        return jsonify({'error': 'Task not found or does not belong to this list.'}), 404

@app.route('/list/<int:list_id>/delete/<int:task_id>', methods=['DELETE'])
def delete_task(list_id, task_id):
    """
    Deletes a task from the database.

    Args:
        list_id (int): The ID of the list containing the task.
        task_id (int): The ID of the task to delete.

    Returns:
        JSON response indicating success if the deletion was successful.
        JSON error message with status code 404 if the task is not found or does not belong to the list.
    """
    # Get the task by ID or return 404 if not found
    task = Task.query.get_or_404(task_id)
    if task and task.list_id == list_id:
        # Delete the task
        db.session.delete(task)
        db.session.commit()
        # Return success response
        return jsonify({'success': True})
    else:
        # Return error if task not found or does not belong to the list
        return jsonify({'error': 'Task not found or does not belong to this list.'}), 404

@app.route('/update_list/<int:list_id>', methods=['PUT'])
def update_list(list_id):
    """
    Updates the name of a list.

    Args:
        list_id (int): The ID of the list to update.

    Returns:
        JSON response indicating success if the update was successful.
        JSON error message with status code 400 if the new name is invalid.
    """
    # Get the new name from the JSON payload
    data = request.get_json()
    new_name = data.get('name', '').strip()
    if new_name == '':
        # Return error if the new name is empty
        return jsonify({'error': 'List name cannot be empty.'}), 400

    # Get the list by ID or return 404 if not found
    todo_list = List.query.get_or_404(list_id)
    # Update the list name
    todo_list.name = new_name
    db.session.commit()
    # Return success response
    return jsonify({'success': True})

@app.route('/update_task/<int:list_id>/<int:task_id>', methods=['PUT'])
def update_task(list_id, task_id):
    """
    Updates the title of a task.

    Args:
        list_id (int): The ID of the list containing the task.
        task_id (int): The ID of the task to update.

    Returns:
        JSON response indicating success if the update was successful.
        JSON error message with status code 400 if the new title is invalid or the task does not belong to the list.
    """
    # Get the new title from the JSON payload
    data = request.get_json()
    new_title = data.get('title', '').strip()
    if new_title == '':
        # Return error if the new title is empty
        return jsonify({'error': 'Task title cannot be empty.'}), 400

    # Get the task by ID or return 404 if not found
    task = Task.query.get_or_404(task_id)
    if task.list_id != list_id:
        # Return error if the task does not belong to the specified list
        return jsonify({'error': 'Task does not belong to the specified list.'}), 400

    # Update the task title
    task.title = new_title
    db.session.commit()
    # Return success response
    return jsonify({'success': True})

if __name__ == '__main__':
    # Default port number
    port = 8000

    # Check if a port number is provided as an argument
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number provided. Using default port 5000.")

    # Run the Flask app
    app.run(debug=True, port=port)
