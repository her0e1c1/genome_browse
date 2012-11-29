#!/usr/bin/python
# -*- coding: utf-8 -*-

from flask import Flask
from flask import request
from flask import render_template

# import ipdb; ipdb.set_trace()

app = Flask(__name__)

@app.route("/hello")
def _hello():
    """sample sever"""
    return "Hello World"


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/get_image/", methods=["GET"])
def get_image():
    """
    getのパラメータ
    start, stop
    
    クライアントの必要なデータをレスポンスする
    """

    try:
        start = request.args.get("start")
        stop = request.args.get("stop")
    except:
        pass
    

if __name__ == "__main__":
    app.debug = True
    app.run(host="0.0.0.0")
