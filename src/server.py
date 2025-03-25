from flask import Flask, send_from_directory, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import logging
import json
import os
import random
import string

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder=None, static_url_path=None)
app.config['SECRET_KEY'] = 'voltarr'

# Configure CORS to allow any origin
logger.debug("Configuring CORS settings...")
CORS(app, resources={r"/*": {"origins": "*"}})
logger.info("CORS configured successfully")

# Initialize SocketIO with CORS allowed origins set to "*" to allow all origins
logger.debug("Initializing SocketIO...")
socketio = SocketIO(app,
                    async_mode='threading',
                    cors_allowed_origins="*")  # This will allow any origin
logger.info("SocketIO initialized with threading mode")

# Data structure to handle users
users = {}  # key: sid, value: user_data

# Get the public directory path
public_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'deploy', 'dist'))

@app.route('/')
def index():
    logger.debug("Serving index page")
    return send_from_directory(public_dir, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(public_dir, path)

def generate_lobby_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

def find_or_create_lobby(game_id, level_id, min_players=1, max_players=4):
    # Find a lobby that is not full and game not started with matching game_id and level_id
    existing_lobby_ids = set(user['lobby_id'] for user in users.values() if user['lobby_id'])
    for lobby_id in existing_lobby_ids:
        lobby_users = [u for u in users.values() if u['lobby_id'] == lobby_id]
        if not lobby_users:
            continue
        first_user = lobby_users[0]
        # Match if both have same game_id/level_id or both are None
        if ((first_user.get('game_id') == game_id or (first_user.get('game_id') is None and game_id is None)) and 
            (first_user.get('level_id') == level_id or (first_user.get('level_id') is None and level_id is None)) and 
            not any(u['game_started'] for u in lobby_users) and 
            len(lobby_users) < max_players):
            return lobby_id
    # Create a new lobby
    lobby_id = generate_lobby_id()
    logger.info(f"Created new lobby with ID: {lobby_id}")
    return lobby_id

def get_lobby_users(lobby_id):
    return [u for u in users.values() if u['lobby_id'] == lobby_id]

def get_lobby_host_sid(lobby_id):
    lobby_users = get_lobby_users(lobby_id)
    for user in lobby_users:
        if user.get('is_host'):
            return user['sid']
    return None

@socketio.on('connect')
def handle_connect():
    user_sid = request.sid
    logger.info(f"New user connected. SID: {user_sid}")
    # We don't assign the user to a lobby yet
    users[user_sid] = {
        'sid': user_sid,
        'name': 'Player',
        'lobby_id': None,
        'is_host': False,
        'game_started': False,
        'game_id': None,
        'level_id': None
    }
    logger.debug(f"Current users in system: {json.dumps(users, indent=2)}")
    # Wait for the user to join a lobby via 'join_lobby' event

@socketio.on('join_lobby')
def handle_join_lobby(data):
    user_sid = request.sid
    lobby_id = data.get('lobby_id')
    player_name = data.get('player_name', 'Player')
    game_id = data.get('game_id')
    level_id = data.get('level_id')
    min_players = data.get('min_players', 1)
    max_players = data.get('max_players', 4)
    logger.info(f"User {user_sid} attempting to join lobby {lobby_id}")

    # Update player name and game/level IDs
    users[user_sid]['name'] = player_name
    users[user_sid]['game_id'] = game_id
    users[user_sid]['level_id'] = level_id

    # If the user is already in a lobby, remove them from that lobby
    if user_sid in users:
        current_lobby_id = users[user_sid].get('lobby_id')
        if current_lobby_id:
            # Remove user from current lobby
            leave_room(current_lobby_id)
            users[user_sid]['lobby_id'] = None
            users[user_sid]['is_host'] = False
            users[user_sid]['game_started'] = False
            logger.debug(f"User {user_sid} left lobby {current_lobby_id}")
            # Reassign host if necessary
            lobby_users = get_lobby_users(current_lobby_id)
            if not lobby_users:
                logger.info(f"Lobby {current_lobby_id} has been removed as it is empty")
            else:
                if user_sid == get_lobby_host_sid(current_lobby_id):
                    new_host_sid = lobby_users[0]['sid']
                    users[new_host_sid]['is_host'] = True
                    logger.info(f"User {new_host_sid} is now the host of lobby {current_lobby_id}")

                # Send the updated user list to all users in the current lobby
                emit('game_event', {
                    'type': 'player_list_changed',
                    'data': {
                        'users': {u['sid']: u for u in lobby_users},
                        'host_id': get_lobby_host_sid(current_lobby_id),
                        'lobby_id': current_lobby_id
                    }
                }, room=current_lobby_id)
                logger.debug(f"Broadcasted player_list_changed event in lobby {current_lobby_id} due to user {user_sid} leaving")

    # If lobby_id is provided, attempt to join that lobby
    if lobby_id:
        lobby_users = get_lobby_users(lobby_id)
        if lobby_users:
            first_user = lobby_users[0]
            # Check compatibility - allow if both have same values or both are None
            if not ((first_user.get('game_id') == game_id or (first_user.get('game_id') is None and game_id is None)) and 
                   (first_user.get('level_id') == level_id or (first_user.get('level_id') is None and level_id is None))):
                emit('join_lobby_failed', {'error': 'Incompatible game or level.'})
                logger.info(f"User {user_sid} failed to join lobby {lobby_id} - incompatible game/level")
                return
            game_started = any(u['game_started'] for u in lobby_users)
            if game_started:
                emit('join_lobby_failed', {'error': 'Game has already started in this lobby.'})
                logger.info(f"User {user_sid} failed to join lobby {lobby_id} - game already started")
                return
            if len(lobby_users) >= max_players:
                emit('join_lobby_failed', {'error': 'Lobby is full.'})
                logger.info(f"User {user_sid} failed to join lobby {lobby_id} - lobby is full")
                return
        else:
            emit('join_lobby_failed', {'error': 'Lobby does not exist.'})
            logger.info(f"User {user_sid} failed to join lobby {lobby_id} - lobby does not exist")
            return
    else:
        # No lobby_id provided, find or create a lobby
        lobby_id = find_or_create_lobby(game_id, level_id, min_players, max_players)

    # Update user data
    users[user_sid]['lobby_id'] = lobby_id

    # Assign host if no host is assigned
    lobby_users = get_lobby_users(lobby_id)
    if not any(u['is_host'] for u in lobby_users):
        users[user_sid]['is_host'] = True
        logger.info(f"User {user_sid} is assigned as the host of lobby {lobby_id}")
    else:
        users[user_sid]['is_host'] = False

    join_room(lobby_id)
    logger.info(f"User {user_sid} joined lobby {lobby_id}")

    # Send the updated user list to all users in the lobby
    lobby_users = get_lobby_users(lobby_id)
    emit('game_event', {
        'type': 'player_list_changed',
        'data': {
            'users': {u['sid']: u for u in lobby_users},
            'host_id': get_lobby_host_sid(lobby_id),
            'lobby_id': lobby_id
        }
    }, room=lobby_id)
    logger.debug(f"Broadcasted player_list_changed event in lobby {lobby_id} due to user {user_sid} joining")

    # Inform the user that they have successfully joined the lobby
    emit('join_lobby_success', {'lobby_id': lobby_id})

@socketio.on('leave_lobby')
def handle_leave_lobby(data):
    user_sid = request.sid
    lobby_id = data.get('lobby_id')
    logger.info(f"User {user_sid} attempting to leave lobby {lobby_id}")

    if user_sid in users:
        current_lobby_id = users[user_sid].get('lobby_id')
        if current_lobby_id == lobby_id:
            # Remove user from lobby
            leave_room(lobby_id)
            users[user_sid]['lobby_id'] = None
            users[user_sid]['is_host'] = False
            users[user_sid]['game_started'] = False
            logger.debug(f"User {user_sid} left lobby {lobby_id}")

            # Reassign host if necessary
            lobby_users = get_lobby_users(lobby_id)
            if not lobby_users:
                logger.info(f"Lobby {lobby_id} has been removed as it is empty")
            else:
                if user_sid == get_lobby_host_sid(lobby_id):
                    new_host_sid = lobby_users[0]['sid']
                    users[new_host_sid]['is_host'] = True
                    logger.info(f"User {new_host_sid} is now the host of lobby {lobby_id}")

                # Send the updated user list to all users in the lobby
                emit('game_event', {
                    'type': 'player_list_changed',
                    'data': {
                        'users': {u['sid']: u for u in lobby_users},
                        'host_id': get_lobby_host_sid(lobby_id),
                        'lobby_id': lobby_id
                    }
                }, room=lobby_id)
                logger.debug(f"Broadcasted player_list_changed event in lobby {lobby_id} due to user {user_sid} leaving")
        else:
            logger.warning(f"User {user_sid} attempted to leave lobby {lobby_id} but was not in it")
    else:
        logger.warning(f"User {user_sid} attempted to leave lobby {lobby_id} but was not found")

@socketio.on('disconnect')
def handle_disconnect():
    user_sid = request.sid
    logger.info(f"User disconnecting. SID: {user_sid}")

    if user_sid in users:
        user = users[user_sid]
        lobby_id = user.get('lobby_id')
        if lobby_id:
            # Remove user from lobby
            leave_room(lobby_id)
            logger.debug(f"User {user_sid} removed from lobby {lobby_id}")
            # Reassign host if necessary
            lobby_users = get_lobby_users(lobby_id)
            if not lobby_users:
                logger.info(f"Lobby {lobby_id} has been removed as it is empty")
            else:
                if user_sid == get_lobby_host_sid(lobby_id):
                    new_host_sid = lobby_users[0]['sid']
                    users[new_host_sid]['is_host'] = True
                    logger.info(f"User {new_host_sid} is now the host of lobby {lobby_id}")

                # Send the updated user list to all users in the lobby
                emit('game_event', {
                    'type': 'player_list_changed',
                    'data': {
                        'users': {u['sid']: u for u in lobby_users},
                        'host_id': get_lobby_host_sid(lobby_id),
                        'lobby_id': lobby_id
                    }
                }, room=lobby_id)
                logger.debug(f"Broadcasted player_list_changed event in lobby {lobby_id} due to user {user_sid} disconnecting")
        # Remove the user from users
        users.pop(user_sid)
        logger.debug(f"Removed user {user_sid} from users dict")
    else:
        logger.warning(f"Attempted to disconnect unknown user with SID: {user_sid}")

@socketio.on('game_event')
def handle_game_event(data):
    user_sid = request.sid
    user = users.get(user_sid)
    if not user or not user.get('lobby_id'):
        logger.warning(f"Received game_event from user {user_sid} who is not in a lobby")
        return
    lobby_id = user['lobby_id']
    # logger.debug(f"Received game_event from user {user_sid} in lobby {lobby_id}: {json.dumps(data, indent=2)}")

    event_type = data.get('type')
    event_data = data.get('data', {})

    # Special handling for start_game event
    if event_type == 'start_game':
        if user.get('is_host'):
            # Only the host can start the game
            # Update game_started status for all users in the lobby
            lobby_users = get_lobby_users(lobby_id)
            for u in lobby_users:
                u['game_started'] = True
            emit('game_event', {
                'type': 'game_started',
                'data': {}
            }, room=lobby_id)
            logger.debug(f"Broadcasted game_started event in lobby {lobby_id}")
        else:
            logger.warning(f"User {user_sid} attempted to start game but is not host in lobby {lobby_id}")
        return

    # Special handling for game_ended event
    if event_type == 'game_ended':
        lobby_users = get_lobby_users(lobby_id)
        for u in lobby_users:
            u['game_started'] = False
        logger.debug(f"Game ended in lobby {lobby_id}")
        return

    # Handle update_user_data event
    if event_type == 'update_user_data':
        users[user_sid].update(event_data)
        # Broadcast updated user list
        lobby_users = get_lobby_users(lobby_id)
        emit('game_event', {
            'type': 'player_list_changed',
            'data': {
                'users': {u['sid']: u for u in lobby_users},
                'host_id': get_lobby_host_sid(lobby_id),
                'lobby_id': lobby_id
            }
        }, room=lobby_id)
        return

    # Get the lobby users
    lobby_users = get_lobby_users(lobby_id)
    if not lobby_users:
        return

    # Create the event payload
    event_payload = {
        'type': event_type,
        'data': {
            'user_id': user_sid,
            **event_data
        }
    }

    host_sid = get_lobby_host_sid(lobby_id)

    # If sender is host, broadcast to everyone in lobby except the host
    if user_sid == host_sid:
        emit('game_event', event_payload, room=lobby_id, skip_sid=user_sid)
    else:
        # If sender is not host, only send to the host
        emit('game_event', event_payload, room=host_sid)


if __name__ == '__main__':
    logger.info("Starting Flask-SocketIO server...")
    logger.debug("Server configuration: HOST=0.0.0.0, PORT=5001, DEBUG=True")
    socketio.run(app, "0.0.0.0", port=5001, debug=True, allow_unsafe_werkzeug=True)
