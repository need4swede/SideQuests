# ============================
# 1. Standard Library Imports
# ============================

import os  # Interact with the operating system and handle environment variables
from functools import wraps  # Create decorator functions
from datetime import datetime  # Work with dates and times
from urllib.parse import urlparse, urljoin  # Parse and manipulate URLs

# ============================
# 2. Third-Party Library Imports
# ============================

from flask import (
    Flask,            # The core Flask class to create the application
    render_template,  # Render HTML templates
    request,          # Access incoming request data
    redirect,         # Redirect responses to different routes
    url_for,          # Build URLs for specific functions
    jsonify,          # Return JSON responses
    session,          # Manage user sessions
    flash             # Display flashed messages to users
)
from flask_sqlalchemy import SQLAlchemy  # ORM for database interactions
from flask_migrate import Migrate          # Handle database migrations
from dotenv import load_dotenv            # Load environment variables from a .env file

# ============================
# 3. Application Setup
# ============================

# Load environment variables from .env file
# Uncomment the following line if you have a .env file to load environment variables
# load_dotenv()

# Initialize the Flask application
app = Flask(__name__)

# ============================
# 4. Application Configuration
# ============================

# Configure the SQLite database URI
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///sidequests.db'

# Disable modification tracking to save resources
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Secret Key fetched from environment variables for security purposes
app.secret_key = os.getenv('SECRET_KEY')

# Initialize SQLAlchemy with the Flask app for ORM capabilities
db = SQLAlchemy(app)

# Initialize Flask-Migrate for handling database migrations
migrate = Migrate(app, db)

# ============================
# 5. Database Models
# ============================

class Quest(db.Model):
    """
    Represents a Quest in the application.

    Attributes:
        id (int): Primary key identifier for the quest.
        name (str): The name of the quest.
        order (int): The display order of the quest.
        objectives (List[Objective]): A list of associated objectives.
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    order = db.Column(db.Integer, default=0)
    # Establish a one-to-many relationship with Objective
    objectives = db.relationship('Objective', backref='quest', lazy=True)

class Objective(db.Model):
    """
    Represents an Objective within a Quest.

    Attributes:
        id (int): Primary key identifier for the objective.
        title (str): The title or description of the objective.
        completed (bool): Status indicating if the objective is completed.
        order (int): The display order of the objective within its quest.
        list_id (int): Foreign key linking to the associated Quest.
    """
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    order = db.Column(db.Integer, default=0)
    # Foreign key linking to the Quest model
    list_id = db.Column(db.Integer, db.ForeignKey('quest.id'), nullable=False)

# ============================
# 6. Database Initialization
# ============================

# Ensure all database tables are created
with app.app_context():
    db.create_all()

# ============================
# 7. Helper Functions
# ============================

def is_safe_url(target):
    """
    Validates whether the target URL is safe for redirects.

    Args:
        target (str): The target URL to validate.

    Returns:
        bool: True if the URL is safe, False otherwise.
    """
    ref_url = urlparse(request.host_url)
    test_url = urlparse(urljoin(request.host_url, target))
    # Check if the netloc (network location) is the same as the host
    return test_url.netloc in [ref_url.netloc, request.host]

def login_required(f):
    """
    Decorator to ensure that routes require user authentication.

    Args:
        f (function): The route function to wrap.

    Returns:
        function: The wrapped function that includes authentication check.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if the user is logged in by verifying the session
        if 'logged_in' not in session:
            # Store the next URL to redirect after successful login
            session['next_url'] = request.url
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# ============================
# 8. Route Definitions
# ============================

@app.route('/login', methods=['GET', 'POST'])
def login():
    """
    Handles user login by verifying credentials.

    GET: Renders the login page.
    POST: Processes login credentials and authenticates the user.

    Returns:
        Response: Redirects to the main page upon successful login or re-renders the login page with errors.
    """
    # If the user is already logged in, redirect to the main page
    if 'logged_in' in session:
        return redirect(url_for('root'))

    if request.method == 'POST':
        # Retrieve username and password from the submitted form
        username = request.form.get('username')
        password = request.form.get('password')

        # Fetch admin credentials from environment variables
        admin_username = os.getenv('ADMIN_USERNAME')
        admin_password = os.getenv('ADMIN_PASSWORD')

        # Validate credentials
        if username == admin_username and password == admin_password:
            # Set the session to indicate the user is logged in
            session['logged_in'] = True
            flash('You were successfully logged in.', 'success')
            # Retrieve the next URL to redirect to after login
            next_url = session.pop('next_url', None)
            return redirect(next_url or url_for('root'))
        else:
            # Flash an error message for invalid credentials
            flash('Invalid username or password.', 'danger')

    # Render the login template for GET requests or failed POST attempts
    return render_template('login.html')

@app.route('/')
@login_required
def root():
    """
    Renders the main page displaying all quests.

    Requires:
        User to be authenticated.

    Returns:
        Response: The rendered 'list_index.html' template with all quests.
    """
    # Query all quests ordered by their 'order' attribute
    quests = Quest.query.order_by(Quest.order).all()
    # Render the template with the list of quests
    return render_template('list_index.html', lists=quests)

