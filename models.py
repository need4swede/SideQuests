from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Quest(db.Model):
    """
    Model representing a quest.
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    order = db.Column(db.Integer, default=0)  # Order field

    # Relationship to objectives
    objectives = db.relationship('Objective', backref='quest', lazy=True)

class Objective(db.Model):
    """
    Model representing an objective within a quest.
    """
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    order = db.Column(db.Integer, default=0)  # Order field
    list_id = db.Column(db.Integer, db.ForeignKey('quest.id'), nullable=False)
