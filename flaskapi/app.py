from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from uuid import uuid4
from flask_cors import CORS

import requests
import json

import numpy as np
import cv2
import os
from paddleocr import PaddleOCR
from io import BytesIO

app = Flask(__name__)
# app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'
# db = SQLAlchemy(app)
#app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:sspu106106@localhost:3306/chat_db?charset=utf8mb4'
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://remote_user:StrongPass123%21@10.100.1.122:3306/chat_db?charset=utf8mb4'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # 关闭警告
db = SQLAlchemy(app)
CORS(app)  # 启用跨域支持

# 用户模型
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    relname = db.Column(db.String(100), nullable=False)  # 新增真实姓名字段

# 新增对话字段
# 对话元数据模型
class Chat(db.Model):
    __tablename__ = 'chats'
    id = db.Column(db.Integer, primary_key=True)
    # user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user_id = db.Column(db.String(80), db.ForeignKey('user.username'), nullable=False)  # 改成外键指向 username
    chat_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid4()))   # 前端生成的ID
    title = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# 用户id使用学号
# 对话记录模型

class ChatRecord(db.Model):
    __tablename__ = 'chat_record'
    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.String(36), db.ForeignKey('chats.chat_id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(80), db.ForeignKey('user.username'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    sender = db.Column(db.String(10), nullable=False)  # 'user' or 'ai'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# 注册接口
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    relname = data.get('relname')
    if not username or not password or not relname:
        return jsonify({'success': False, 'message': '缺少必填字段'}), 400
    # 检查用户名是否已存在
    if User.query.filter_by(username=username).first():
        return jsonify({'success': False, 'message': '用户名已存在'}), 400

    password_hash = generate_password_hash(password)
    new_user = User(username=username, password_hash=password_hash, relname=relname)

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
        return jsonify({'success': True, 'user_id': user.username})
    return jsonify({'success': False, 'message': '用户名或密码错误'}), 400




# 新增创建、删除对话接口
# 创建对话接口

# 使用uuid代替chatid

# @app.route('/api/create_chat', methods=['POST'])
# def create_chat():
#     # 获取请求数据
#     data = request.json
#     user_id = data.get('user_id')
#     title = data.get('title')

#     # 参数校验：确保 user_id 和 title 都存在
#     if not (user_id and title):
#         return jsonify({
#             'success': False,
#             'message': '必须提供 user_id 和 title'
#         }), 400

#     # 查询用户是否存在
#     user = User.query.filter_by(username=user_id).first()
#     if not user:
#         return jsonify({
#             'success': False,
#             'message': '用户不存在'
#         }), 404

#     # 确保 user_id 是整数类型（从查询结果中获取真实的 user.id）
#     user_id = user.id

#     # 创建对话记录
#     # chat = Chat(
#     #     user_id=user_id,  # 使用用户的主键 id
#     #     title=title
#     # )
#     chat = Chat(user_id=user.username, title=title)  # ✅ 用 username

#     db.session.add(chat)
#     try:
#         db.session.commit()  # 提交事务
#     except Exception as e:
#         db.session.rollback()  # 发生错误时回滚
#         return jsonify({
#             'success': False,
#             'message': '创建对话失败',
#             'error': str(e)
#         }), 500

#     # 返回成功响应
#     return jsonify({
#         'success': True,
#         'chat_id': chat.chat_id,
#         'message': '对话创建成功'
#     }), 201
@app.route('/api/create_chat', methods=['POST'])
def create_chat():
    data = request.json
    user_id = data.get('user_id')
    title = data.get('title')

    print(f"[DEBUG] 收到请求 user_id={user_id}, title={title}")

    user = User.query.filter_by(username=user_id).first()
    if not user:
        print(f"[DEBUG] 用户 {user_id} 不存在")
        return jsonify({'success': False, 'message': '用户不存在'}), 404

    print(f"[DEBUG] 找到用户: {user.username}")

    chat = Chat(user_id=user.username, title=title)
    db.session.add(chat)

    try:
        db.session.commit()
        print(f"[DEBUG] 创建对话成功: {chat.chat_id}")
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] 创建对话失败: {e}")
        return jsonify({'success': False, 'message': '创建对话失败', 'error': str(e)}), 500

    return jsonify({'success': True, 'chat_id': chat.chat_id, 'message': '对话创建成功'}), 201


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
    # user = User.query.get(user_id)
    #修改
    user = User.query.filter_by(username=user_id).first()

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

