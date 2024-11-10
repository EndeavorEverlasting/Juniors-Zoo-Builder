import os
from flask import Flask, render_template, jsonify, request
from datetime import datetime, timedelta
from models import db, Player, Reward, PlayerReward, SaveState
import random

app = Flask(__name__)

VERSION_HISTORY = {
    '1.0.0': {
        'date': '2024-11-10',
        'changes': [
            'Initial game implementation',
            'Basic typing mechanics',
            'Simple building placement'
        ]
    },
    '1.1.0': {
        'date': '2024-11-10',
        'changes': [
            'Fixed input handling',
            'Added proper typing feedback',
            'Implemented isometric 3D view',
            'Enhanced animal animations',
            'Improved mobile support with virtual keyboard'
        ]
    }
}

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
    # Create all tables
    db.create_all()
    
    # Create initial player if doesn't exist
    player = Player.query.first()
    if not player:
        player = Player(username="player1", currency=100)
        db.session.add(player)
        
        # Create default rewards
        rewards = [
            Reward(
                reward_type='daily',
                name='Early Bird Chest',
                description='Claim your morning reward!',
                cooldown_minutes=1440,
                min_reward=100,
                max_reward=500,
                currency_multiplier=1.2
            ),
            Reward(
                reward_type='evening',
                name='Night Owl Chest',
                description='Extra rewards for night owls',
                cooldown_minutes=1440,
                min_reward=200,
                max_reward=600,
                currency_multiplier=1.5
            ),
            Reward(
                reward_type='periodic',
                name='Free Chest',
                description='A free reward chest',
                cooldown_minutes=240,
                min_reward=50,
                max_reward=200,
                currency_multiplier=1.0
            )
        ]
        
        for reward in rewards:
            db.session.add(reward)
            player_reward = PlayerReward(
                player_id=1,
                reward_id=1,
                next_available=datetime.utcnow()
            )
            db.session.add(player_reward)
        
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
    
    # Get available rewards
    available_rewards = []
    for player_reward in PlayerReward.query.filter_by(player_id=player.id):
        reward = Reward.query.get(player_reward.reward_id)
        if datetime.utcnow() >= player_reward.next_available:
            available_rewards.append({
                'id': reward.id,
                'name': reward.name,
                'description': reward.description,
                'min_reward': reward.min_reward,
                'max_reward': reward.max_reward
            })
    
    return render_template('game.html', 
                         player=player,
                         offline_earnings=offline_earnings,
                         available_rewards=available_rewards,
                         version=list(VERSION_HISTORY.keys())[-1])

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

@app.route('/claim_reward/<int:reward_id>', methods=['POST'])
def claim_reward(reward_id):
    player = Player.query.first()
    player_reward = PlayerReward.query.filter_by(
        player_id=player.id,
        reward_id=reward_id
    ).first()
    
    if not player_reward or datetime.utcnow() < player_reward.next_available:
        return jsonify({'success': False, 'message': 'Reward not available yet'})
    
    reward = Reward.query.get(reward_id)
    reward_amount = random.randint(reward.min_reward, reward.max_reward)
    player.currency += reward_amount
    player.currency_multiplier = max(1.0, player.currency_multiplier * reward.currency_multiplier)
    
    # Set next available time
    player_reward.last_claimed = datetime.utcnow()
    player_reward.next_available = datetime.utcnow() + timedelta(minutes=reward.cooldown_minutes)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'reward_amount': reward_amount,
        'next_available': player_reward.next_available.isoformat()
    })

@app.route('/save_game', methods=['POST'])
def save_game():
    player = Player.query.first()
    data = request.json
    slot_number = data.get('slot_number', 1)
    
    save_state = SaveState.query.filter_by(
        player_id=player.id,
        slot_number=slot_number
    ).first()
    
    if not save_state:
        save_state = SaveState(
            player_id=player.id,
            slot_number=slot_number
        )
    
    save_state.save_name = data.get('save_name', f'Save {slot_number}')
    save_state.save_data = {
        'currency': player.currency,
        'cages': player.cages,
        'habitats': player.habitats,
        'safaris': player.safaris,
        'happiness': {
            'cage': player.cage_happiness,
            'habitat': player.habitat_happiness,
            'safari': player.safari_happiness
        }
    }
    save_state.preview_stats = {
        'total_attractions': player.cages + player.habitats + player.safaris,
        'visitors': player.visitors,
        'total_happiness': (player.cage_happiness + player.habitat_happiness + player.safari_happiness) / 3
    }
    
    db.session.add(save_state)
    db.session.commit()
    
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
