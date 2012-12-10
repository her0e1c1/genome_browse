#!/usr/bin/python
# -*- coding: utf-8 -*-
import os
import sys
import time
import getpass
import argparse
import requests
from BeautifulSoup import BeautifulSoup


#分割した画像データ
class GraphicData:

    def __init__(self,track, path, start, end):
        self.track = track
        self.path = path
        self.start = start
        self.end = end
        self.size = end - start
    def __str__(self):
        return str(self.__dict__)

class GetGraphicData:
    """
    スクレイピングのスクリプト
    """
    def __init__(self):
        #通信設定
        self._protocol = "http://"
        self._host = "gbrowse.seselab.org"
        self._user = getpass.getpass("user:")
        self._passwd = getpass.getpass()
        self._cookies = None
        self._auth = requests.auth.HTTPDigestAuth(self._user, self._passwd)
        self._path = {"thaliana":"/gb2/gbrowse/thaliana/"}
        #一枚の画像サイズ
        self._width = 1000

        #gbrowseにポストするデータ群
        self._add_tracks = [
            "Ahal_200_L1_CoverageXyplot",
            "Ahal_200_L1_Reads"
            ]
        self._name = [
            "Chr1"
            ]


        #ゲノム配列を取得する長さ 300K
        self._span = 300 * (10 ** 3)
        #実際のゲノムサイズ 30M
        self._max_size = 30 *  (10 ** 6)
        #ゲノムの取得開始位置
        self._start = 1
        #ゲノムの取得終止位置
        self._end = self._max_size

        #取得したデータを保存するルートディレクトリを決める
        dir = os.getcwd() + "/sample/"
        self._directory_to_save = dir
        if not os.path.isdir(dir):
            os.mkdir(dir)

        for track in self._add_tracks:
            dir = self._directory_to_save + track + "/"
            if not os.path.isdir(dir):
                os.mkdir(dir)

    #requests.get/postのラッパー
    def get(self, uri=None):
        return requests.get(uri, auth=self._auth, cookies=self._cookies)

    def post(self, uri=None, p=None):
        return requests.post(uri,p, auth=self._auth, cookies=self._cookies)


    #この関数だけを呼び出すだけで全てのサンプル取得できるようにする
    def get_sample_data(self):
        """
        配列の始めと終わりと長さを受け取って画像作成する
        """
        self._first_login()
        start = self._start
        end = self._end
        gd_list = self._post_from_to_genome(start, end)
        for gd in gd_list:
            self._save_image(gd)


    def _save_image(self, gd):
        if not isinstance(gd,GraphicData):
            print("error: can't save this GraphicData", gd)
            sys.exit()

        uri = self._protocol + self._host + gd.path
        res = self.get(uri=uri)

        dir = self._directory_to_save + gd.track + "/"
        name = "{0[track]}_{0[start]}_{0[end]}_{1}.png".format(gd.__dict__,self._width)

        f = open(dir + name, "wb")
        f.write(res.content)
        f.close()
        print("save:{0}".format(name))


    def _first_login(self):
        """
        ログイン出来るか調べる
        また、一回目のアクセスでsession用のクッキーを取り出す
        また設定を行うので、その関数も呼び出す
        全て上手く言った場合のみ、Trueを返す
        """
        uri = self.get_uri()
        res = requests.get(uri, auth=self._auth)
        if res.status_code != 200:
            print("login error")
            sys.exit()
        elif res.cookies == "" or res.cookies == None:
            print("error : no session cookies")
            sys.exit()
        self._cookies = res.cookies

        #初めに初期設定を行う
        self._config_after_login()

        return True

    #serverへpostする関数群
    def _post_from_to_genome(self, start, end):
        """
        どこからどこまでのゲノム情報を受け取るのかを決める
        ローカル変数nameがその情報を持つ
        ch1:10,000..20,000
        """
        name = "{name}:{start}..{end}".format(
            name=self.get_name(),
            start=start,
            end=end
            )

        #firbugでpostされていたデータを含んでいる
        post = {
            "name" : name,
            "force_submit" : 0,
            "plugin_find" : 0
            }
        uri = self.get_uri()
        res = self.post(p=post)

        paths = self._post_data_to_get_imagepath()
        gd_list = []
        for (track, path) in paths.items():
           gd_list.append(GraphicData(track, path, start, end))

        return gd_list

    def _post_data_to_get_imagepath(self):
        """
        画像のパスを受け取る為に、データをポストする
        このポストする値は、firebugでネットワークを監視した値と同じもの
        画像のパスはハッシュ化されているので、簡単にダウンロードできない
        ３回ポストするが、１回目のポストでkeyを受け取り、
        ３回目のポストで、そのkeyもポストしないといけない
        最後の３回目でようやく画像のパスが手に入る

        引数：なし
        戻り値：うけとったパスの辞書
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

        post = {
            "action" : "update_sections",
            "section_names" : ["page_title","span","galaxy_form","search_form_objects"]
            }
        res = self.post(p=post)

        post = {
            "action" : "retrieve_multiple",
            "track_ids" : ["Gene","Ahal_200_L1_CoverageXyplot","Ahal_200_L1_Reads","AthalCDS"]
            }
        post.update(tk_track_keys)
        res = self.post(p=post)

        paths = {}
        html = res.json["track_html"]
        for track in html.keys():
            if track in self._add_tracks:
                soup = BeautifulSoup(html[track])
                try:
                    paths[track] = soup.find("img",{"id":track + "_image"}).get("src")
                except:
                    pass
        print("get uri:", paths)

        return paths


    def _config_after_login(self):
        """
        * 画像サイズ指定
        * どのトラックを受け取るのか決める
        一度postしたらsessionで状態保持される
        なので、この関数は一度だけ呼び出せば良い
        """
        uri = self.get_uri()

        #画像サイズ決定
        post = {
            "action": "set_display_option",
            "width": self._width,
            }
        self.post(p=post)

        for track in self.get_add_tracks():
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
            res = self.post(p= post)

            post = {
                "action" : "set_track_visibility",
                "visible" : 1,
                "track_name" : track
                }
            self.post(p=post)

        return True


class GetGBrowseData:

    def __init__(self, **conf):
        """
        辞書データを受け取って初期化します。
        """

        self._url = conf["url"]
        self._user = conf["user"]
        self._passwd =conf["passwd"]
        self._auth = requests.auth.HTTPDigestAuth(self._user, self._passwd)
        self._seq_id = conf["seq_id"]
        self._cookies = None

    #requests.get/postのラッパー
    def get(self, url=None):
        if url is None:
            url = self._url()
        return requests.get(url, auth=self._auth, cookies=self._cookies)


    def post(self, url=None, p=None):
        if url is None:
            url = self._url()
        return requests.post(url,p, auth=self._auth, cookies=self._cookies)


    #serverへpostする関数
    def _post_from_to_genome(self, start, end):
        """
        どこからどこまでの塩基配列を受け取るのかを決めます。

        以下のような文字列を生成させてserverにpostします。
        ch1:10,000..20,000
        """
        name = "{id}:{start}..{end}".format(
            id=self._seq_id,
            start=start,
            end=end)

        #firbugでpostされていたデータを含んでいる
        post = {
            "name" : name,
            "force_submit" : 0,
            "plugin_find" : 0
            }
        res = self.post(p=post)

        return res
        # paths = self._post_data_to_get_imagepath()
        # gd_list = []
        # for (track, path) in paths.items():
        #    gd_list.append(GraphicData(track, path, start, end))

        # return gd_list


    def _post_data_to_get_imagepath(self):
        """
        画像のパスを受け取る為に、データをポストする
        このポストする値は、firebugでネットワークを監視した値と同じもの
        画像のパスはハッシュ化されているので、簡単にダウンロードできない
        ３回ポストするが、１回目のポストでkeyを受け取り、
        ３回目のポストで、そのkeyもポストしないといけない
        最後の３回目でようやく画像のパスが手に入る

        引数：なし
        戻り値：うけとったパスの辞書
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

        post = {
            "action" : "update_sections",
            "section_names" : ["page_title","span","galaxy_form","search_form_objects"]
            }
        res = self.post(p=post)

        post = {
            "action" : "retrieve_multiple",
            "track_ids" : ["Gene","Ahal_200_L1_CoverageXyplot","Ahal_200_L1_Reads","AthalCDS"]
            }
        post.update(tk_track_keys)
        res = self.post(p=post)

        paths = {}
        html = res.json["track_html"]
        for track in html.keys():
            if track in self._add_tracks:
                soup = BeautifulSoup(html[track])
                try:
                    paths[track] = soup.find("img",{"id":track + "_image"}).get("src")
                except:
                    pass
        print("get uri:", paths)

        return paths


    def _first_login(self):
        """
        ログイン出来るか調べます。
        また、一回目のアクセスでsession用のクッキーを取り出します。
        """

        res = requests.get()
        if res.status_code != 200:
            print("login error")
            sys.exit()
        elif res.cookies == "" or res.cookies == None:
            print("error : no session cookies")
            sys.exit()

        print("login success!")
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

        #画像サイズ決定
        post = {
            "action": "set_display_option",
            "width": self._width,
            }
        self.post(p=post)

        #トラックの指定
        for track in self._add_tracks():
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
            res = self.post(p= post)

            post = {
                "action" : "set_track_visibility",
                "visible" : 1,
                "track_name" : track
                }
            self.post(p=post)



"""
予めデータを取得するための設定事項を書きます。
分割するのに必要なデータとは分けて書きます。
"""

#取得したデータを保存するルートディレクトリを決める
dir = os.path.join(os.getcwd(), "data")
if not os.path.isdir(dir):
    os.mkdir(dir)

tracks = ["Ahal_200_L1_CoverageXyplot",
          "Ahal_200_L1_Reads"]
CONF = {
    "host": "http://gbrowse.seselab.org",
    "path": "/gb2/gbrowse/thaliana",
    "max_length":  300 * (10 ** 6),  # 30M
    "max_width": 10 * (10 ** 3),  # 10k
    "passwd": getpass.getpass("Password:"),
    "user": getpass.getpass("User:"),
    "seq_id": "Chr1",
    "width": 800,  # 一枚の画像サイズ
    "save_dir": dir,
    "tracks": tracks,
}

def main():

    p = argparse.ArgumentParser()
    p.add_argument("start")
    p.add_argument("stop")
    p.add_argument("width")
    args = p.parse_args()
    1/0

if __name__ == "__main__":
    #計測時間
    start = time.time()
    main()
    stop = time.time()
    fmt = "time {0}".format(stop - start)
    print("-" * 50)
    print(fmt)
