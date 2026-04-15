#!/usr/bin/env python

import os
from os.path import dirname, abspath
from os.path import join as pjoin
import csv
import json
from urllib.request import urlopen

DB_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat'
ROOT_DIR = dirname(abspath(__file__))
CACHE_DIR = pjoin(ROOT_DIR, 'cache')


def fetch() -> None:
    os.makedirs(CACHE_DIR, exist_ok=True)
    fpath = pjoin(CACHE_DIR, 'airports.dat')
    if os.path.exists(fpath):
        print('found cached airports.dat')
    else:
        print('fetching airports.dat')
        with urlopen(DB_URL) as response:
            body = response.read()
        with open(fpath, 'wb') as fp:
            fp.write(body)


def rewrite() -> None:
    parts = []
    print('rewriting to airports.json')
    with open(pjoin(CACHE_DIR, 'airports.dat'), newline='') as ifp:
        reader = csv.reader(ifp)
        for row in reader:
            obj = {
                'iata': row[4],
                'city': row[2],
                'country': row[3],
                'tz': row[11],
                'icao': row[5],
                'name': row[1],
            }
            if obj['iata'] != '\\N' and obj['icao'] != '\\N' and obj['tz'] != '\\N':
                parts.append(json.dumps(obj, ensure_ascii=False))
    with open('airports.json', 'w') as ofp:
        ofp.write('[\n')
        ofp.write(',\n'.join(parts))
        ofp.write('\n]\n')


def main() -> None:
    fetch()
    rewrite()


if __name__ == '__main__':
    main()
