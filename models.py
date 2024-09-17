from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class List(db.Model):
    """
    Model representing a to-do list.
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)

    # Relationship to tasks
    tasks = db.relationship('Task', backref='list', lazy=True)

class Task(db.Model):
    """
    Model representing a task within a to-do list.
    """
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    list_id = db.Column(db.Integer, db.ForeignKey('list.id'), nullable=False)
