from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    currency = db.Column(db.Integer, default=0)
    last_login = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Building counts
    houses = db.Column(db.Integer, default=0)
    farms = db.Column(db.Integer, default=0)
    factories = db.Column(db.Integer, default=0)

    def calculate_offline_earnings(self):
        """Calculate earnings while player was offline"""
        time_diff = (datetime.utcnow() - self.last_login).total_seconds()
        earnings_per_second = (
            self.houses * 1 +    # 1 currency per house per second
            self.farms * 2 +     # 2 currency per farm per second
            self.factories * 5   # 5 currency per factory per second
        )
        return int(time_diff * earnings_per_second)
