#!/usr/bin/env python

import os
from os.path import dirname, abspath
from os.path import join as pjoin
import csv
import json
from urllib.request import urlopen

FETCH = {
    'airports': 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat',
    'airlines': 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat',
}
ROOT_DIR = dirname(abspath(__file__))
CACHE_DIR = pjoin(ROOT_DIR, 'cache')


def fetch() -> None:
    os.makedirs(CACHE_DIR, exist_ok=True)
    for k, url in FETCH.items():
        fpath = pjoin(CACHE_DIR, k + '.dat')
        if os.path.exists(fpath):
            print(f'found cached {k}.dat')
        else:
            print(f'fetching {k}.dat')
            with urlopen(url) as response:
                body = response.read()
            with open(fpath, 'wb') as fp:
                fp.write(body)


def rewriteAirports() -> None:
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


def rewriteAirlines() -> None:
    parts = []
    print('rewriting to airlines.json')
    with open(pjoin(CACHE_DIR, 'airlines.dat'), newline='') as ifp:
        reader = csv.reader(ifp)
        for row in reader:
            obj = {
                'name': row[1],
                'iata': row[3],
                'icao': row[4],
                'active': row[7],
            }
            if obj['iata'] != '\\N' and obj['iata'] != '-' and obj['active'] == 'Y':
                del obj['active']
                parts.append(json.dumps(obj))
    with open('airlines.json', 'w') as ofp:
        ofp.write('[\n')
        ofp.write(',\n'.join(parts))
        ofp.write('\n]\n')


def main() -> None:
    fetch()
    rewriteAirports()
    rewriteAirlines()


if __name__ == '__main__':
    main()
