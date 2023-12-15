import { filterResults } from './common';
import Fuse from 'fuse.js';

Object.defineProperty(globalThis, 'Fuse', {
  writable: false,
  value: Fuse,
});

describe('test filterResults', () => {
  test('test by same month', () => {
    const rawList = [
      {
        name: '2月14日の午後',
        url: 'game.php?game=14835#ad',
        count: '2',
        score: '65',
        releaseDate: '2010-12-18',
      },
      {
        name: '麻雀 2014',
        url: 'game.php?game=19992#ad',
        count: '14',
        score: '60',
        releaseDate: '2014-01-31',
      },
      {
        name: 'LAST CHILD ～14th Nervous Breakdown～',
        url: 'game.php?game=822#ad',
        count: '21',
        score: '60',
        releaseDate: '1998-07-17',
      },
      {
        name: 'RUSH ～危険な香り CRISIS:2014～',
        url: 'game.php?game=3564#ad',
        count: '',
        score: '',
        releaseDate: '2000-08-04',
      },
      {
        name: 'LoveSongs♪ADV 双葉理保 14歳 ～夏～(PS2)',
        url: 'game.php?game=6062#ad',
        count: '1',
        score: '60',
        releaseDate: '2004-09-30',
      },
      {
        name: '14 -one & four or the other meaning-',
        url: 'game.php?game=1583#ad',
        count: '12',
        score: '83',
        releaseDate: '2000-11-24',
      },
    ];
    var info = {
      name: '14',
      rawName: '14 -one & four or the other meaning-',
      score: '7.00',
      count: '1',
      url: 'https://vndb.org/v20719',
      releaseDate: '2000-11-12',
      queryNames: ['14', '14 one&four（ワン&フォー）'],
    };
    expect(
      filterResults(rawList, info, {
        releaseDate: true,
        keys: ['name'],
      })
    ).toEqual(rawList[5]);
  });
  test('test same release date', () => {
    var rawList = [
      {
        name: 'BALDR SKY ZERO 2',
        url: '/subject/88700',
        greyName: '',
        releaseDate: '2014-03-28',
        score: '7.2',
        count: '58',
      },
      {
        name: 'BALDR SKY ZERO',
        url: '/subject/44782',
        greyName: '',
        releaseDate: '2013-09-27',
        score: '6.7',
        count: '112',
      },
      {
        name: 'BALDR SKY ZERO EXTREME',
        url: '/subject/254771',
        greyName: '',
        releaseDate: '2013-12-29',
        score: '0',
        count: '少于10',
      },
    ];
    var info = {
      name: 'バルドスカイ ゼロ',
      rawName: 'バルドスカイ ゼロ',
      score: '7.32',
      count: '119',
      url: 'https://vndb.org/v10833',
      releaseDate: '2013-09-27',
    };
    expect(
      filterResults(rawList, info, {
        releaseDate: true,
        keys: ['name'],
      })
    ).toEqual(rawList[1]);
  });
  test('test fuse search', () => {
    var rawList = [
      {
        name: 'イケメン戦国◆時をかける恋 -新たなる出逢い-(PSV)',
        url: 'game.php?game=25305#ad',
        count: '',
        score: '',
        releaseDate: '2018-03-22',
      },
      {
        name: 'イケメン戦国◆時をかける恋 -新たなる出逢い- for Nintendo Switch(NS)',
        url: 'game.php?game=32039#ad',
        count: '1',
        score: '90',
        releaseDate: '2022-04-28',
      },
    ];
    var info = {
      name: 'イケメン戦国 時をかける恋',
      rawName: 'イケメン戦国◆時をかける恋',
      score: '7.12',
      count: '126',
      url: 'https://vndb.org/v18641',
      releaseDate: '2015-06-22',
    };
    expect(filterResults(rawList, info, { keys: ['name'] })).toEqual(rawList[0]);
  });
});
