from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import os
from paddleocr import PaddleOCR
from io import BytesIO

app = Flask(__name__)
CORS(app)

# 读取模型路径（可选地从环境变量获取）
MODEL_DIR = os.getenv("OCR_MODEL_DIR", "/mnt/d/workspeace/node-demo/ocr_model/ch_PP-OCRv4_det_infer/")
ocr = PaddleOCR(use_angle_cls=True, lang='ch', det_model_dir=MODEL_DIR)


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
    app.run(host='0.0.0.0', port=5001, debug=True)
