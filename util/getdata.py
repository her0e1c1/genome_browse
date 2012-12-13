#!/usr/bin/python
# -*- coding: utf-8 -*-
import os
import sys
import urlparse
import time
import getpass
import argparse
import requests
from BeautifulSoup import BeautifulSoup


"""
GBrowseの設定ファイルの修正箇所

()の値は修正前です。
わかりやすく単位をつけて書いています。

/etc/gbrowse2/thaliana.conf
region segment = 1G(10000)

/etc/gbrowse2/GBrowse.conf
slave_timeout = 1000(45)
global_timeout = 1000(60)

pad_left = 0(50)
pad_right = 0(50)

region segment  1G(200000)
max segment 1G(5000000)

/etc/apache2/conf.d/gbrowse2.conf
TimeOut 10000(追加)

CachedTrack.pm
DEFAULT_REQUEST_TIME => 60*60(60);


fist loginで失敗した場合はメモリのエラーの可能性があります。
"""

class GraphicData:

    def __init__(self,track, path, start, stop):
        self.track = track
        self.path = path
        self.start = start
        self.stop = stop
        self.size = stop - start
    def __str__(self):
        return str(self.__dict__)


class GetGBrowseData:

    def __init__(self, conf):
        """
        辞書データを受け取って初期化します。
        """
        self._debug = conf["debug"]
        url = urlparse.urljoin(conf["host"], conf["path"])
        self._url = url
        self._host = conf["host"]
        self._user = conf["user"]
        self._passwd =conf["passwd"]
        self._auth = requests.auth.HTTPDigestAuth(self._user, self._passwd)
        self._cookies = None
        self._max_length = conf["max_length"]
        self._save_root = conf["save_root"]
        self._datasource = conf["datasource"]
        self._seq_id = conf["seq_id"]
        self._tracks = conf["tracks"]
        self._image_max_width = conf["image_max_width"]
        self._eacc_image_width = conf["each_image_width"]

        #datasourceのディレクトリ
        dir = os.path.join(self._save_root, self._datasource)
        self._datasource_dir = dir

        #seq_idのディレクトリを作成します。
        dir = os.path.join(self._datasource_dir, self._seq_id)
        self._seq_id_dir = dir
        if not os.path.isdir(dir):
            os.makedirs(dir)

        #各trackのディレクトリを作成します。
        self._track_dirs = {}
        for track in self._tracks:
            dir = os.path.join(self._seq_id_dir, track)
            self._track_dirs[track] = dir
            if not os.path.isdir(dir):
                os.mkdir(dir)

        #ログインは完了させておきます。
        #self._first_login()

    #requests.get/postのラッパー
    def get(self, url=None):
        if url is None:
            url = self._url
        if self._debug: print("get: " + url)
        return requests.get(url, auth=self._auth, cookies=self._cookies)


    def post(self, url=None, p=None):
        if url is None:
            url = self._url
        if self._debug: print(url,  p)
        return requests.post(url,p, auth=self._auth, cookies=self._cookies)


    #ここから呼び出します。
    def get_image(self, start, stop):
        #first loginはinitで呼ぶと通信が上手くいきません。
        res = self._post_from_to_genome(start, stop)
        res = self._post_to_get_imagepath()
        paths = self._parse_to_get_imagepath(res)

        for (track, path) in paths.items():
            #他の画像が得られた場合はやり直します。
            if path.find("grey.png") != -1:
                self.get_image(start, stop)

            self._save_image(GraphicData(track, path, start, stop))


    #serverへpostする関数
    def _post_from_to_genome(self, start, stop):
        """
        どこからどこまでの塩基配列を受け取るのかを決めます。

        以下のような文字列を生成させてserverにpostします。
        ch1:10,000..20,000
        """
        name = "{seq_id}:{start}..{stop}".format(
            seq_id=self._seq_id,
            start=start,
            stop=stop)

        if self._debug: print(name)

        #firbugでpostされていたデータを含んでいます。
        post = {
            "name" : name,
            "force_submit" : 0,
            "plugin_find" : 0
            }
        res = self.post(p=post)

        return res


    def _save_image(self, gd):
        """
        GraphicDataクラスを受け取り画像を保存します。
        """
        if not isinstance(gd,GraphicData):
            print("error: can't save this GraphicData", gd)
            sys.exit()

        #サーバーにアクセスして画像データをgetします。
        url = urlparse.urljoin(self._host, gd.path)
        res = self.get(url=url)

        #データの保存をします。
        rate = self._image_max_width / self._eacc_image_width 
        layer = gd.stop - gd.start + 1
        start = gd.__dict__["start"] - layer
        layer = layer / rate
        dir = self._track_dirs[gd.track]

        name = "{0}.png"
        name = name.format(start)

        #layerのディレクトリを作成します。
        dir = os.path.join(dir, str(layer))
        if not os.path.isdir(dir):
            os.mkdir(dir)

        file = os.path.join(dir, name)
        f = open(file, "wb")
        f.write(res.content)
        f.close()

        if self._debug: print("save:{0}".format(name))

        #さらにrate * 3で分割します。


    def _post_to_get_imagepath(self):
        """
        画像のパスを受け取る為に、データをポストします。
        画像のパスはハッシュ化されているので簡単にはダウンロードできません。
        合計3回postします。
        (1)各trackのkeyを発行
        (2)
        (3)受け取ったkeyを合わせてpost

        最後の３回目で画像のパスを含んだhtmlを受け取ります。
        戻り値: 3回目のresponse
        """

        post = {
            "action" : "navigate",
            "navigate" : "left%200",
            "view_start" :"NaN",
            "view_stop":"NaN:",
            "snapshot" : "false",
            }
        res = self.post(p=post)
        track_keys = res.json["track_keys"]
        tk_track_keys = {}
        for x,y in track_keys.items():
            tk_track_keys["tk_" + x] = y

        names =  ["page_title","span","galaxy_form","search_form_objects"]
        post = {
            "action" : "update_sections",
            "section_names" : names
            }
        res = self.post(p=post)

        post = {
            "action" : "retrieve_multiple",
            "track_ids" : self._tracks
            }
        post.update(tk_track_keys)
        res = self.post(p=post)

        return res


    def _parse_to_get_imagepath(self, res):
        """
        画像パスを含んだhtmlの解析をします。
        """
        paths = {}
        html = res.json["track_html"]

        for track in html.keys():
            if track in self._tracks:
                soup = BeautifulSoup(html[track])
                try:
                    paths[track] = soup.find("img",{"id":track + "_image"}).get("src")
                except:
                    pass

        print("get url:", paths)
        return paths


    def _first_login(self):
        """
        ログイン出来るか調べます。
        また、一回目のアクセスでsession用のクッキーを取り出します。
        """

        res = self.get()
        if res.status_code != 200:
            print("login error")
            sys.exit()
        elif res.cookies == "" or res.cookies == None:
            print("error : no session cookies")
            sys.exit()

        if self._debug: print("login success!")

        self._cookies = res.cookies
        #初期設定します。
        self._config_after_login()


    def _config_after_login(self):
        """
        ここで行うことは以下の通りです。
        (1)画像サイズの指定
        (2)トラックの指定

        トラックの指定は少し面倒ですが、
        firebugを真似して書いています。
        """

        #画像サイズを決めます。
        post = {
            "action": "set_display_option",
            "width": self._image_max_width,
            }
        self.post(p=post)

        #トラックの指定をします。
        for track in self._tracks:
            if self._debug: print("add track({0})".format(track))
            post = {
                "action" : "add_tracks",
                "track_names" : track
                }

            res = self.post(p=post)
            key = res.json["track_data"][track]["track_key"]

            post = {
                "action" : "retrieve_multiple",
                "track_ids": track,
                "tk_" + track: key
                }
            res = self.post(p=post)

            post = {
                "action" : "set_track_visibility",
                "visible" : 1,
                "track_name" : track
                }
            self.post(p=post)

        if self._debug: print("config success!")


