import os
from datetime import datetime
from flask import Flask, render_template, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, current_user, login_required
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)

# Import models here after db is initialized
from models import User, Building

@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))

@app.route('/')
def index():
    return render_template('game.html')

@app.route('/update_progress', methods=['POST'])
@login_required
def update_progress():
    data = request.json
    current_user.coins = data['coins']
    current_user.last_login = datetime.utcnow()
    db.session.commit()
    return jsonify({'status': 'success'})

@app.route('/get_offline_progress')
@login_required
def get_offline_progress():
    time_diff = (datetime.utcnow() - current_user.last_login).total_seconds()
    buildings = Building.query.filter_by(user_id=current_user.id).all()
    offline_earnings = sum(b.coins_per_second * time_diff for b in buildings)
    return jsonify({'offline_earnings': offline_earnings})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000)
