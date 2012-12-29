# -*- coding: utf-8 -*-

__all__= ["CONF"]

CONF = {
    #アクセスするurlです。
    "host": "http://gbrowse.seselab.org",

    #リクエストをPOSTするパスです。
    #urlはhost + pathになります。
    "path": "/gb2/gbrowse/thaliana",

    #最大長は手動で設定します。
    "max_length":  30 * (10 ** 6),  # 30M
    #"max_length":  1 * (10 ** 4),  # 1M
    "start": 1,

    #保存先
    #save_root/datasource/seq_id/tracks/layer/start.png

    #絶対パス、相対パス(カレントディレクトリ)、~(ホームディレクトリ)の指定が出来ます。
    "save_root": "data",

    #datasourceの名前は任意で構いません。
    #データの取得はpathで決まります。
    "datasource": "thaliana",

    #GBrowseのlandmark or regionで指定するidを記述します。
    "seq_id": "Chr1",

    #画像を取得するトラックを指定します。
    #名前の付け方は、GBrowseのトラック名と同一のもにします。

    "tracks": [
        #"Ahal_200_L1_CoverageXyplot",
        "Ahal_200_L1_Reads",
        ],

    #分割したときの一枚の画像に収まる塩基数です。
    #100の取得には時間がかかるのでリストの最後にします。
    "layer": [
              1000000  # 1M
              #500000,
              #200000,
              #100000,  # 100k
              #50000,
              #20000,
              #10000,  # 10k
              #5000,
              #2000,
              #1000,  # 1k
              #200,
              #100,
              ],  

    #プロセスを分割して、タスクを分担させます。
    "process": 5,

    #変更不可
    #"image_max_width": 8000,
    "each_image_width" : 800,

    #apacheの認証に必要です。
    "user": "ishii",

    #パスワードを直接ファイルに書き込むことは推奨しません。
    #引き数(-p)で指定するか、直接入力します。
    "passwd": None,

    "debug": True,
}
