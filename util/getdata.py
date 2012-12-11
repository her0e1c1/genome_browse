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
GBrowseの場合
8000px程度の画像であれば問題なく取得可能です。
(start, stop, width) = (1001, 2000, 8000)
のリクエストをした場合
3倍の情報量
(start, stop, width) = (1, 3000, 24000)
が返ってきます。

これを30等分すれば、
800px辺り、100塩基の画像データが得られます。

以上より

(start, stop, width) = (1001, 2000, 8000)
(start, stop, width) = (4001, 5000, 8000)
(start, stop, width) = (7001, 8000, 8000)
とリクエストしていけば、
(1から約maxまでの画像データを取得できます。)

ただし、画像の両端余白を0にするために細工が必要です。

また、readの場合はデータを取得するのに時間がかかるので
プロセスがkillされるのを防ぎます。

修正箇所
/etc/gbrowse2/thaliana.conf
region segment = 10000 => 1000000000 (1G)

/etc/gbrowse2/GBrowse.conf
#Performance settings
#変な値が入るとエラーでます。
renderfarm = 1
slave_timeout = 45 => 1000
global_timeout = 60 => 1000

#Limits on genomic regions
region segment 200000 => 1G
max segment 5000000 => 1G

追加個所
pad_left = 0
pad_right = 0

/etc/apache2/conf.d/gbrowse2.conf
TimeOut 10000追加


出来た画像
read 1M 8000px

"""

#分割した画像データ
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
        self._debug = True
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
        self._first_login()
        res = self._post_from_to_genome(start, stop)
        self._scale_path = self._get_scale(res)
        res = self._post_to_get_imagepath()
        paths = self._parse_to_get_imagepath(res)

        for (track, path) in paths.items():
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
        dir = self._track_dirs[gd.track]
        name = "{0[track]}_{0[start]}_{0[stop]}_{1}.png"
        name = name.format(gd.__dict__,self._image_max_width)

        file = os.path.join(dir, name)
        f = open(file, "wb")
        f.write(res.content)
        f.close()

        if self._debug: print("save:{0}".format(name))

        #scaleも同時に作成します。
        name = "scale_{0[start]}_{0[stop]}_{1}.png"
        name = name.format(gd.__dict__,self._image_max_width)
        url = urlparse.urljoin(self._host, self._scale_path)
        res = self.get(url=url)

        # file = os.path.join(dir, name)
        # f = open(file, "wb")
        # f.write(res.content)
        # f.close()

        if self._debug: print("save:{0}".format(name))



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

    def _get_scale(self, res):
        soup = BeautifulSoup(res.content)
        src = soup.find("img",{"id":"Detail Scale_image"}).get("src")
        return src

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

    "image_width" : 800,

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
}

def main():

    usage = \
"""
使い方

./getdata.py start stop width
各引数には、数値を指定してください。
"""
    p = argparse.ArgumentParser(usage=usage)
    p.add_argument("start")
    p.add_argument("stop")
    p.add_argument("width")
    p.add_argument("passwd")
    args = p.parse_args()
    CONF["passwd"] = args.passwd
    start = int(args.start)
    stop = int(args.stop)
    width = int(args.width)
    CONF["image_max_width"] = width
    ggd = GetGBrowseData(CONF)

    ggd.get_image(start, stop)

if __name__ == "__main__":
    #計測時間
    start = time.time()
    main()
    stop = time.time()
    fmt = "time {0}".format(stop - start)
    print("-" * 50)
    print(fmt)
