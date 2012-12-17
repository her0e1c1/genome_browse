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

@app.route("/get_imagepath", methods=["GET"])
def get_image():
    """
    クライアントから、どのデータが読み込めるか
    一度だけリクエストします。
    """
    #path
    r_path = {}
    #tracks
    r_tracks = {}
    #seq_id
    r_seq_id = {}
    #datasource
    r_ds = os.listdir(CONF["images"])
    
    for i in CONF["ignore"]:
        if i in r_ds:
            r_ds.remove(i)

    #pythonの木構造は読みにくいと思います。
    for d in r_ds:
        d_dir = os.path.join(CONF["images"], d)
        ids = os.listdir(d_dir)
        r_seq_id[d] = ids
        for id in ids:
            id_dir = os.path.join(d_dir, id)
            tracks = os.listdir(id_dir)
            r_tracks[d] = {}
            r_tracks[d][id] = tracks
            for track in tracks:
                track_dir = os.path.join(id_dir, track)
                #他にいい方法が思いつきませんでした。
                r_path[d] = {}
                r_path[d][id] = {}
                r_path[d][id][track] = track_dir

    data = {
        "datasources": r_ds,
        "seq_ids": r_seq_id,
        "tracks": r_tracks,
        "path": r_path
        }
    print(data)
    return json.dumps(data)


if __name__ == "__main__":
    app.debug = True
    app.run()
