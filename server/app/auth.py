from flask import Blueprint,Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from uuid import uuid4
from flask_cors import CORS

auth_bp = Blueprint('auth', __name__)

# app = Flask(__name__)
# # app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'
# # db = SQLAlchemy(app)
# app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:sspu106106@localhost:3306/chat_db?charset=utf8mb4'
# app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # 关闭警告
# db = SQLAlchemy(app)
# CORS(app)  # 启用跨域支持


# 用户模型
# class User(db.Model):
#     id = db.Column(db.Integer, primary_key=True)
#     username = db.Column(db.String(80), unique=True, nullable=False)
#     password_hash = db.Column(db.String(200), nullable=False)

# # 新增对话字段
# # 对话元数据模型
# class Chat(db.Model):
#     __tablename__ = 'chats'
#     id = db.Column(db.Integer, primary_key=True)
#     user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     chat_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid4()))   # 前端生成的ID
#     title = db.Column(db.String(100), nullable=False)
#     created_at = db.Column(db.DateTime, default=datetime.utcnow)

# # 用户id使用学号
# # 对话记录模型

# class ChatRecord(db.Model):
#     __tablename__ = 'chat_record'
#     id = db.Column(db.Integer, primary_key=True)
#     chat_id = db.Column(db.String(36), db.ForeignKey('chats.chat_id', ondelete='CASCADE'), nullable=False)
#     user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
#     message = db.Column(db.Text, nullable=False)
#     timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# 注册接口
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    # 检查用户名是否已存在
    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': '用户名已存在'}), 400

    password_hash = generate_password_hash(password)
    new_user = User(username=username, password_hash=password_hash)

    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'success': True, 'message': '注册成功'})
    except Exception as e:
        db.session.rollback()  # 发生错误时回滚事务
        return jsonify({'success': False, 'message': '注册失败', 'error': str(e)}), 500


# 登录接口
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        return jsonify({'success': True, 'user_id': user.id})
    return jsonify({'success': False, 'message': '用户名或密码错误'}), 400


# 创建对话接口（改进版）
@app.route('/api/create_chat', methods=['POST'])
def create_chat():
    data = request.json
    user_id = data.get('user_id')
    title = data.get('title')

    # 使用 Session.get() 替代 User.query.get()
    user = db.session.get(User, user_id)  # 关键修改点
    # 参数校验
    if not (user_id and title):
        return jsonify({
            'success': False,
            'message': '必须提供 user_id 和 title'
        }), 400

    # 用户存在性校验
    # user = User.query.get(user_id)
    if not user:
        return jsonify({
            'success': False,
            'message': '用户不存在'
        }), 404

    # 自动生成唯一 chat_id（使用UUID）
    chat = Chat(
        user_id=user_id,
        title=title
    )
    db.session.add(chat)
    db.session.commit()  # 提交获取生成的 chat_id

    return jsonify({
        'success': True,
        'chat_id': chat.chat_id,
        'message': '对话创建成功'
    }), 201

#新增 发送消息接口
@app.route('/api/send_message', methods=['POST'])
def send_message():
    data = request.json
    user_id = data.get('user_id')
    chat_id = data.get('chat_id')
    message_content = data.get('message')
    
    # 校验参数
    if not (user_id and chat_id and message_content):
        return jsonify({'success': False, 'message': '参数缺失'}), 400

    # 校验对话存在性
    chat = Chat.query.filter_by(chat_id=chat_id).first()
    if not chat:
        return jsonify({'success': False, 'message': '对话不存在'}), 404

    # 创建消息记录
    new_message = ChatRecord(
        chat_id=chat_id,
        user_id=user_id,
        message=message_content
    )
    db.session.add(new_message)
    db.session.commit()

    return jsonify({
        'success': True,
        'message_id': new_message.id,
        'message': '消息发送成功'
    }), 201

# 删除对话接口
@app.route('/api/delete_chat', methods=['DELETE'])
def delete_chat():
    user_id = request.args.get('user_id')
    chat_id = request.args.get('chat_id')

    if not (user_id and chat_id):
        return jsonify({
            'success': False,
            'message': '必须提供 user_id 和 chat_id'
        }), 400

    # 用户存在性校验
    user = User.query.get(user_id)
    if not user:
        return jsonify({
            'success': False,
            'message': '用户不存在'
        }), 404

    # 获取目标对话
    chat = Chat.query.filter_by(
        user_id=user_id,
        chat_id=chat_id
    ).first()

    if not chat:
        return jsonify({
            'success': False,
            'message': '对话不存在'
        }), 404

    # 删除关联的消息记录
    ChatRecord.query.filter_by(chat_id=chat_id).delete()
    
    # 删除对话元数据
    db.session.delete(chat)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': '对话删除成功'
    })

# 存储对话记录

# 修改后的存储对话
@app.route('/api/save_chat', methods=['POST'])
def save_chat():
    data = request.json
    user_id = data.get('user_id')
    chat_id = data.get('chat_id')  # 新增参数
    message = data.get('message')

    # 参数校验
    if not (user_id and chat_id and message):
        return jsonify({
            'success': False,
            'message': '必须提供 user_id/chat_id/message'
        }), 400

    # 用户存在性校验
    user = User.query.get(user_id)
    if not user:
        return jsonify({
            'success': False,
            'message': '用户不存在'
        }), 404

    # 验证对话是否存在且属于当前用户
    chat = Chat.query.filter_by(
        user_id=user_id,
        chat_id=chat_id
    ).first()
    if not chat:
        return jsonify({
            'success': False,
            'message': '对话不存在或不属于当前用户'
        }), 404

    # 创建新消息记录
    new_chat_record = ChatRecord(
        chat_id=chat_id,
        user_id=user_id,
        message=message
    )
    db.session.add(new_chat_record)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': '消息已保存',
        'timestamp': new_chat_record.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    })

# 获取对话记录

# 新的获取对话接口
@app.route('/api/get_chat', methods=['GET'])
def get_chat():
    user_id = request.args.get('user_id')
    chat_id = request.args.get('chat_id')  # 新增参数

    # 验证用户存在性
    user = User.query.get(user_id)
    # user = db.session.get(User, user_id)
    if not user:
        return jsonify({'success': False, 'message': '用户不存在'}), 404

    # 验证对话存在性
    chat = Chat.query.filter_by(
        user_id=user_id,
        chat_id=chat_id
    ).first()
    if not chat:
        return jsonify({'success': False, 'message': '对话不存在'}), 404

    # 获取该对话的所有消息记录
    messages = ChatRecord.query.filter_by(chat_id=chat_id).order_by(ChatRecord.timestamp).all()

    
    messages_data = [{
        'id': msg.id,
        'user_id': msg.user_id,
        'content': msg.message,
        'timestamp': msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    } for msg in messages]    

    return jsonify({
        'success': True,
        'chat_id': chat_id,
        'messages': messages_data
    })

#获取对话列表
# 获取用户所有对话列表（/api/get_chats）
@app.route('/api/get_chats', methods=['GET'])
def get_chats():
    user_id = request.args.get('user_id')
    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': '用户不存在'}), 404

    chats = Chat.query.filter_by(user_id=user_id).order_by(Chat.created_at.desc()).all()
    chat_list = [{
        'chat_id': chat.chat_id,
        'title': chat.title,
        'created_at': chat.created_at.isoformat()
    } for chat in chats]

    return jsonify({'success': True, 'chats': chat_list})

if __name__ == '__main__':
    # with app.app_context():
    #     db.create_all()  # 创建数据库表
    with app.app_context():
        print("Creating database...")
        db.create_all()
        print("Database created!")    
    app.run(debug=True)
