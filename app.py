from flask import Flask, render_template, request, redirect, url_for, jsonify
from models import db, Task, List
from datetime import datetime
import sys

app = Flask(__name__)

# Configure the SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tasks.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

# Home page - List of Lists
@app.route('/', methods=['GET'])
def index():
    lists = List.query.all()
    return render_template('list_index.html', lists=lists)

# View Tasks in a List
@app.route('/list/<int:list_id>', methods=['GET'])
def view_list(list_id):
    todo_list = List.query.get_or_404(list_id)
    tasks = Task.query.filter_by(list_id=list_id).all()
    return render_template('task_list.html', tasks=tasks, list=todo_list)

# Add a New List
@app.route('/add_list', methods=['POST'])
def add_list():
    name = request.form.get('name')
    if not name or name.strip() == '':
        # Generate today's date in the specified format
        today = datetime.now()
        name = today.strftime('%A, %-m/%-d/%y')  # Format: Tuesday, 9/17/24
    if name:
        new_list = List(name=name)
        db.session.add(new_list)
        db.session.commit()
        # Return JSON response for AJAX
        return jsonify({'id': new_list.id, 'name': new_list.name})
    else:
        return jsonify({'error': 'List name is required.'}), 400

# Delete a List and Its Tasks
@app.route('/delete_list/<int:list_id>', methods=['DELETE'])
def delete_list(list_id):
    todo_list = List.query.get_or_404(list_id)
    if todo_list:
        # Delete all tasks associated with the list
        Task.query.filter_by(list_id=list_id).delete()
        db.session.delete(todo_list)
        db.session.commit()
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'List not found.'}), 404

# Add a New Task to a List
@app.route('/list/<int:list_id>/add_task', methods=['POST'])
def add_task(list_id):
    title = request.form.get('title')
    if title:
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
        return jsonify({'error': 'Title is required.'}), 400

# Toggle Task Completion
@app.route('/list/<int:list_id>/complete/<int:task_id>', methods=['POST'])
def complete_task(list_id, task_id):
    task = Task.query.get_or_404(task_id)
    if task and task.list_id == list_id:
        task.completed = not task.completed
        db.session.commit()
        return jsonify({'success': True, 'completed': task.completed})
    else:
        return jsonify({'error': 'Task not found or does not belong to this list.'}), 404

# Delete a Task
@app.route('/list/<int:list_id>/delete/<int:task_id>', methods=['DELETE'])
def delete_task(list_id, task_id):
    task = Task.query.get_or_404(task_id)
    if task and task.list_id == list_id:
        db.session.delete(task)
        db.session.commit()
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'Task not found or does not belong to this list.'}), 404

if __name__ == '__main__':
    # Default port
    port = 8000

    # Check for port argument
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number provided. Using default port 5000.")

    # Run the app
    app.run(debug=True, port=port)
