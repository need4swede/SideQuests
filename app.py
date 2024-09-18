from flask import Flask, render_template, request, redirect, url_for, jsonify
from models import db, Objective, Quest
from flask_migrate import Migrate
import os
from datetime import datetime

app = Flask(__name__)

# Configure the SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sidequests.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database with the app
db.init_app(app)
migrate = Migrate(app, db)

# Ensure tables are created
with app.app_context():
    db.create_all()

@app.route('/', methods=['GET'])
def index():
    """
    Home page that displays all the quests, ordered by the 'order' field.

    Returns:
        Rendered template for the quests index page with all quests.
    """
    # Query all quests from the database, ordered by 'order'
    quests = Quest.query.order_by(Quest.order).all()
    # Render the template with the quests
    return render_template('list_index.html', lists=quests)  # 'lists' variable is used in the template

@app.route('/list/<int:list_id>', methods=['GET'])
def view_list(list_id):
    """
    Displays all objectives within a specific quest, ordered by 'order'.

    Args:
        list_id (int): The ID of the quest to view.

    Returns:
        Rendered template for the objectives list page with all objectives in the specified quest.
    """
    # Get the quest by ID or return 404 if not found
    quest = Quest.query.get_or_404(list_id)
    # Get all objectives associated with the quest, ordered by 'order'
    objectives = Objective.query.filter_by(list_id=list_id).order_by(Objective.order).all()
    # Render the template with the objectives and the quest
    return render_template('task_list.html', tasks=objectives, list=quest)  # 'tasks' and 'list' variables are used in the template

@app.route('/add_list', methods=['POST'])
def add_list():
    """
    Adds a new quest to the database.

    If the quest name is not provided, defaults to today's date in the format 'Tuesday, 9/17/24'.

    Returns:
        JSON response with the new quest's ID and name if successful.
        JSON error message with status code 400 if the quest name is invalid.
    """
    # Get the quest name from the form data
    name = request.form.get('name')
    if not name or name.strip() == '':
        # Generate today's date in the specified format
        today = datetime.now()
        # Format the date (Cross-platform compatibility)
        name = today.strftime('%A, %m/%d/%y').lstrip('0').replace('/0', '/')
    if name:
        # Determine the next order value
        max_order = db.session.query(db.func.max(Quest.order)).scalar() or 0
        # Create a new Quest object
        new_quest = Quest(name=name, order=max_order + 1)
        db.session.add(new_quest)
        db.session.commit()
        # Return JSON response for AJAX
        return jsonify({'id': new_quest.id, 'name': new_quest.name})
    else:
        # Return error if name is invalid
        return jsonify({'error': 'Quest name is required.'}), 400

@app.route('/delete_list/<int:list_id>', methods=['DELETE'])
def delete_list(list_id):
    """
    Deletes a quest and all its associated objectives from the database.

    Args:
        list_id (int): The ID of the quest to delete.

    Returns:
        JSON response indicating success if the deletion was successful.
        JSON error message with status code 404 if the quest is not found.
    """
    # Get the quest by ID or return 404 if not found
    quest = Quest.query.get_or_404(list_id)
    if quest:
        # Delete all objectives associated with the quest
        Objective.query.filter_by(list_id=list_id).delete()
        # Delete the quest itself
        db.session.delete(quest)
        db.session.commit()
        # Return success response
        return jsonify({'success': True})
    else:
        # Return error if quest not found
        return jsonify({'error': 'Quest not found.'}), 404

@app.route('/list/<int:list_id>/add_task', methods=['POST'])
def add_task(list_id):
    """
    Adds a new objective to a specified quest.

    Args:
        list_id (int): The ID of the quest to which the objective will be added.

    Returns:
        JSON response with the new objective's data if successful.
        JSON error message with status code 400 if the objective title is invalid.
    """
    # Get the objective title from the form data
    title = request.form.get('title')
    if title:
        # Determine the next order value within the quest
        max_order = db.session.query(db.func.max(Objective.order)).filter_by(list_id=list_id).scalar() or 0
        # Create a new Objective object
        new_objective = Objective(title=title, list_id=list_id, order=max_order + 1)
        db.session.add(new_objective)
        db.session.commit()
        # Return JSON data for the new objective
        return jsonify({
            'id': new_objective.id,
            'title': new_objective.title,
            'completed': new_objective.completed
        })
    else:
        # Return error if title is invalid
        return jsonify({'error': 'Objective title is required.'}), 400