# 新增更新对话标题接口
@app.route('/api/update_chat_title', methods=['POST'])
def update_chat_title():
    data = request.json
    user_id = data.get('user_id')
    chat_id = data.get('chat_id')
    title = data.get('title')

    if not all([user_id, chat_id, title]):
        return jsonify({'success': False, 'message': '缺少必要参数'}), 400

    chat = Chat.query.filter_by(chat_id=chat_id, user_id=user_id).first()
    if not chat:
        return jsonify({'success': False, 'message': '对话不存在或不属于当前用户'}), 404

    chat.title = title
    db.session.commit()
    return jsonify({'success': True, 'message': '标题更新成功'})


# 修改后的存储对话
@app.route('/api/save_chat', methods=['POST'])
def save_chat():
    data = request.json
    user_id = data.get('user_id')
    chat_id = data.get('chat_id')
    message = data.get('message')
    sender = data.get('sender') # 'user' or 'ai'

    # 参数校验
    if not all([user_id, chat_id, message, sender]):
        return jsonify({
            'success': False,
            'message': '必须提供 user_id, chat_id, message, 和 sender'
        }), 400
    
    if sender not in ['user', 'ai']:
        return jsonify({'success': False, 'message': 'sender 字段必须是 "user" 或 "ai"'}), 400

    # 用户存在性校验
    # user = User.query.get(user_id)
    user = User.query.filter_by(username=user_id).first()

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
        message=message,
        sender=sender
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
    # user = User.query.get(user_id)
    user = User.query.filter_by(username=user_id).first()

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
    # chat_records = [{
    #     'message': msg.message,
    #     'timestamp': msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    # } for msg in messages]
    
    messages_data = [{
        'id': msg.id,
        'user_id': msg.user_id,
        'content': msg.message,
        'sender': msg.sender,
        'timestamp': msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
    } for msg in messages]

    return jsonify({
        'success': True,
        'chat_id': chat_id,
        'messages': messages_data
    })

#获取对话列表
# 获取用户所有对话列表（/api/get_chats）
# @app.route('/api/get_chats', methods=['GET'])
# def get_chats():
#     user_id = request.args.get('user_id')
#     user = User.query.get(user_id)
#     if not user:
#         return jsonify({'success': False, 'message': '用户不存在'}), 404

#     chats = Chat.query.filter_by(user_id=user_id).order_by(Chat.created_at.desc()).all()
#     chat_list = [{
#         'chat_id': chat.chat_id,
#         'title': chat.title,
#         'created_at': chat.created_at.isoformat()
#     } for chat in chats]

#     return jsonify({'success': True, 'chats': chat_list})
@app.route('/api/get_chats', methods=['GET'])
def get_chats():
    user_id = request.args.get('user_id')  # 这里是 username（学号）
    
    user = User.query.filter_by(username=user_id).first()  # ✅ 改为根据 username 查询
    if not user:
        return jsonify({'success': False, 'message': '用户不存在'}), 404

    chats = Chat.query.filter_by(user_id=user.username).order_by(Chat.created_at.desc()).all()  # ✅ 这里也要用 username
    chat_list = [{
        'chat_id': chat.chat_id,
        'title': chat.title,
        'created_at': chat.created_at.isoformat()
    } for chat in chats]

    return jsonify({'success': True, 'chats': chat_list})

