from flask import Flask, render_template, request, redirect, url_for, jsonify, session, flash
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from functools import wraps
import os
from datetime import datetime

app = Flask(__name__)

# Configure the SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sidequests.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Set the secret key for session management
app.secret_key = os.environ.get('SECRET_KEY', 'your_default_secret_key')

# Initialize the database with the app
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Define the Quest model
class Quest(db.Model):
    """
    Model representing a quest.
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    order = db.Column(db.Integer, default=0)  # Order field

    # Relationship to objectives
    objectives = db.relationship('Objective', backref='quest', lazy=True)

# Define the Objective model
class Objective(db.Model):
    """
    Model representing an objective within a quest.
    """
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    order = db.Column(db.Integer, default=0)  # Order field
    list_id = db.Column(db.Integer, db.ForeignKey('quest.id'), nullable=False)

# Ensure tables are created
with app.app_context():
    db.create_all()

# Decorator for routes that require login
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

# Route for login
@app.route('/login', methods=['GET', 'POST'])
def login():
    """
    Handles user login by checking the provided credentials against environment variables.
    """
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        # Get admin credentials from environment variables
        admin_username = os.environ.get('ADMIN_USERNAME')
        admin_password = os.environ.get('ADMIN_PASSWORD')

        if username == admin_username and password == admin_password:
            session['logged_in'] = True
            flash('You were successfully logged in.', 'success')
            next_url = request.args.get('next')
            return redirect(next_url or url_for('index'))
        else:
            flash('Invalid username or password.', 'danger')
    return render_template('login.html')

# Route for logout
@app.route('/logout')
def logout():
    """
    Logs the user out by clearing the session.
    """
    session.clear()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

# Home page displaying all quests
@app.route('/', methods=['GET'])
@login_required
def index():
    """
    Home page that displays all the quests, ordered by the 'order' field.
    """
    # Query all quests from the database, ordered by 'order'
    quests = Quest.query.order_by(Quest.order).all()
    # Render the template with the quests
    return render_template('list_index.html', lists=quests)  # 'lists' variable is used in the template

# View a specific quest and its objectives
@app.route('/list/<int:list_id>', methods=['GET'])
@login_required
def view_list(list_id):
    """
    Displays all objectives within a specific quest, ordered by 'order'.
    """
    # Get the quest by ID or return 404 if not found
    quest = Quest.query.get_or_404(list_id)
    # Get all objectives associated with the quest, ordered by 'order'
    objectives = Objective.query.filter_by(list_id=list_id).order_by(Objective.order).all()
    # Render the template with the objectives and the quest
    return render_template('task_list.html', tasks=objectives, list=quest)  # 'tasks' and 'list' variables are used in the template

# Add a new quest
@app.route('/add_list', methods=['POST'])
@login_required
def add_list():
    """
    Adds a new quest to the database.
    """
    # Get the quest name from the form data
    name = request.form.get('name')
    if not name or name.strip() == '':
        # Generate today's date in the specified format
        today = datetime.now()
        # Format the date
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

# Delete a quest and its objectives
@app.route('/delete_list/<int:list_id>', methods=['DELETE'])
@login_required
def delete_list(list_id):
    """
    Deletes a quest and all its associated objectives from the database.
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

# Add a new objective to a quest
@app.route('/list/<int:list_id>/add_task', methods=['POST'])
@login_required
def add_task(list_id):
    """
    Adds a new objective to a specified quest.
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

# Toggle the completion status of an objective
@app.route('/list/<int:list_id>/complete/<int:task_id>', methods=['POST'])
@login_required
def complete_task(list_id, task_id):
    """
    Toggles the completion status of an objective.
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

# Delete an objective from a quest
@app.route('/list/<int:list_id>/delete/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(list_id, task_id):
    """
    Deletes an objective from the database.
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

# Update the name of a quest
@app.route('/update_list/<int:list_id>', methods=['PUT'])
@login_required
def update_list(list_id):
    """
    Updates the name of a quest.
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

# Update the title of an objective
@app.route('/update_task/<int:list_id>/<int:task_id>', methods=['PUT'])
@login_required
def update_task(list_id, task_id):
    """
    Updates the title of an objective.
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

# Update the order of quests after drag-and-drop
@app.route('/update_quest_order', methods=['POST'])
@login_required
def update_quest_order():
    """
    Updates the order of quests based on user drag-and-drop actions.
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

# Update the order of objectives within a quest after drag-and-drop
@app.route('/update_objective_order/<int:list_id>', methods=['POST'])
@login_required
def update_objective_order(list_id):
    """
    Updates the order of objectives within a quest based on user drag-and-drop actions.
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

# Run the application
if __name__ == '__main__':
    # Get the host and port from environment variables, with defaults
    host = os.environ.get('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 8080))
    app.run(debug=True, host=host, port=port)
