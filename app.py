import os
from flask import Flask, render_template, jsonify, request
from datetime import datetime
from models import db, Player

app = Flask(__name__)

# Configuration
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "dev_key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
if app.config["SQLALCHEMY_DATABASE_URI"].startswith("postgres://"):
    app.config["SQLALCHEMY_DATABASE_URI"] = app.config["SQLALCHEMY_DATABASE_URI"].replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize the database
db.init_app(app)

with app.app_context():
    # Drop all tables and recreate them
    db.drop_all()
    db.create_all()
    
    # Create initial player if doesn't exist
    player = Player.query.first()
    if not player:
        player = Player(username="player1", currency=100)
        db.session.add(player)
        db.session.commit()

@app.route('/')
def game():
    # Get player
    player = Player.query.first()
    
    # Calculate offline earnings
    offline_earnings = player.calculate_offline_earnings()
    player.currency += offline_earnings
    
    # Ensure minimum currency for new players
    if player.currency < 100:
        player.currency = 100
        
    # Update happiness levels periodically
    player.cage_happiness = min(100, max(50, player.cage_happiness))
    player.habitat_happiness = min(100, max(60, player.habitat_happiness))
    player.safari_happiness = min(100, max(70, player.safari_happiness))
    
    # Update visitor count based on attractions and happiness
    base_visitors = (player.cages * 2 + player.habitats * 4 + player.safaris * 8)
    happiness_multiplier = (
        player.cage_happiness + 
        player.habitat_happiness + 
        player.safari_happiness
    ) / 300  # Average happiness (0.5 to 1.0)
    player.visitors = int(base_visitors * happiness_multiplier)
    
    player.last_login = datetime.utcnow()
    db.session.commit()
    
    return render_template('game.html', 
                         player=player,
                         offline_earnings=offline_earnings)

@app.route('/get_game_state')
def get_game_state():
    player = Player.query.first()
    return jsonify({
        'currency': max(player.currency, 100),
        'cages': player.cages,
        'habitats': player.habitats,
        'safaris': player.safaris,
        'visitors': player.visitors,
        'happiness': {
            'cage': player.cage_happiness,
            'habitat': player.habitat_happiness,
            'safari': player.safari_happiness
        }
    })

@app.route('/update_progress', methods=['POST'])
def update_progress():
    player = Player.query.first()
    data = request.json
    
    # Update attraction counts
    if 'attraction_type' in data:
        attraction_type = data['attraction_type']
        if attraction_type == 'cage':
            player.cages += 1
        elif attraction_type == 'habitat':
            player.habitats += 1
        elif attraction_type == 'safari':
            player.safaris += 1
    
    player.currency = data.get('currency', player.currency)
    db.session.commit()
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