@app.route('/list/<int:list_id>', methods=['GET'])
@login_required
def view_list(list_id):
    """
    Displays the details of a specific quest, including its objectives.

    Args:
        list_id (int): The ID of the quest to view.

    Returns:
        Response: The rendered 'task_list.html' template with quest details and objectives.
    """
    # Retrieve the quest by ID or return a 404 error if not found
    quest = Quest.query.get_or_404(list_id)
    # Retrieve all objectives associated with the quest, ordered by their 'order'
    objectives = Objective.query.filter_by(list_id=list_id).order_by(Objective.order).all()
    # Render the template with the quest and its objectives
    return render_template('task_list.html', tasks=objectives, list=quest)

@app.route('/add_list', methods=['POST'])
@login_required
def add_list():
    """
    Adds a new quest to the database.

    Expects:
        Form data with the 'name' of the quest.

    Returns:
        JSON: The newly created quest's ID and name upon success.
        JSON: An error message with status 400 if the quest name is missing.
    """
    # Retrieve the 'name' from the submitted form
    name = request.form.get('name')
    # If name is not provided or is empty, generate a default name based on the current date
    if not name or name.strip() == '':
        today = datetime.now()
        name = today.strftime('%A, %m/%d/%y').lstrip('0').replace('/0', '/')
    if name:
        # Determine the maximum current order to place the new quest at the end
        max_order = db.session.query(db.func.max(Quest.order)).scalar() or 0
        # Create a new Quest instance
        new_quest = Quest(name=name, order=max_order + 1)
        # Add and commit the new quest to the database
        db.session.add(new_quest)
        db.session.commit()
        # Return the new quest's details as JSON
        return jsonify({'id': new_quest.id, 'name': new_quest.name})
    else:
        # Return an error if the quest name is still invalid
        return jsonify({'error': 'Quest name is required.'}), 400

@app.route('/delete_list/<int:list_id>', methods=['DELETE'])
@login_required
def delete_list(list_id):
    """
    Deletes a specific quest and all its associated objectives.

    Args:
        list_id (int): The ID of the quest to delete.

    Returns:
        JSON: Success message upon successful deletion.
        JSON: An error message with status 404 if the quest is not found.
    """
    # Retrieve the quest by ID or return a 404 error if not found
    quest = Quest.query.get_or_404(list_id)
    if quest:
        # Delete all objectives associated with the quest
        Objective.query.filter_by(list_id=list_id).delete()
        # Delete the quest itself
        db.session.delete(quest)
        db.session.commit()
        # Return a success response
        return jsonify({'success': True})
    else:
        # Return an error if the quest does not exist
        return jsonify({'error': 'Quest not found.'}), 404


@app.route('/list/<int:list_id>/add_task', methods=['POST'])
@login_required
def add_task(list_id):
    """
    Adds a new objective to a specific quest.

    Args:
        list_id (int): The ID of the quest to add the objective to.

    Expects:
        Form data with the 'title' of the objective.

    Returns:
        JSON: The newly created objective's details upon success.
        JSON: An error message with status 400 if the objective title is missing.
    """
    # Retrieve the 'title' from the submitted form
    title = request.form.get('title')
    if title:
        # Determine the maximum current order to place the new objective at the end
        max_order = db.session.query(db.func.max(Objective.order)).filter_by(list_id=list_id).scalar() or 0
        # Create a new Objective instance
        new_objective = Objective(title=title, list_id=list_id, order=max_order + 1)
        # Add and commit the new objective to the database
        db.session.add(new_objective)
        db.session.commit()
        # Return the new objective's details as JSON
        return jsonify({
            'id': new_objective.id,
            'title': new_objective.title,
            'completed': new_objective.completed
        })
    else:
        # Return an error if the objective title is missing
        return jsonify({'error': 'Objective title is required.'}), 400


@app.route('/list/<int:list_id>/complete/<int:task_id>', methods=['POST'])
@login_required
def complete_task(list_id, task_id):
    """
    Toggles the completion status of a specific objective.

    Args:
        list_id (int): The ID of the quest containing the objective.
        task_id (int): The ID of the objective to toggle.

    Returns:
        JSON: Success message and the new completion status upon success.
        JSON: An error message with status 404 if the objective is not found or does not belong to the quest.
    """
    # Retrieve the objective by ID or return a 404 error if not found
    objective = Objective.query.get_or_404(task_id)
    # Verify that the objective belongs to the specified quest
    if objective and objective.list_id == list_id:
        # Toggle the 'completed' status
        objective.completed = not objective.completed
        db.session.commit()
        # Return the updated status as JSON
        return jsonify({'success': True, 'completed': objective.completed})
    else:
        # Return an error if the objective does not belong to the quest
        return jsonify({'error': 'Objective not found or does not belong to this quest.'}), 404


