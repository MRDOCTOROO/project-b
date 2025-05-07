class Config:
    # SECRET_KEY = 'your_secret_key'
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:sspu106106@localhost:3306/chat_db?charset=utf8mb4'
    SQLALCHEMY_TRACK_MODIFICATIONS = False  # 关闭警告
    DEBUG = True