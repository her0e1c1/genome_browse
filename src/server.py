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
    #サーバー上のルートを基準に考えます。
    "images" : "static/images",
    #imagesパスにある無視するファイル/ディレクトリです。
    "ignore" : [".gitignore", "browser"]
}

@app.route("/")
def index():
    return render_template("index.html")


"""
一番はじめのアクセスでajax通信させます。
その際に、サーバーのデータ情報をクライアントに渡します。

path["thaliana"]["chr1"]["Ahal_read"]を評価すると
"/thaliana/chr1/ahal/"というパスを返します。

他の余分なファイルが混ざらないように、チェックをきちんと行います。
"""


def get_path(root,number):
    """
    再帰的にパスを取り出します。
    探査するディレクトリとそこからの深さを指定します。
    """
    pre_dir = os.getcwd()
    os.chdir(root)
    if not root.startswith("/"):
        root = os.getcwd()
    #import ipdb; ipdb.set_trace()
    def g(dir):
        l = len(root)
        if dir.startswith(root):
            return dir[l+1:]
        else:
            return dir

    def _(ret ,num):
        if(num == 0):
            return g(os.getcwd())
        dirs = os.listdir("./")
        dirs = [d for d in dirs if os.path.isdir(d)]
        for dir in dirs:
            os.chdir(dir)
            ret[dir] = _({}, num-1)
            os.chdir("..")
        return ret

    r =  _({}, number)
    os.chdir(pre_dir)
    return r


@app.route("/get_imagepath", methods=["GET"])
def get_image():
    """
    クライアントから、どのデータが読み込めるか
    一度だけリクエストします。
    """

    path = get_path(CONF["images"], 3)
    for i in CONF["ignore"]:
        if i in path:
            del path[i]

    #datasource
    ds = path.keys()

    #seq_id
    seq_ids = {}
    for d in ds:
        seq_ids[d] = path[d].keys()

    #tracks
    tracks = {}
    for d, ids in seq_ids.items():
        tracks[d] = {}
        for id in ids:
            tracks[d][id] = path[d][id].keys()

    data = {
        "datasources": ds,
        "seq_ids": seq_ids,
        "tracks": tracks,
        "path": path
        }
    print(data)
    return json.dumps(data)


if __name__ == "__main__":
    app.debug = True
    app.run()