@app.route('/list/<int:list_id>/delete/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(list_id, task_id):
    """
    Deletes a specific objective from a quest.

    Args:
        list_id (int): The ID of the quest containing the objective.
        task_id (int): The ID of the objective to delete.

    Returns:
        JSON: Success message upon successful deletion.
        JSON: An error message with status 404 if the objective is not found or does not belong to the quest.
    """
    # Retrieve the objective by ID or return a 404 error if not found
    objective = Objective.query.get_or_404(task_id)
    # Verify that the objective belongs to the specified quest
    if objective and objective.list_id == list_id:
        # Delete the objective from the database
        db.session.delete(objective)
        db.session.commit()
        # Return a success response
        return jsonify({'success': True})
    else:
        # Return an error if the objective does not belong to the quest
        return jsonify({'error': 'Objective not found or does not belong to this quest.'}), 404


@app.route('/update_list/<int:list_id>', methods=['PUT'])
@login_required
def update_list(list_id):
    """
    Updates the name of a specific quest.

    Args:
        list_id (int): The ID of the quest to update.

    Expects:
        JSON data with the new 'name' for the quest.

    Returns:
        JSON: Success message upon successful update.
        JSON: An error message with status 400 if the new name is empty.
    """
    # Parse JSON data from the request
    data = request.get_json()
    new_name = data.get('name', '').strip()
    # Validate that the new name is not empty
    if new_name == '':
        return jsonify({'error': 'Quest name cannot be empty.'}), 400

    # Retrieve the quest by ID or return a 404 error if not found
    quest = Quest.query.get_or_404(list_id)
    # Update the quest's name
    quest.name = new_name
    db.session.commit()
    # Return a success response
    return jsonify({'success': True})


@app.route('/update_task/<int:list_id>/<int:task_id>', methods=['PUT'])
@login_required
def update_task(list_id, task_id):
    """
    Updates the title of a specific objective.

    Args:
        list_id (int): The ID of the quest containing the objective.
        task_id (int): The ID of the objective to update.

    Expects:
        JSON data with the new 'title' for the objective.

    Returns:
        JSON: Success message upon successful update.
        JSON: An error message with status 400 if the new title is empty or the objective does not belong to the quest.
    """
    # Parse JSON data from the request
    data = request.get_json()
    new_title = data.get('title', '').strip()
    # Validate that the new title is not empty
    if new_title == '':
        return jsonify({'error': 'Objective title cannot be empty.'}), 400

    # Retrieve the objective by ID or return a 404 error if not found
    objective = Objective.query.get_or_404(task_id)
    # Verify that the objective belongs to the specified quest
    if objective.list_id != list_id:
        return jsonify({'error': 'Objective does not belong to the specified quest.'}), 400

    # Update the objective's title
    objective.title = new_title
    db.session.commit()
    # Return a success response
    return jsonify({'success': True})


@app.route('/update_quest_order', methods=['POST'])
@login_required
def update_quest_order():
    """
    Updates the display order of quests based on a provided list of ordered IDs.

    Expects:
        JSON data with 'ordered_ids', a list of quest IDs in the desired order.

    Returns:
        JSON: Success message upon successful update.
        JSON: An error message with status 400 if an exception occurs during the update.
    """
    # Parse JSON data from the request
    data = request.get_json()
    ordered_ids = data.get('ordered_ids', [])

    try:
        # Iterate over the ordered IDs and update each quest's 'order' attribute
        for index, quest_id in enumerate(ordered_ids):
            quest = Quest.query.get(int(quest_id))
            if quest:
                quest.order = index
        # Commit all changes to the database
        db.session.commit()
        # Return a success response
        return jsonify({'success': True})
    except Exception as e:
        # Rollback the session in case of an error
        db.session.rollback()
        # Return the error message as JSON with status 400
        return jsonify({'error': str(e)}), 400


@app.route('/update_objective_order/<int:list_id>', methods=['POST'])
@login_required
def update_objective_order(list_id):
    """
    Updates the display order of objectives within a specific quest based on a provided list of ordered IDs.

    Args:
        list_id (int): The ID of the quest containing the objectives.

    Expects:
        JSON data with 'ordered_ids', a list of objective IDs in the desired order.

    Returns:
        JSON: Success message upon successful update.
        JSON: An error message with status 400 if an exception occurs during the update.
    """
    # Parse JSON data from the request
    data = request.get_json()
    ordered_ids = data.get('ordered_ids', [])

    try:
        # Iterate over the ordered IDs and update each objective's 'order' attribute
        for index, objective_id in enumerate(ordered_ids):
            objective = Objective.query.get(int(objective_id))
            if objective and objective.list_id == list_id:
                objective.order = index
        # Commit all changes to the database
        db.session.commit()
        # Return a success response
        return jsonify({'success': True})
    except Exception as e:
        # Rollback the session in case of an error
        db.session.rollback()
        # Return the error message as JSON with status 400
        return jsonify({'error': str(e)}), 400

# ============================
# 9. Application Entry Point
# ============================

if __name__ == '__main__':
    """
    Entry point for running the Flask application.

    The application runs in debug mode and listens on all network interfaces at port 8080.
    """
    app.run(debug=True, host='0.0.0.0', port=8080)
