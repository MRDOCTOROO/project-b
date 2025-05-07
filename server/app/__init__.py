from flask import Flask
from .auth import auth_bp
from .model_service import model_bp
from .external_api import external_api_bp
from config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    CORS(app)
    # 注册蓝图
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(model_bp, url_prefix='/model')
    app.register_blueprint(external_api_bp, url_prefix='/external')

    return app