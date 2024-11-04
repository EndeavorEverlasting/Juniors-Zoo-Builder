import os
from flask import Flask, render_template, jsonify, request, session
from datetime import datetime
from models import db, Player

app = Flask(__name__)

# Configuration
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "dev_key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize the database
db.init_app(app)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
        # Create initial player if doesn't exist
        player = Player.query.first()
        if not player:
            player = Player(username="player1")
            db.session.add(player)
            db.session.commit()

@app.route('/')
def game():
    # Get player
    player = Player.query.first()
    
    # Calculate offline earnings
    offline_earnings = player.calculate_offline_earnings()
    player.currency += offline_earnings
    player.last_login = datetime.utcnow()
    db.session.commit()
    
    return render_template('game.html', 
                         player=player,
                         offline_earnings=offline_earnings)

@app.route('/update_progress', methods=['POST'])
def update_progress():
    player = Player.query.first()
    data = request.json
    
    # Update building counts
    if 'building_type' in data:
        building_type = data['building_type']
        if building_type == 'house':
            player.houses += 1
        elif building_type == 'farm':
            player.farms += 1
        elif building_type == 'factory':
            player.factories += 1
    
    player.currency = data.get('currency', player.currency)
    db.session.commit()
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