"""
予めデータを取得するための設定事項を書きます。
分割するのに必要なデータとは分けて書きます。

保存パスの命名は
database/seq_id/track
とします。
"""

#保存先のrootディレクトリ名です。
dir = os.path.join(os.getcwd(), "data")
if not os.path.isdir(dir):
    os.mkdir(dir)

tracks = [
#"Ahal_200_L1_CoverageXyplot"
          "Ahal_200_L1_Reads"
]
CONF = {

    #アクセスするurlです。
    "host": "http://gbrowse.seselab.org",
    "path": "/gb2/gbrowse/thaliana",
    "max_length":  300 * (10 ** 6),  # 30M

    # 一枚の画像サイズは極力大きくします。
    #"image_max_width": 10 * (10 ** 3),  # 10k
    "image_max_width": 800,  # 10k

    "each_image_width" : 800,

    #apacheの認証に必要です。
    "user": "ishii",
#    "passwd": getpass.getpass("Password:"),
#    "user": getpass.getpass("User:"),

    #保存先
    #save_root/datasource/seq_id/tracks/layer/start.png
    "save_root": dir,
    "datasource": "thaliana",
    "seq_id": "Chr1",
    "tracks": tracks,
    #分割したときの一枚の画像に収まる塩基数
    "layer": 100,
    "start": 1,
    "debug": True,
}

#GetGBroseDataのクラスを代入します。
GGD = None

def get_layer(start, stop, layer):
    """
    1からmax_lengthまでの画像を取得します。
    GBrowseの関係上
    layerの3倍の範囲を取り出します。

    layer=100の場合
    (101,200), (301, 400), ..., (x, x + 299)
    stopを含んだ所まで実行します。
    ただし、 x < stop < x + 300

    """

    global GGD

    #実際のリクエストのstartは101等になります。
    if start <= layer:
        start = layer + 1

    rate = 1

    #1から取り出せるように調節します。
    start = start - (start % layer) + 1
    for st in range(start, stop, layer * rate * 3):
        GGD.get_image(st, st + layer - 1)


def main():

    global GGD

    usage = \
"""
使い方

./getdata.py start stop width
各引数には、数値を指定してください。
"""
    p = argparse.ArgumentParser(usage=usage)
    p.add_argument("start")
    p.add_argument("stop")
    p.add_argument("passwd")
    args = p.parse_args()
    CONF["passwd"] = args.passwd
    start = int(args.start)
    stop = int(args.stop)

    #CONF["image_max_width"] = width

    ggd = GetGBrowseData(CONF)
    ggd._first_login()
    GGD = ggd

if __name__ == "__main__":
    #計測時間
    start = time.time()
    main()
    stop = time.time()
    fmt = "time {0}".format(stop - start)
    print("-" * 50)
    print(fmt)
