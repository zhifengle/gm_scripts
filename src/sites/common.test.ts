import { SearchSubject } from '../interface/subject';
import { filterResults, fuseFilterSubjects } from './common';
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
        dateFirst: true,
        threshold: 0.3,
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
        keys: ['name'],
      })
    ).toEqual(rawList[1]);
  });
  test('test fuse search with 0.1 threshold', () => {
    const opts = {
      threshold: 0.1,
      keys: ['name'],
    };
    var rawList: SearchSubject[] = [
      {
        name: 'イケメン戦国◆時をかける恋 -新たなる出逢い- for Nintendo Switch(NS)',
        url: 'game.php?game=32039#ad',
        count: '1',
        score: '90',
        releaseDate: '2022-04-28',
      },
      {
        name: 'イケメン戦国◆時をかける恋 -新たなる出逢い-(PSV)',
        url: 'game.php?game=25305#ad',
        count: '',
        score: '',
        releaseDate: '2018-03-22',
      },
    ];
    var info: SearchSubject = {
      name: 'イケメン戦国 時をかける恋',
      rawName: 'イケメン戦国◆時をかける恋',
      score: '7.12',
      count: '126',
      url: 'https://vndb.org/v18641',
      releaseDate: '2015-06-22',
    };
    expect(fuseFilterSubjects(rawList, info, opts)).toEqual([...rawList].reverse());
    rawList = [
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
    info = {
      name: '14',
      rawName: '14 -one & four or the other meaning-',
      score: '7.00',
      count: '1',
      url: 'https://vndb.org/v20719',
      releaseDate: '2000-11-12',
    };
    expect(fuseFilterSubjects(rawList, info, opts)).toEqual(rawList.slice(5, 6));
  });
  test('test fuse filter', () => {
    var rawList: SearchSubject[] = [
      {
        name: '月影の鎖 -狂爛モラトリアム-(PSV)',
        url: 'game.php?game=25429#ad',
        count: '5',
        score: '75',
        releaseDate: '2016-12-21',
      },
      {
        name: '月影の鎖 -錯乱パラノイア-(PSP)',
        url: 'game.php?game=20450#ad',
        count: '5',
        score: '80',
        releaseDate: '2013-04-18',
      },
      {
        name: '月影の鎖 ～錯乱パラノイア～(PSV)',
        url: 'game.php?game=22790#ad',
        count: '4',
        score: '80',
        releaseDate: '2015-12-23',
      },
    ];
    var info = {
      name: '月影の鎖～紅に染まる番外編～',
      rawName: '月影の鎖～紅に染まる番外編～',
      score: '0',
      count: '0',
      url: 'https://vndb.org/v21704',
      releaseDate: '2016-12-29',
    };
    expect(fuseFilterSubjects(rawList, info, { keys: ['name'] })).toEqual([]);
    rawList = [
      {
        name: '月影の鎖 -錯乱パラノイア-',
        rawName: '月影の鎖 -錯乱パラノイア-',
        url: 'https://vndb.org/v11469',
        count: '34',
        releaseDate: '2013-04-18',
        score: '7.57',
      },
      {
        name: '月影の鎖 ―狂爛モラトリアム―',
        rawName: '月影の鎖 ―狂爛モラトリアム―',
        url: 'https://vndb.org/v12928',
        count: '15',
        releaseDate: '2013-12-19',
        score: '7.46',
      },
      {
        name: '月影の鎖～紅に染まる番外編～',
        rawName: '月影の鎖～紅に染まる番外編～',
        url: 'https://vndb.org/v21704',
        count: '0',
        releaseDate: '2016-12-29',
      },
    ];
    info = {
      name: '月影の鎖 -狂爛モラトリアム-',
      rawName: '月影の鎖 -狂爛モラトリアム-',
      score: '76',
      count: '5',
      url: 'https://erogamescape.org/~ap2/ero/toukei_kaiseki/game.php?game=25429#ad',
      releaseDate: '2016-12-21',
    };
    expect(fuseFilterSubjects(rawList, info, { keys: ['name'], threshold: 0.3 })).toEqual(rawList.slice(1, 2));
  });
});
