#!/usr/bin/python
# -*- coding: utf-8 -*-

"""
requestsにはバグが混在しています。
v0.14.2を使用します。
"""

import os
import sys
import urlparse
import time
import getpass
import argparse
import ConfigParser
import requests
from BeautifulSoup import BeautifulSoup
import config  # 設定ファイルを読み込みます。


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
        if conf["passwd"] is None:
            conf["passwd"] = getpass.getpass("Password:")
        self._passwd =conf["passwd"]
        self._auth = requests.auth.HTTPDigestAuth(self._user, self._passwd)
        self._cookies = None
        self._max_length = conf["max_length"]
        self._save_root = conf["save_root"]
        self._datasource = conf["datasource"]
        self._seq_id = conf["seq_id"]
        self._tracks = conf["tracks"]
        self._image_max_width = conf["image_max_width"]
        self._each_image_width = conf["each_image_width"]

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
        return requests.post(url, p, auth=self._auth, cookies=self._cookies)

    def get_rate(self):
        return self._image_max_width / self._each_image_width

    #ここから呼び出します。
    def get_image(self, start, stop, count=3):
        res = self._post_from_to_genome(start, stop)
        res = self._post_to_get_imagepath()
        paths = self._parse_to_get_imagepath(res)

        for (track, path) in paths.items():
            #他の画像が得られた場合はやり直します。
            #ただし3回までです。
            if path.find("grey.png") != -1 and count > 0:
                self.get_image(start, stop, count-1)
            else:
                self._save_image(GraphicData(track, path, start, stop))

    #serverへpostする関数
    def _post_from_to_genome(self, start, stop):
        """
        どこからどこまでの塩基配列を受け取るのかを決めます。

        以下のような文字列を生成させてserverにpostします。
        Chr1:10,000..20,000
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
            "plugin_find" : 0,
            "Search": "Search"
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
        rate = self.get_rate()
        layer = gd.stop - gd.start + 1
        start = gd.__dict__["start"] - layer
        layer = layer / rate
        dir = self._track_dirs[gd.track]

        #分割前のファイルを残しておきます。
        name = "_{0}.png"
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
        self._split_image(file, rate * 3, layer)

    def _split_image(self, filename, number, layer):
        """
        受け取る画像のパスは、_1.png, _401.pngを期待します。
        使われている数値がstartになります。
        参照できるように_をつけています。
        """

        base = os.path.basename(filename)
        dir = os.path.dirname(filename)
        start, ext = os.path.splitext(base)
        start = int(start[1:])

        for i in range(number):
            cmd = "convert -crop {width}x0+{offset_x}+0 {input} {output}"
            offset_x = self._each_image_width * i
            #import ipdb;ipdb.set_trace()
            output = "{start}{ext}".format(
                start=(start + layer * i),
                ext=ext,
                )
            output = os.path.join(dir, output)
            cmd = cmd.format(
                width=self._each_image_width,
                offset_x=offset_x,
                input=filename,
                output=output
                )

            if self._debug: print(cmd)
            os.system(cmd)


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
            "navigate" : "left 0",
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


    def first_login(self):
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


def make_rootpath(root):
    #保存先のrootディレクトリ名です。
    CONF["save_root"] = os.path.expanduser(CONF["save_root"])
    dir = os.path.join(os.getcwd(), CONF["save_root"])
    if not os.path.isdir(dir):
        os.mkdir(dir)

#GetGBroseDataのクラスを代入します。

def get_data(start, stop, layer, ggd):
    """
    1からmax_lengthまでの画像を取得します。
    GBrowseの関係上
    layerの3倍の範囲を取り出します。

    layer=100の場合
    (101,200), (401, 500), ..., (x, x + 299)
    stopを含んだ所まで実行します。
    ただし、 x < stop < x + 300

    """

    #実際のリクエストのstartは101等になります。
    if start <= layer:
        start = layer + 1

    rate = ggd.get_rate()
    #import ipdb; ipdb.set_trace()
    #1から取り出せるように調節します。
    start = start - (start % layer)

    start = start * rate + 1
    for st in range(start , stop, layer * rate * 3):
        #2塩基ずれることは仕方ないものとします。
        ggd.get_image(st, st + layer * rate - 1)


def get_width(layer):
    """
    layerに対する一枚当りの画像の大きさを指定します。
    """
    width = config.CONF["image_max_width"]
    if(layer <= 10 ** 3):
        return width
    else:
        return width / 10


def start(conf):
    for layer in conf["layer"]:
        w = get_width(layer)
        conf["image_max_width"] = w
        ggd = GetGBrowseData(conf)
        ggd.first_login()
        get_data(conf["start"], conf["max_length"], layer, ggd)


def main():
    usage = \
"""
使い方
./getdata.py -p passwd
各種設定はconfig.pyで行います。
"""
    p = argparse.ArgumentParser(usage=usage)
    p.add_argument("-p", dist="passwd")
    args = p.parse_args()

    #パスワードを入力します。
    passwd = None
    if args.passwd is None:
        if config.CONF["passwd"] is None:
            pass
        else:
            passwd = config.CONF["passwd"]
    else:
        passwd = args.passwd
    
    config.CONF["passwd"] = passwd
    sys.exit()
    #設定完了
    start(config.CONF)


if __name__ == "__main__":
    #計測時間
    start = time.time()
    main()
    stop = time.time()
    fmt = "time {0}".format(stop - start)
    print("-" * 50)
    print(fmt)
