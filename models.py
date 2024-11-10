from flask_sqlalchemy import SQLAlchemy 
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.dialects.postgresql import JSONB

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    currency = db.Column(db.Integer, default=0)
    last_login = db.Column(db.DateTime, default=datetime.utcnow)
    visitors = db.Column(db.Integer, default=0)
    zoo_rating = db.Column(db.Float, default=3.0)
    visitor_satisfaction = db.Column(db.Float, default=80.0)
    
    # Zoo attractions
    cages = db.Column(db.Integer, default=0)
    habitats = db.Column(db.Integer, default=0)
    safaris = db.Column(db.Integer, default=0)
    
    # Happiness levels (0-100)
    cage_happiness = db.Column(db.Integer, default=80)
    habitat_happiness = db.Column(db.Integer, default=85)
    safari_happiness = db.Column(db.Integer, default=90)
    
    # Currency multiplier
    currency_multiplier = db.Column(db.Float, default=1.0)
    
    def calculate_offline_earnings(self):
        """Calculate earnings while player was offline"""
        time_diff = (datetime.utcnow() - self.last_login).total_seconds()
        
        # Calculate happiness multiplier (0.5 to 1.5)
        cage_multiplier = 0.5 + (self.cage_happiness / 100)
        habitat_multiplier = 0.5 + (self.habitat_happiness / 100)
        safari_multiplier = 0.5 + (self.safari_happiness / 100)
        
        earnings_per_second = (
            self.cages * 1 * cage_multiplier +      # 1-2 currency per cage per second
            self.habitats * 2 * habitat_multiplier + # 2-4 currency per habitat per second
            self.safaris * 5 * safari_multiplier     # 5-10 currency per safari per second
        )
        return int(time_diff * earnings_per_second * self.currency_multiplier)

class SaveState(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    slot_number = db.Column(db.Integer, nullable=False)
    save_name = db.Column(db.String(100))
    save_data = db.Column(JSONB, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    preview_stats = db.Column(JSONB)
    
    __table_args__ = (
        db.UniqueConstraint('player_id', 'slot_number'),
    )

class Reward(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    reward_type = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    cooldown_minutes = db.Column(db.Integer, default=240)
    min_reward = db.Column(db.Integer)
    max_reward = db.Column(db.Integer)
    currency_multiplier = db.Column(db.Float, default=1.0)

class PlayerReward(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    reward_id = db.Column(db.Integer, db.ForeignKey('reward.id'), nullable=False)
    last_claimed = db.Column(db.DateTime)
    next_available = db.Column(db.DateTime)
    
    __table_args__ = (
        db.UniqueConstraint('player_id', 'reward_id'),
    )
