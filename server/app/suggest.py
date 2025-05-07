from flask import Flask, request, jsonify
import requests
import json

app = Flask(__name__)

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


if __name__ == '__main__':
    app.run(debug=True, port=5002)