# 通过前端传递的用户ID获取真实姓名
@app.route('/api/users/verify', methods=['POST'])
def verify_user():
    data = request.get_json()
    user_id = data.get("user_id")
    real_name = data.get("real_name")

    if not user_id and not real_name:
        return jsonify({"status": "fail", "message": "No credentials provided"}), 400

    # 查找是否有匹配的用户
    user = User.query.filter(
        (User.username == user_id) | (User.relname == real_name)
    ).first()

    if user:
        return jsonify({
            "status": "success",
            "user": {
                "username": user.username,
                "relname": user.relname
            }
        })
    else:
        return jsonify({"status": "fail", "message": "No matching user found"}), 404

# 建议模块
HISTORY_FILE = "data/history.json"

def load_history():
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

@app.route("/api/suggestions")
def get_suggestions():
    query = request.args.get("q", "").strip().lower()
    history = load_history()

    suggestions = []

    # 基于历史问题的简单前缀匹配
    for q in history:
        if query and query in q.lower():
            suggestions.append(q)

    # 如果不足，则调用大模型生成
    if len(suggestions) < 5 and query:
        generated = call_llm_generate(query)
        print(f"[大模型生成] 基于关键词 '{query}'，生成的问题：{generated}")  # ✅ 打印日志
        suggestions += generated

    # 去重并最多返回10条
    suggestions = list(dict.fromkeys(suggestions))[:10]

    print(f"[最终返回] query='{query}'，建议内容：{suggestions}")  # ✅ 打印日志
    return jsonify({"suggestions": suggestions})


def call_llm_generate(keyword):
    try:
        response = requests.post(
            "https://106d9.pluscdn.eu.org/api/v1/workspace/qwen/chat",
            headers={
                "Accept": "application/json",
                "Authorization": "Bearer XXK505Z-6ZQMY6E-JQK42BF-W9GJF69",
                "Content-Type": "application/json"
            },
            json={
                "message": f"请基于关键词 '{keyword}' 生成5个相关用户可能会问的问题，简短清晰列出。问题格式要求简短严肃书面化，不要口语化",
                "mode": "chat"
            }
        )

        print("[响应状态码]", response.status_code)
        print("[响应文本]", response.text)

        data = response.json()
        text = data.get("textResponse", "")
        print("[大模型原始响应]", data)

        # 拆分问题列表（兼容中英文数字编号）
        lines = text.strip().split("\n")
        questions = [line.strip().lstrip("1234567890.．-、 ").strip() for line in lines if line.strip()]
        print(f"[大模型生成] 基于关键词 '{keyword}'，生成的问题：{questions}")
        return questions
    except Exception as e:
        print(f"[错误] 调用大模型失败：{e}")
        return []
    

    # ocr文字识别功能
# 读取模型路径（可选地从环境变量获取）
# MODEL_DIR = os.getenv("OCR_MODEL_DIR", "/mnt/d/workspeace/node-demo/ocr_model/ch_PP-OCRv4_det_infer/")
# ocr = PaddleOCR(use_angle_cls=True, lang='ch', det_model_dir=MODEL_DIR)
ocr = PaddleOCR(use_angle_cls=True, lang='ch')

def read_image_from_bytes(img_bytes):
    """ 将字节流转换为 OpenCV 图像 """
    img_array = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    return img


@app.route('/ocr', methods=['POST'])
def ocr_image():
    file = request.files.get('image')
    if not file:
        return jsonify({'error': 'No image uploaded', 'status': 'failure'}), 400

    try:
        img_bytes = file.read()
        img = read_image_from_bytes(img_bytes)
        if img is None:
            return jsonify({'error': 'Invalid image format', 'status': 'failure'}), 400

        result = ocr.ocr(img, cls=True)

        extracted_text = [line[1][0] for line in result[0]] if result and result[0] else []

        return jsonify({
            'text': extracted_text,
            'status': 'success'
        })

    except Exception as e:
        return jsonify({'error': str(e), 'status': 'failure'}), 500



if __name__ == '__main__':
    with app.app_context():
        print("Dropping all database tables...")
        db.drop_all()
        print("Tables dropped.")
        print("Creating all database tables...")
        db.create_all()
        print("Database tables created!")
    app.run(host='0.0.0.0', debug=True)
