#!/usr/bin/python
# -*- coding: utf-8 -*-

from flask import Flask
from flask import request
from flask import render_template
from flask import abort
import json
import os

app = Flask(__name__)

CONF = {
    "images" : "static/images"
}

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/get_imagepath", methods=["GET"])
def get_image():
    """
    クライアントから、どのデータが読み込めるか
    一度だけリクエストします。
    """
    dirs = os.listdir(CONF["images"])
    data = {
        "path": dirs,
        }
    return json.dumps(data)


if __name__ == "__main__":
    app.debug = True
    app.run()
