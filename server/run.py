from app import create_app
from app.models import db

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        print("Creating database...")
        db.create_all()  # 创建数据库表
        print("Database created!")
    app.run(debug=True)