@app.route('/list/<int:list_id>/complete/<int:task_id>', methods=['POST'])
def complete_task(list_id, task_id):
    """
    Toggles the completion status of an objective.

    Args:
        list_id (int): The ID of the quest containing the objective.
        task_id (int): The ID of the objective to toggle.

    Returns:
        JSON response indicating success and the new completion status if successful.
        JSON error message with status code 404 if the objective is not found or does not belong to the quest.
    """
    # Get the objective by ID or return 404 if not found
    objective = Objective.query.get_or_404(task_id)
    if objective and objective.list_id == list_id:
        # Toggle the completion status
        objective.completed = not objective.completed
        db.session.commit()
        # Return success response with new completion status
        return jsonify({'success': True, 'completed': objective.completed})
    else:
        # Return error if objective not found or does not belong to the quest
        return jsonify({'error': 'Objective not found or does not belong to this quest.'}), 404

@app.route('/list/<int:list_id>/delete/<int:task_id>', methods=['DELETE'])
def delete_task(list_id, task_id):
    """
    Deletes an objective from the database.

    Args:
        list_id (int): The ID of the quest containing the objective.
        task_id (int): The ID of the objective to delete.

    Returns:
        JSON response indicating success if the deletion was successful.
        JSON error message with status code 404 if the objective is not found or does not belong to the quest.
    """
    # Get the objective by ID or return 404 if not found
    objective = Objective.query.get_or_404(task_id)
    if objective and objective.list_id == list_id:
        # Delete the objective
        db.session.delete(objective)
        db.session.commit()
        # Return success response
        return jsonify({'success': True})
    else:
        # Return error if objective not found or does not belong to the quest
        return jsonify({'error': 'Objective not found or does not belong to this quest.'}), 404

@app.route('/update_list/<int:list_id>', methods=['PUT'])
def update_list(list_id):
    """
    Updates the name of a quest.

    Args:
        list_id (int): The ID of the quest to update.

    Returns:
        JSON response indicating success if the update was successful.
        JSON error message with status code 400 if the new name is invalid.
    """
    # Get the new name from the JSON payload
    data = request.get_json()
    new_name = data.get('name', '').strip()
    if new_name == '':
        # Return error if the new name is empty
        return jsonify({'error': 'Quest name cannot be empty.'}), 400

    # Get the quest by ID or return 404 if not found
    quest = Quest.query.get_or_404(list_id)
    # Update the quest name
    quest.name = new_name
    db.session.commit()
    # Return success response
    return jsonify({'success': True})

@app.route('/update_task/<int:list_id>/<int:task_id>', methods=['PUT'])
def update_task(list_id, task_id):
    """
    Updates the title of an objective.

    Args:
        list_id (int): The ID of the quest containing the objective.
        task_id (int): The ID of the objective to update.

    Returns:
        JSON response indicating success if the update was successful.
        JSON error message with status code 400 if the new title is invalid or the objective does not belong to the quest.
    """
    # Get the new title from the JSON payload
    data = request.get_json()
    new_title = data.get('title', '').strip()
    if new_title == '':
        # Return error if the new title is empty
        return jsonify({'error': 'Objective title cannot be empty.'}), 400

    # Get the objective by ID or return 404 if not found
    objective = Objective.query.get_or_404(task_id)
    if objective.list_id != list_id:
        # Return error if the objective does not belong to the specified quest
        return jsonify({'error': 'Objective does not belong to the specified quest.'}), 400

    # Update the objective title
    objective.title = new_title
    db.session.commit()
    # Return success response
    return jsonify({'success': True})

@app.route('/update_quest_order', methods=['POST'])
def update_quest_order():
    """
    Updates the order of quests based on user drag-and-drop actions.

    Expects a JSON payload with 'ordered_ids', a list of quest IDs in their new order.

    Returns:
        JSON response indicating success or failure.
    """
    data = request.get_json()
    ordered_ids = data.get('ordered_ids', [])

    try:
        for index, quest_id in enumerate(ordered_ids):
            quest = Quest.query.get(int(quest_id))
            if quest:
                quest.order = index
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/update_objective_order/<int:list_id>', methods=['POST'])
def update_objective_order(list_id):
    """
    Updates the order of objectives within a quest based on user drag-and-drop actions.

    Args:
        list_id (int): The ID of the quest containing the objectives.

    Expects a JSON payload with 'ordered_ids', a list of objective IDs in their new order.

    Returns:
        JSON response indicating success or failure.
    """
    data = request.get_json()
    ordered_ids = data.get('ordered_ids', [])

    try:
        for index, objective_id in enumerate(ordered_ids):
            objective = Objective.query.get(int(objective_id))
            if objective and objective.list_id == list_id:
                objective.order = index
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    # Get the host and port from environment variables, with defaults
    host = os.environ.get('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=True, host=host, port=port)
