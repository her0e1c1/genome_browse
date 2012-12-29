# -*- coding: utf-8 -*-
import config
from multiprocessing import Process
import getpass
import os
import argparse

def command(start, stop, passwd):
    d = dict(start=start,
             stop=stop,
             passwd=passwd)
    cmd = "python ./getdata.py " 
    cmd += "-p {0[passwd]} --start {0[start]} --stop {0[stop]}"
    cmd = cmd.format(d)
    print("exec: {0}".format(cmd))

    os.system(cmd)

def main():
    usage = \
"""
使い方
python multiprocess.py -p passwd
各種設定はconfig.pyで行います。
getdata.pyを呼び出して分割処理させます。
"""
    #passwordの設定をします。
    p = argparse.ArgumentParser(usage=usage)
    p.add_argument("-p", dest="passwd")
    args = p.parse_args()
    if args.passwd is None:
        passwd = getpass.getpass("Password:")
    else:
        passwd = args.passwd

    #start, stopを決めます。
    maxl = config.CONF["max_length"]
    process = config.CONF["process"]

    #並列処理を開始します。
    procs  = []
    for st, sp in get(maxl, process):
        p = Process(target=command, args=(st, sp, passwd))
        p.start()
        procs.append(p)

    print("waiting..")
    for p in procs:
        p.join()

def get(m, p):
    """
    max_lengthと processを受け取ります。
    分割した区間を返します。
    """
    #一回で取得する長さ
    l = int(m / p)
    d = digit(l)

    #半端な数にならないように最大桁以外を0にします。
    new = lambda n, d: n - (n % (10 ** (d - 1)))
    l = new(l, d)

    #一回で取得する最後
    stop = lambda start, length: start + length - 1
    #取得するのはpの数だけです。
    starts = range(1, m, l)[: p]

    #startsに揃えます。
    stops = []
    #最後の要素はmにします。
    for st in starts[: -1]:
        sp = stop(st, l)
        #最大長より長いものは最大長にします。
        if sp > m:
            sp = m
        stops.append(sp)
    stops.append(m)

    return zip(starts, stops)


def maxdigit(n):
    """最大の桁の値を返します。"""
    d = digit(n)
    ret = int(n)
    for i in range(d - 1):
        ret /= 10

    return ret

def digit(n):
    """
    桁数を返します。
    """
    if(n < 0):
        n = n * -1

    def iter(m, c):
        if m > 0:
            return iter(int(m/10), c+1)
        else:
            return c
    return iter(n, 0)


if __name__ == "__main__":
    main()
