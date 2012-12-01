#!/usr/bin/python
# -*- coding: utf-8 -*-

from flask import Flask
from flask import request
from flask import render_template
from flask import abort
import json
import os

# import ipdb; ipdb.set_trace()

app = Flask(__name__)

@app.route("/hello")
def _hello():
    """sample sever"""
    return "Hello World"


@app.route("/")
def index():
    return render_template("index.html")

"""
@app.errorhandler(500)
def internal_server_error(e):
    return render_template("500.html"), 500
"""

"""
画像サイズは固定しないといけない。
一先ず800pxで固定する

画像をあらかじめ作るので、
start pointと倍率を決めること

start 101
layer 100
end 200
"""
@app.route("/get_image/", methods=["GET"])
def get_image():
    """
    getのパラメータ
    start, layer

    クライアントの必要なデータをレスポンスする
    """
    #import ipdb; ipdb.set_trace()
    try:
        start =int(request.args.get("start"))
        layer = int(request.args.get("layer"))
    except:
        return "error"

    stop = start + layer - 1
    image_path = "/static/images/sample/{layer}/sample_{start}_{stop}_800.png"
    image_path = image_path.format(start=start,stop=stop,layer=layer)
    if not _exists(image_path):
        abort(500)

    data = {
        "image_path": image_path,
        "start": start,
        }

    return json.dumps(data)

def _exists(path):
    #import ipdb; ipdb.set_trace()
    #相対パスに書き換える
    path = path[1:]
    root = os.getcwd()
    join = os.path.join(root, path)
    print(join)
    return os.path.exists(join)

if __name__ == "__main__":
    app.debug = True
    app.run(host="0.0.0.0")
